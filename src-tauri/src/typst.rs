use serde::Serialize;
use std::fs;
use std::process::Command;
use std::time::Instant;

#[derive(Serialize)]
pub struct CompileResult {
    pub pdf_path: String,
    pub duration_ms: u64,
}

fn find_typst_binary() -> Option<String> {
    let bin = if cfg!(windows) { "typst.exe" } else { "typst" };

    // Check next to the executable
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            // resources/typst next to exe
            let p = exe_dir.join("resources").join(bin);
            if p.exists() {
                return Some(p.to_string_lossy().to_string());
            }
            // Also check directly next to exe
            let p = exe_dir.join(bin);
            if p.exists() {
                return Some(p.to_string_lossy().to_string());
            }
        }
    }

    // Fallback to system PATH
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
        Ok(CompileResult {
            pdf_path: output_path.to_string_lossy().to_string(),
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
