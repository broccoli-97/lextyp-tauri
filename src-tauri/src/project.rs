use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read as _, Write as _};
use std::path::Path;

/// Names of top-level entries that `save_project` writes explicitly.
/// Any other entries found in an existing ZIP (e.g. `versions/*`) are
/// preserved automatically.
const MANAGED_ENTRIES: &[&str] = &[
    "meta.json",
    "document.json",
    "document.typ",
    "references.bib",
    "reviews.json",
];

#[derive(Serialize, Deserialize, Clone)]
pub struct DocumentMeta {
    pub title: String,
    pub citation_style: String,
    pub created_at: String,
    pub modified_at: String,
}

#[derive(Serialize)]
pub struct ProjectData {
    pub document_json: String,
    pub bib_content: Option<String>,
    pub review_json: Option<String>,
    pub meta: DocumentMeta,
}

#[derive(Serialize, Clone)]
#[serde(tag = "kind")]
pub enum FileTreeEntry {
    #[serde(rename = "folder")]
    Folder {
        name: String,
        path: String,
        children: Vec<FileTreeEntry>,
    },
    #[serde(rename = "document")]
    Document {
        name: String,
        path: String,
        title: String,
        modified_at: String,
    },
}

// ---------------------------------------------------------------------------
// Save / Load
// ---------------------------------------------------------------------------

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn save_project(
    path: String,
    document_json: String,
    typst_source: String,
    bib_content: Option<String>,
    meta_json: String,
    review_json: Option<String>,
) -> Result<(), String> {
    // Collect extra entries (e.g. versions/*) from the existing ZIP so they
    // survive the overwrite.
    let preserved = read_preserved_entries(&path);

    let file = fs::File::create(&path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);

    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // meta.json
    zip.start_file("meta.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(meta_json.as_bytes())
        .map_err(|e| e.to_string())?;

    // document.json
    zip.start_file("document.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(document_json.as_bytes())
        .map_err(|e| e.to_string())?;

    // document.typ
    zip.start_file("document.typ", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(typst_source.as_bytes())
        .map_err(|e| e.to_string())?;

    // references.bib
    if let Some(bib) = &bib_content {
        zip.start_file("references.bib", options)
            .map_err(|e| e.to_string())?;
        zip.write_all(bib.as_bytes()).map_err(|e| e.to_string())?;
    }

    // reviews.json
    if let Some(review) = &review_json {
        zip.start_file("reviews.json", options)
            .map_err(|e| e.to_string())?;
        zip.write_all(review.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    // Copy preserved entries (versions/*, etc.) from the old ZIP
    for (name, data) in &preserved {
        zip.start_file(name.as_str(), options)
            .map_err(|e| e.to_string())?;
        zip.write_all(data).map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

/// Read all ZIP entries whose names are NOT in `MANAGED_ENTRIES` from an
/// existing file. Returns an empty vec if the file does not exist or is not
/// a valid ZIP.
fn read_preserved_entries(path: &str) -> Vec<(String, Vec<u8>)> {
    let file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };
    let mut archive = match zip::ZipArchive::new(file) {
        Ok(a) => a,
        Err(_) => return Vec::new(),
    };

    let mut preserved = Vec::new();
    for i in 0..archive.len() {
        if let Ok(mut entry) = archive.by_index(i) {
            let name = entry.name().to_owned();
            if MANAGED_ENTRIES.contains(&name.as_str()) {
                continue;
            }
            let mut buf = Vec::new();
            if entry.read_to_end(&mut buf).is_ok() {
                preserved.push((name, buf));
            }
        }
    }
    preserved
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn load_project(path: String) -> Result<ProjectData, String> {
    let file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    let mut document_json = String::new();
    let mut bib_content = None;
    let mut meta_json = None;
    let mut review_json = None;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_owned();

        if name == "document.json" {
            entry
                .read_to_string(&mut document_json)
                .map_err(|e| e.to_string())?;
        } else if name == "meta.json" {
            let mut s = String::new();
            entry.read_to_string(&mut s).map_err(|e| e.to_string())?;
            meta_json = Some(s);
        } else if name == "reviews.json" {
            let mut s = String::new();
            entry.read_to_string(&mut s).map_err(|e| e.to_string())?;
            review_json = Some(s);
        } else if name.ends_with(".bib") {
            let mut bib = String::new();
            entry.read_to_string(&mut bib).map_err(|e| e.to_string())?;
            bib_content = Some(bib);
        }
    }

    if document_json.is_empty() {
        return Err("No document.json found in project file".to_owned());
    }

    // Parse meta or use defaults
    let meta = if let Some(json) = meta_json {
        serde_json::from_str::<DocumentMeta>(&json).unwrap_or_else(|_| default_meta(&path))
    } else {
        default_meta(&path)
    };

    Ok(ProjectData {
        document_json,
        bib_content,
        review_json,
        meta,
    })
}

fn default_meta(path: &str) -> DocumentMeta {
    let title = Path::new(path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_owned();
    DocumentMeta {
        title,
        citation_style: "oscola".to_owned(),
        created_at: String::new(),
        modified_at: String::new(),
    }
}

// ---------------------------------------------------------------------------
// Workspace operations
// ---------------------------------------------------------------------------

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn list_workspace(path: String) -> Result<Vec<FileTreeEntry>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    read_directory(root)
}

fn read_directory(dir: &Path) -> Result<Vec<FileTreeEntry>, String> {
    let mut folders: Vec<FileTreeEntry> = Vec::new();
    let mut documents: Vec<FileTreeEntry> = Vec::new();

    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/folders
        if name.starts_with('.') {
            continue;
        }

        if path.is_dir() {
            let children = read_directory(&path).unwrap_or_default();
            folders.push(FileTreeEntry::Folder {
                name,
                path: path.to_string_lossy().to_string(),
                children,
            });
        } else if path.extension().and_then(|e| e.to_str()) == Some("lextyp") {
            let (title, modified_at) = read_meta_from_zip(&path);
            documents.push(FileTreeEntry::Document {
                name,
                path: path.to_string_lossy().to_string(),
                title,
                modified_at,
            });
        }
    }

    // Sort: folders first (alphabetical), then documents (alphabetical)
    folders.sort_by(|a, b| entry_name(a).cmp(entry_name(b)));
    documents.sort_by(|a, b| entry_name(a).cmp(entry_name(b)));
    folders.extend(documents);
    Ok(folders)
}

fn entry_name(e: &FileTreeEntry) -> &str {
    match e {
        FileTreeEntry::Folder { name, .. } => name,
        FileTreeEntry::Document { name, .. } => name,
    }
}

fn read_meta_from_zip(path: &Path) -> (String, String) {
    let fallback_title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_owned();

    let file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return (fallback_title, String::new()),
    };
    let mut archive = match zip::ZipArchive::new(file) {
        Ok(a) => a,
        Err(_) => return (fallback_title, String::new()),
    };

    for i in 0..archive.len() {
        if let Ok(mut entry) = archive.by_index(i) {
            if entry.name() == "meta.json" {
                let mut s = String::new();
                if entry.read_to_string(&mut s).is_ok() {
                    if let Ok(meta) = serde_json::from_str::<DocumentMeta>(&s) {
                        return (meta.title, meta.modified_at);
                    }
                }
            }
        }
    }

    (fallback_title, String::new())
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn create_folder(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn create_document(path: String, title: String, created_at: String) -> Result<(), String> {
    let meta = DocumentMeta {
        title,
        citation_style: "oscola".to_owned(),
        created_at: created_at.clone(),
        modified_at: created_at,
    };
    let meta_json = serde_json::to_string_pretty(&meta).map_err(|e| e.to_string())?;

    let file = fs::File::create(&path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    zip.start_file("meta.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(meta_json.as_bytes())
        .map_err(|e| e.to_string())?;

    zip.start_file("document.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(b"[]").map_err(|e| e.to_string())?;

    zip.start_file("references.bib", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(b"").map_err(|e| e.to_string())?;

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn rename_item(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn delete_item(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn read_bib_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Version control
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone)]
pub struct VersionSnapshot {
    pub id: u32,
    pub name: String,
    pub description: String,
    pub author: String,
    pub created_at: String,
    pub block_count: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct VersionIndex {
    pub versions: Vec<VersionSnapshot>,
    pub max_versions: u32,
}

impl Default for VersionIndex {
    fn default() -> Self {
        Self {
            versions: Vec::new(),
            max_versions: 50,
        }
    }
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn load_version_index(path: String) -> Result<Option<VersionIndex>, String> {
    let file = match fs::File::open(&path) {
        Ok(f) => f,
        Err(_) => return Ok(None),
    };
    let mut archive = match zip::ZipArchive::new(file) {
        Ok(a) => a,
        Err(_) => return Ok(None),
    };

    let result = match archive.by_name("versions/index.json") {
        Ok(mut entry) => {
            let mut s = String::new();
            entry.read_to_string(&mut s).map_err(|e| e.to_string())?;
            let idx: VersionIndex =
                serde_json::from_str(&s).map_err(|e| e.to_string())?;
            Ok(Some(idx))
        }
        Err(_) => Ok(None),
    };
    result
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn load_version(path: String, version_id: u32) -> Result<String, String> {
    let file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    let entry_name = format!("versions/{}.json", version_id);
    let mut entry = archive
        .by_name(&entry_name)
        .map_err(|_| format!("Version {} not found", version_id))?;

    let mut s = String::new();
    entry.read_to_string(&mut s).map_err(|e| e.to_string())?;
    Ok(s)
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn save_version(
    path: String,
    name: String,
    description: String,
    author: String,
    document_json: String,
    meta_json: String,
) -> Result<VersionSnapshot, String> {
    // Read existing ZIP contents
    let old_file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut old_archive = zip::ZipArchive::new(old_file).map_err(|e| e.to_string())?;

    // Load or create version index
    let mut index: VersionIndex = match old_archive.by_name("versions/index.json") {
        Ok(mut entry) => {
            let mut s = String::new();
            entry.read_to_string(&mut s).map_err(|e| e.to_string())?;
            serde_json::from_str(&s).unwrap_or_default()
        }
        Err(_) => VersionIndex::default(),
    };

    // Determine next ID
    let next_id = index.versions.iter().map(|v| v.id).max().unwrap_or(0) + 1;

    // Count blocks for metadata
    let block_count = serde_json::from_str::<Vec<serde_json::Value>>(&document_json)
        .map(|v| v.len() as u32)
        .unwrap_or(0);

    let snapshot = VersionSnapshot {
        id: next_id,
        name,
        description,
        author,
        created_at: chrono::Utc::now().to_rfc3339(),
        block_count,
    };

    index.versions.push(snapshot.clone());

    // Enforce version limit -- remove oldest versions
    let mut removed_ids: Vec<u32> = Vec::new();
    while index.versions.len() > index.max_versions as usize {
        let removed = index.versions.remove(0);
        removed_ids.push(removed.id);
    }

    // Rebuild the ZIP with the new version data
    let new_index_json =
        serde_json::to_string_pretty(&index).map_err(|e| e.to_string())?;
    let version_entry_name = format!("versions/{}.json", next_id);
    let version_data = serde_json::json!({
        "document_json": document_json,
        "meta_json": meta_json,
    });
    let version_json =
        serde_json::to_string(&version_data).map_err(|e| e.to_string())?;

    // Re-open archive for reading (previous borrow was consumed)
    let old_file2 = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut old_archive2 = zip::ZipArchive::new(old_file2).map_err(|e| e.to_string())?;

    // Write to a temp file then rename for atomicity
    let tmp_path = format!("{}.tmp", path);
    let tmp_file = fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(tmp_file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Copy all existing entries except the old version index and removed versions
    for i in 0..old_archive2.len() {
        if let Ok(mut entry) = old_archive2.by_index(i) {
            let entry_name_str = entry.name().to_owned();
            if entry_name_str == "versions/index.json" {
                continue;
            }
            // Skip removed version files
            if removed_ids.iter().any(|id| entry_name_str == format!("versions/{}.json", id)) {
                continue;
            }
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            zip.start_file(entry_name_str.as_str(), options)
                .map_err(|e| e.to_string())?;
            zip.write_all(&buf).map_err(|e| e.to_string())?;
        }
    }

    // Write new version index
    zip.start_file("versions/index.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(new_index_json.as_bytes())
        .map_err(|e| e.to_string())?;

    // Write new version snapshot
    zip.start_file(version_entry_name.as_str(), options)
        .map_err(|e| e.to_string())?;
    zip.write_all(version_json.as_bytes())
        .map_err(|e| e.to_string())?;

    zip.finish().map_err(|e| e.to_string())?;

    // Atomic replace
    fs::rename(&tmp_path, &path).map_err(|e| e.to_string())?;

    Ok(snapshot)
}

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn delete_version(path: String, version_id: u32) -> Result<(), String> {
    let old_file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut old_archive = zip::ZipArchive::new(old_file).map_err(|e| e.to_string())?;

    // Load index
    let mut index: VersionIndex = match old_archive.by_name("versions/index.json") {
        Ok(mut entry) => {
            let mut s = String::new();
            entry.read_to_string(&mut s).map_err(|e| e.to_string())?;
            serde_json::from_str(&s).map_err(|e| e.to_string())?
        }
        Err(_) => return Err("No version index found".to_owned()),
    };

    // Remove the version from index
    index.versions.retain(|v| v.id != version_id);
    let new_index_json =
        serde_json::to_string_pretty(&index).map_err(|e| e.to_string())?;

    let skip_entry = format!("versions/{}.json", version_id);

    // Re-open for reading
    let old_file2 = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut old_archive2 = zip::ZipArchive::new(old_file2).map_err(|e| e.to_string())?;

    let tmp_path = format!("{}.tmp", path);
    let tmp_file = fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(tmp_file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    for i in 0..old_archive2.len() {
        if let Ok(mut entry) = old_archive2.by_index(i) {
            let entry_name_str = entry.name().to_owned();
            if entry_name_str == "versions/index.json" || entry_name_str == skip_entry {
                continue;
            }
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            zip.start_file(entry_name_str.as_str(), options)
                .map_err(|e| e.to_string())?;
            zip.write_all(&buf).map_err(|e| e.to_string())?;
        }
    }

    // Write updated index
    zip.start_file("versions/index.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(new_index_json.as_bytes())
        .map_err(|e| e.to_string())?;

    zip.finish().map_err(|e| e.to_string())?;
    fs::rename(&tmp_path, &path).map_err(|e| e.to_string())?;

    Ok(())
}
