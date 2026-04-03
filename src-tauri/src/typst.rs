use serde::Serialize;
use std::fs;
use std::process::Command;
use std::time::Instant;

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;

#[derive(Serialize)]
pub struct CompileResult {
    pub pdf_base64: String,
    pub duration_ms: u64,
}

fn find_typst_binary() -> Option<String> {
    let bin = if cfg!(windows) { "typst.exe" } else { "typst" };

    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            let p = exe_dir.join("resources").join(bin);
            if p.exists() {
                return Some(p.to_string_lossy().to_string());
            }
            let p = exe_dir.join(bin);
            if p.exists() {
                return Some(p.to_string_lossy().to_string());
            }
            // Dev mode: src-tauri/target/debug → src-tauri/resources
            let dev_path = exe_dir.join("../../resources").join(bin);
            if let Ok(canonical) = dev_path.canonicalize() {
                if canonical.exists() {
                    return Some(canonical.to_string_lossy().to_string());
                }
            }
        }
    }

    let which_cmd = if cfg!(windows) { "where" } else { "which" };
    if let Ok(output) = Command::new(which_cmd).arg(bin).output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(path);
            }
        }
    }

    None
}

#[tauri::command]
pub fn resolve_typst_path() -> Result<String, String> {
    find_typst_binary().ok_or_else(|| "Typst binary not found".to_string())
}

#[tauri::command]
pub fn compile_typst(content: String) -> Result<CompileResult, String> {
    let typst_bin = find_typst_binary()
        .ok_or_else(|| "Typst binary not found".to_string())?;

    let exe_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .unwrap()
        .to_path_buf();

    let out_dir = exe_dir.join("output");
    fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;

    let input_path = out_dir.join("input.typ");
    let output_path = out_dir.join("output.pdf");

    fs::write(&input_path, &content).map_err(|e| e.to_string())?;

    let start = Instant::now();
    let output = Command::new(&typst_bin)
        .args(["compile", &input_path.to_string_lossy(), &output_path.to_string_lossy()])
        .output()
        .map_err(|e| format!("Failed to run typst: {}", e))?;

    let duration_ms = start.elapsed().as_millis() as u64;

    if output.status.success() {
        // Read PDF and return as base64
        let pdf_bytes = fs::read(&output_path)
            .map_err(|e| format!("Failed to read PDF: {}", e))?;
        let pdf_base64 = BASE64.encode(&pdf_bytes);

        Ok(CompileResult {
            pdf_base64,
            duration_ms,
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(if stderr.is_empty() {
            format!("Typst exited with code {}", output.status.code().unwrap_or(-1))
        } else {
            stderr
        })
    }
}
