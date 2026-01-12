#![allow(non_snake_case)]
#![allow(unused_parens)]

use tauri::{Manager};

#[tauri::command]
pub async fn loadJSON(app: tauri::AppHandle, filename: String) -> Result<String, String> {
    let path = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join(filename);

    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn saveJSON(app: tauri::AppHandle, filename: String, json: String) -> Result<(), String> {
    let path = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join(filename);

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(&path, json).map_err(|e| e.to_string())
}

pub fn nowEpoch() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs()
}
