mod project;
mod typst;
mod update;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(typst::FontState::new())
        .manage(typst::LibraryState::new())
        .manage(typst::LastDocument::new())
        .invoke_handler(tauri::generate_handler![
            typst::compile_typst,
            typst::query_source_map,
            project::save_project,
            project::load_project,
            project::read_bib_file,
            project::list_workspace,
            project::create_folder,
            project::create_document,
            project::rename_item,
            project::delete_item,
            project::load_version_index,
            project::load_version,
            project::save_version,
            project::delete_version,
            update::check_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
