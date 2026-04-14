use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Cursor, Read};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::{Mutex, OnceLock};
use std::time::Instant;

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use tar::Archive as TarArchive;
use tauri::{AppHandle, Manager};
use xz2::read::XzDecoder;
use zip::ZipArchive;

const TYPST_VERSION: &str = "0.14.0";
const TYPST_REPO_BASE: &str = "https://github.com/typst/typst/releases/download";

static DOWNLOAD_MUTEX: OnceLock<Mutex<()>> = OnceLock::new();

#[derive(Serialize)]
pub struct CompileResult {
    pub pdf_base64: String,
    pub duration_ms: u64,
}

/// A single position marker on a PDF page, returned by `query_source_map`.
/// `off` is the character offset within the source block (0 = block start,
/// >0 = the position of a specific word inside the block).
#[derive(Serialize)]
pub struct SourceMapEntry {
    pub id: String,
    pub off: u32,
    pub page: u32,
    pub x: f64,
    pub y: f64,
}

/// Raw JSON structures from `typst query ... "metadata"` output.
#[derive(Deserialize)]
struct QueryMetadataItem {
    value: QueryMetadataValue,
}

#[derive(Deserialize)]
struct QueryMetadataValue {
    id: String,
    off: u32,
    pos: QueryPosition,
}

#[derive(Deserialize)]
struct QueryPosition {
    page: u32,
    x: String,
    y: String,
}

fn parse_pt(s: &str) -> f64 {
    s.trim_end_matches("pt").parse::<f64>().unwrap_or(0.0)
}

enum ArchiveKind {
    Zip,
    TarXz,
}

fn typst_binary_name() -> &'static str {
    if cfg!(windows) {
        "typst.exe"
    } else {
        "typst"
    }
}

fn current_target() -> Result<(&'static str, ArchiveKind), String> {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("windows", "x86_64") => Ok(("x86_64-pc-windows-msvc", ArchiveKind::Zip)),
        ("linux", "x86_64") => Ok(("x86_64-unknown-linux-musl", ArchiveKind::TarXz)),
        ("linux", "aarch64") => Ok(("aarch64-unknown-linux-musl", ArchiveKind::TarXz)),
        ("macos", "x86_64") => Ok(("x86_64-apple-darwin", ArchiveKind::TarXz)),
        ("macos", "aarch64") => Ok(("aarch64-apple-darwin", ArchiveKind::TarXz)),
        (os, arch) => Err(format!("Unsupported Typst platform: {os}/{arch}")),
    }
}

fn cached_binary_path(app: &AppHandle) -> Result<PathBuf, String> {
    let (target, _) = current_target()?;
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?
        .join("typst")
        .join(TYPST_VERSION)
        .join(target);
    Ok(dir.join(typst_binary_name()))
}

fn bundled_binary_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    let bin = typst_binary_name();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            candidates.push(exe_dir.join("resources").join(bin));
            candidates.push(exe_dir.join(bin));

            let dev_path = exe_dir.join("../../resources").join(bin);
            if let Ok(canonical) = dev_path.canonicalize() {
                candidates.push(canonical);
            }
        }
    }

    candidates
}

fn path_binary_candidate() -> Option<PathBuf> {
    let bin = typst_binary_name();
    let which_cmd = if cfg!(windows) { "where" } else { "which" };
    let mut cmd = std::process::Command::new(which_cmd);
    cmd.arg(bin);

    // On Windows, prevent the "where" command from flashing a CMD window
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output = cmd.output().ok()?;
    if !output.status.success() {
        return None;
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(PathBuf::from)
}

fn existing_binary_path(app: Option<&AppHandle>) -> Option<PathBuf> {
    if let Some(app) = app {
        if let Ok(path) = cached_binary_path(app) {
            if path.exists() {
                return Some(path);
            }
        }
    }

    for candidate in bundled_binary_candidates() {
        if candidate.exists() {
            return Some(candidate);
        }
    }

    path_binary_candidate()
}

fn download_url() -> Result<String, String> {
    let (target, archive_kind) = current_target()?;
    let ext = match archive_kind {
        ArchiveKind::Zip => "zip",
        ArchiveKind::TarXz => "tar.xz",
    };
    Ok(format!(
        "{TYPST_REPO_BASE}/v{TYPST_VERSION}/typst-{target}.{ext}"
    ))
}

fn ensure_parent_dir(path: &Path) -> Result<(), String> {
    let Some(parent) = path.parent() else {
        return Err("Invalid Typst destination path".to_owned());
    };
    fs::create_dir_all(parent).map_err(|e| format!("Failed to create Typst directory: {e}"))
}

fn extract_zip(bytes: &[u8], dest: &Path) -> Result<(), String> {
    let reader = Cursor::new(bytes);
    let mut archive = ZipArchive::new(reader).map_err(|e| format!("Failed to open zip: {e}"))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read zip entry: {e}"))?;
        let Some(name) = Path::new(file.name()).file_name() else {
            continue;
        };
        if name == typst_binary_name() {
            let mut out = fs::File::create(dest)
                .map_err(|e| format!("Failed to create Typst binary: {e}"))?;
            std::io::copy(&mut file, &mut out)
                .map_err(|e| format!("Failed to write Typst binary: {e}"))?;
            return Ok(());
        }
    }

    Err(format!(
        "Typst binary {} not found in zip archive",
        typst_binary_name()
    ))
}

fn extract_tar_xz(bytes: &[u8], dest: &Path) -> Result<(), String> {
    let reader = Cursor::new(bytes);
    let decoder = XzDecoder::new(reader);
    let mut archive = TarArchive::new(decoder);

    let entries = archive
        .entries()
        .map_err(|e| format!("Failed to read tar archive: {e}"))?;

    for entry in entries {
        let mut entry = entry.map_err(|e| format!("Failed to read tar entry: {e}"))?;
        let path = entry
            .path()
            .map_err(|e| format!("Failed to read tar entry path: {e}"))?;
        let Some(name) = path.file_name() else {
            continue;
        };
        if name == typst_binary_name() {
            let mut out = fs::File::create(dest)
                .map_err(|e| format!("Failed to create Typst binary: {e}"))?;
            std::io::copy(&mut entry, &mut out)
                .map_err(|e| format!("Failed to write Typst binary: {e}"))?;
            return Ok(());
        }
    }

    Err(format!(
        "Typst binary {} not found in tar archive",
        typst_binary_name()
    ))
}

#[cfg(unix)]
fn make_executable(path: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;

    let mut perms = fs::metadata(path)
        .map_err(|e| format!("Failed to read Typst permissions: {e}"))?
        .permissions();
    perms.set_mode(0o755);
    fs::set_permissions(path, perms).map_err(|e| format!("Failed to set Typst permissions: {e}"))
}

#[cfg(not(unix))]
fn make_executable(_path: &Path) -> Result<(), String> {
    Ok(())
}

fn download_typst(dest: &Path) -> Result<(), String> {
    let url = download_url()?;
    let client = reqwest::blocking::Client::builder()
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;
    let mut response = client
        .get(&url)
        .send()
        .map_err(|e| format!("Failed to download Typst from {url}: {e}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to download Typst from {url}: HTTP {}",
            response.status()
        ));
    }

    let mut bytes = Vec::new();
    response
        .read_to_end(&mut bytes)
        .map_err(|e| format!("Failed to read Typst download: {e}"))?;

    match current_target()?.1 {
        ArchiveKind::Zip => extract_zip(&bytes, dest)?,
        ArchiveKind::TarXz => extract_tar_xz(&bytes, dest)?,
    }

    make_executable(dest)
}

fn ensure_typst_binary(app: &AppHandle) -> Result<PathBuf, String> {
    if let Some(path) = existing_binary_path(Some(app)) {
        return Ok(path);
    }

    let _guard = DOWNLOAD_MUTEX
        .get_or_init(|| Mutex::new(()))
        .lock()
        .map_err(|_| "Failed to lock Typst download mutex".to_owned())?;

    if let Some(path) = existing_binary_path(Some(app)) {
        return Ok(path);
    }

    let dest = cached_binary_path(app)?;
    ensure_parent_dir(&dest)?;
    download_typst(&dest)?;

    if dest.exists() {
        Ok(dest)
    } else {
        Err("Typst download completed but binary was not found".to_owned())
    }
}

/// Get a writable output directory under app_data_dir.
/// Falls back to a temp directory if app_data_dir is unavailable.
fn compile_output_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let out_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?
        .join("output");
    fs::create_dir_all(&out_dir).map_err(|e| format!("Failed to create output directory: {e}"))?;
    Ok(out_dir)
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn resolve_typst_path(app: AppHandle) -> Result<String, String> {
    ensure_typst_binary(&app).map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub async fn compile_typst(app: AppHandle, content: String) -> Result<CompileResult, String> {
    let typst_bin = ensure_typst_binary(&app)?;

    let out_dir = compile_output_dir(&app)?;

    let input_path = out_dir.join("input.typ");
    let output_path = out_dir.join("output.pdf");

    fs::write(&input_path, &content).map_err(|e| format!("Failed to write input file: {e}"))?;

    let input_str = input_path.to_string_lossy().to_string();
    let output_str = output_path.to_string_lossy().to_string();

    let start = Instant::now();

    // Use tokio::process::Command so compilation runs off the main thread
    let mut cmd = tokio::process::Command::new(&typst_bin);
    cmd.args(["compile", &input_str, &output_str])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    // On Windows, prevent the typst subprocess from flashing a CMD window
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run typst: {}", e))?;

    #[allow(clippy::cast_possible_truncation, clippy::as_conversions)]
    let duration_ms = start.elapsed().as_millis() as u64;

    if output.status.success() {
        let pdf_bytes = fs::read(&output_path).map_err(|e| format!("Failed to read PDF: {}", e))?;
        let pdf_base64 = BASE64.encode(&pdf_bytes);

        Ok(CompileResult {
            pdf_base64,
            duration_ms,
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(if stderr.is_empty() {
            format!(
                "Typst exited with code {}",
                output.status.code().unwrap_or(-1)
            )
        } else {
            stderr
        })
    }
}

/// Run `typst query` on the last compiled input file to extract block positions.
/// Must be called after a successful `compile_typst` (reuses the same input.typ).
#[tauri::command]
pub async fn query_source_map(app: AppHandle) -> Result<Vec<SourceMapEntry>, String> {
    let typst_bin = ensure_typst_binary(&app)?;
    let out_dir = compile_output_dir(&app)?;
    let input_path = out_dir.join("input.typ");

    if !input_path.exists() {
        return Err("No compiled input file found".to_owned());
    }

    let input_str = input_path.to_string_lossy().to_string();

    let mut cmd = tokio::process::Command::new(&typst_bin);
    cmd.args(["query", &input_str, "metadata", "--pretty"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000);
    }

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run typst query: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("typst query failed: {stderr}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let items: Vec<QueryMetadataItem> =
        serde_json::from_str(&stdout).map_err(|e| format!("Failed to parse query output: {e}"))?;

    Ok(items
        .into_iter()
        .map(|item| SourceMapEntry {
            id: item.value.id,
            off: item.value.off,
            page: item.value.pos.page,
            x: parse_pt(&item.value.pos.x),
            y: parse_pt(&item.value.pos.y),
        })
        .collect())
}
