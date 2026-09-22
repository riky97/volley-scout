//! Local file storage commands.
//!
//! All application data lives under the OS app-data directory. The frontend can only reach it
//! through these commands, which validate every relative path, so no `fs` plugin scope is needed.
//! Writes are atomic: content goes to a temporary file that is then renamed over the target.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use base64::Engine as _;
use tauri::{AppHandle, Manager};

const DATA_DIR: &str = "data";

/// Rejects anything that is not a plain `segment` or `segment/segment` relative path.
fn validate_relative_path(relative_path: &str) -> Result<(), String> {
    if relative_path.is_empty() || relative_path.len() > 200 {
        return Err("Percorso non valido.".into());
    }
    let segments: Vec<&str> = relative_path.split('/').collect();
    if segments.len() > 2 {
        return Err("Percorso non valido.".into());
    }
    for segment in segments {
        if segment.is_empty() || segment == "." || segment == ".." {
            return Err("Percorso non valido.".into());
        }
        let allowed = segment
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.');
        if !allowed {
            return Err("Percorso non valido.".into());
        }
    }
    Ok(())
}

fn data_root(app: &AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Cartella dati non disponibile: {error}"))?
        .join(DATA_DIR);
    fs::create_dir_all(&root).map_err(|error| format!("Impossibile creare la cartella dati: {error}"))?;
    Ok(root)
}

fn resolve(app: &AppHandle, relative_path: &str) -> Result<PathBuf, String> {
    validate_relative_path(relative_path)?;
    Ok(data_root(app)?.join(relative_path))
}

fn write_atomic(target: &Path, contents: &[u8]) -> Result<(), String> {
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("Impossibile creare la cartella: {error}"))?;
    }
    let temp = target.with_extension("tmp");
    {
        let mut file =
            fs::File::create(&temp).map_err(|error| format!("Scrittura non riuscita: {error}"))?;
        file.write_all(contents)
            .map_err(|error| format!("Scrittura non riuscita: {error}"))?;
        file.sync_all()
            .map_err(|error| format!("Scrittura non riuscita: {error}"))?;
    }
    fs::rename(&temp, target).map_err(|error| format!("Salvataggio non riuscito: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn read_data_file(app: AppHandle, relative_path: String) -> Result<Option<String>, String> {
    let path = resolve(&app, &relative_path)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path)
        .map(Some)
        .map_err(|error| format!("Lettura non riuscita: {error}"))
}

#[tauri::command]
pub fn write_data_file(app: AppHandle, relative_path: String, contents: String) -> Result<(), String> {
    let path = resolve(&app, &relative_path)?;
    write_atomic(&path, contents.as_bytes())
}

#[tauri::command]
pub fn delete_data_file(app: AppHandle, relative_path: String) -> Result<(), String> {
    let path = resolve(&app, &relative_path)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|error| format!("Eliminazione non riuscita: {error}"))?;
    }
    Ok(())
}

/// Moves a damaged file aside instead of deleting it, so nothing is ever lost silently.
#[tauri::command]
pub fn quarantine_data_file(
    app: AppHandle,
    relative_path: String,
    suffix: String,
) -> Result<(), String> {
    validate_relative_path(&suffix)?;
    let path = resolve(&app, &relative_path)?;
    if !path.exists() {
        return Ok(());
    }
    let target = path.with_file_name(format!(
        "{}.corrupt-{}.json",
        path.file_stem().and_then(|s| s.to_str()).unwrap_or("data"),
        suffix
    ));
    fs::rename(&path, target).map_err(|error| format!("Spostamento non riuscito: {error}"))
}

#[tauri::command]
pub fn list_data_files(app: AppHandle, relative_dir: String) -> Result<Vec<String>, String> {
    let dir = resolve(&app, &relative_dir)?;
    if !dir.is_dir() {
        return Ok(Vec::new());
    }
    let mut names = Vec::new();
    let entries = fs::read_dir(&dir).map_err(|error| format!("Lettura non riuscita: {error}"))?;
    for entry in entries.flatten() {
        if entry.path().is_file() {
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(".json") && !name.contains(".corrupt-") {
                    names.push(name.to_string());
                }
            }
        }
    }
    names.sort();
    Ok(names)
}

/// Writes an exported report to a path the user picked in the native save dialog.
#[tauri::command]
pub fn write_export_file(absolute_path: String, contents_base64: String) -> Result<(), String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(contents_base64.as_bytes())
        .map_err(|_| "Contenuto del file non valido.".to_string())?;
    let target = PathBuf::from(&absolute_path);
    let parent = target
        .parent()
        .ok_or_else(|| "Percorso di destinazione non valido.".to_string())?;
    if !parent.is_dir() {
        return Err("La cartella di destinazione non esiste.".into());
    }
    write_atomic(&target, &bytes)
}

/// Reads a JSON file the user picked in the native open dialog (import / restore).
/// Size-capped so a wrong pick cannot exhaust memory.
#[tauri::command]
pub fn read_picked_file(absolute_path: String) -> Result<String, String> {
    let target = PathBuf::from(&absolute_path);
    if !target.is_file() {
        return Err("Il file selezionato non esiste.".into());
    }
    let metadata =
        fs::metadata(&target).map_err(|error| format!("Lettura non riuscita: {error}"))?;
    if metadata.len() > 64 * 1024 * 1024 {
        return Err("Il file selezionato e troppo grande.".into());
    }
    fs::read_to_string(&target).map_err(|error| format!("Lettura non riuscita: {error}"))
}

/// Absolute path of the data directory, shown in the settings screen.
#[tauri::command]
pub fn data_directory(app: AppHandle) -> Result<String, String> {
    Ok(data_root(&app)?.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::validate_relative_path;

    #[test]
    fn accepts_simple_paths() {
        assert!(validate_relative_path("settings.json").is_ok());
        assert!(validate_relative_path("matches/abc-123.json").is_ok());
    }

    #[test]
    fn rejects_traversal_and_absolute_paths() {
        assert!(validate_relative_path("../secret.json").is_err());
        assert!(validate_relative_path("/etc/passwd").is_err());
        assert!(validate_relative_path("a/b/c.json").is_err());
        assert!(validate_relative_path("").is_err());
        assert!(validate_relative_path("mat ches/a.json").is_err());
    }
}
