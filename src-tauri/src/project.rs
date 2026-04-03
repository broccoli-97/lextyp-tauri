use serde::Serialize;
use std::fs;
use std::io::{Read as _, Write as _};

#[derive(Serialize)]
pub struct ProjectData {
    pub document_json: String,
    pub bib_content: Option<String>,
}

#[tauri::command]
pub fn save_project(
    path: String,
    document_json: String,
    typst_source: String,
    bib_content: Option<String>,
) -> Result<(), String> {
    let file = fs::File::create(&path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);

    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // document.json
    zip.start_file("document.json", options).map_err(|e| e.to_string())?;
    zip.write_all(document_json.as_bytes()).map_err(|e| e.to_string())?;

    // document.typ
    zip.start_file("document.typ", options).map_err(|e| e.to_string())?;
    zip.write_all(typst_source.as_bytes()).map_err(|e| e.to_string())?;

    // references.bib
    if let Some(bib) = &bib_content {
        zip.start_file("references.bib", options).map_err(|e| e.to_string())?;
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

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();

        if name == "document.json" {
            entry.read_to_string(&mut document_json).map_err(|e| e.to_string())?;
        } else if name.ends_with(".bib") {
            let mut bib = String::new();
            entry.read_to_string(&mut bib).map_err(|e| e.to_string())?;
            bib_content = Some(bib);
        }
    }

    if document_json.is_empty() {
        return Err("No document.json found in project file".to_string());
    }

    Ok(ProjectData {
        document_json,
        bib_content,
    })
}

#[tauri::command]
pub fn read_bib_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}
