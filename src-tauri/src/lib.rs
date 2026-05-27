mod project;
mod typst;
mod update;
mod workspace_guard;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(typst::FontState::new())
        .manage(typst::LibraryState::new())
        .manage(typst::LastDocument::new())
        .manage(workspace_guard::WorkspaceRoot::new())
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
            update::check_update,
            workspace_guard::set_workspace_root,
            workspace_guard::clear_workspace_root,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
