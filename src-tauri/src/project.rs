use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read as _, Write as _};
use std::path::Path;

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
pub fn save_project(
    path: String,
    document_json: String,
    typst_source: String,
    bib_content: Option<String>,
    meta_json: String,
) -> Result<(), String> {
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

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_project(path: String) -> Result<ProjectData, String> {
    let file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    let mut document_json = String::new();
    let mut bib_content = None;
    let mut meta_json = None;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();

        if name == "document.json" {
            entry
                .read_to_string(&mut document_json)
                .map_err(|e| e.to_string())?;
        } else if name == "meta.json" {
            let mut s = String::new();
            entry.read_to_string(&mut s).map_err(|e| e.to_string())?;
            meta_json = Some(s);
        } else if name.ends_with(".bib") {
            let mut bib = String::new();
            entry.read_to_string(&mut bib).map_err(|e| e.to_string())?;
            bib_content = Some(bib);
        }
    }

    if document_json.is_empty() {
        return Err("No document.json found in project file".to_string());
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
        meta,
    })
}

fn default_meta(path: &str) -> DocumentMeta {
    let title = Path::new(path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string();
    DocumentMeta {
        title,
        citation_style: "oscola".to_string(),
        created_at: String::new(),
        modified_at: String::new(),
    }
}

// ---------------------------------------------------------------------------
// Workspace operations
// ---------------------------------------------------------------------------

#[tauri::command]
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
        .to_string();

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
pub fn create_folder(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_document(path: String, title: String, created_at: String) -> Result<(), String> {
    let meta = DocumentMeta {
        title,
        citation_style: "oscola".to_string(),
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
pub fn rename_item(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_item(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn read_bib_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}
