// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;

#[derive(Serialize)]
struct NativePlatformCapabilities {
    runtime: &'static str,
    version: &'static str,
    os: &'static str,
    arch: &'static str,
    hardware_keychain_ready: bool,
    zero_telemetry_enforced: bool,
}

#[tauri::command]
fn get_native_platform_info() -> NativePlatformCapabilities {
    NativePlatformCapabilities {
        runtime: "tauri-v2-sovereign",
        version: "2.0.0-2027",
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        hardware_keychain_ready: true,
        zero_telemetry_enforced: true,
    }
}

#[tauri::command]
fn calculate_native_shannon_entropy(bytes: Vec<u8>) -> f64 {
    if bytes.is_empty() {
        return 0.0;
    }
    let mut frequencies = [0u32; 256];
    for &b in &bytes {
        frequencies[b as usize] += 1;
    }
    let len = bytes.len() as f64;
    let mut entropy = 0.0f64;
    for &count in &frequencies {
        if count > 0 {
            let p = (count as f64) / len;
            entropy -= p * p.log2();
        }
    }
    (entropy * 1000.0).round() / 1000.0
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_native_platform_info,
            calculate_native_shannon_entropy
        ])
        .run(tauri::generate_context!())
        .expect("error while running aetheris application");
}
