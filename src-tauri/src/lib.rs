mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            storage::read_data_file,
            storage::write_data_file,
            storage::delete_data_file,
            storage::quarantine_data_file,
            storage::list_data_files,
            storage::write_export_file,
            storage::read_picked_file,
            storage::data_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
