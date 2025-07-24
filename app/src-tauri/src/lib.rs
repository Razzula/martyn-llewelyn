#![allow(non_snake_case)]
#![allow(unused_parens)]

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // load environment variables from .env file
    dotenvy::dotenv().ok();

    // initialise the Tauri application
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

    // configure desktop-specific features
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // compress window calls into the main window
            println!("Second instance launched with args: {argv:?}");

            // focus the main window
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
                let _ = window.show(); // ensures it's visible
            }
        }));
    }

    // configure universal features
    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        // expose functions through Tauri
        .invoke_handler(tauri::generate_handler![exchangeToken, fetchAccountData,])
        .setup(|app| {
            // regiter deep link schemes
            #[cfg(any(windows, target_os = "linux"))]
            {
                // see https://v2.tauri.app/plugin/deep-linking/
                // macos, android, ios: "Deep links must be registered in config. Dynamic registration at runtime is not supported."
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            // general setup
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub fn getTrueLayerApiUrl() -> &'static str {
    match std::env::var("VITE_TRUELAYER_ENV")
        .unwrap_or_else(|_| "sandbox".to_string())
        .as_str()
    {
        "sandbox" => "https://api.truelayer-sandbox.com",
        _ => "https://api.truelayer.com",
    }
}

pub fn getTrueLayerAuthUrl() -> &'static str {
    match std::env::var("VITE_TRUELAYER_ENV")
        .unwrap_or_else(|_| "sandbox".to_string())
        .as_str()
    {
        "sandbox" => "https://auth.truelayer-sandbox.com",
        _ => "https://auth.truelayer.com",
    }
}

#[tauri::command]
async fn exchangeToken(code: String, verifier: String) -> Result<String, String> {
    // load data from .env
    use dotenvy::from_path;
    use std::env;

    let _ = from_path("../../.env"); // load manually from the root directory

    let clientID = env!("VITE_TRUELAYER_CLIENT_ID").to_string();
    let redirectURI = env!("VITE_TRUELAYER_REDIRECT_URI").to_string();
    let clientSecret = env!("TRUELAYER_CLIENT_SECRET").to_string();

    // make POST request to TrueLayer
    let client = reqwest::Client::new();
    let params = [
        ("grant_type", "authorization_code"),
        ("code", &code),
        ("redirect_uri", &redirectURI),
        ("client_id", &clientID),
        ("client_secret", &clientSecret), // in theory, PKCE should not require this, but TrueLayer seemingly insists
        ("code_verifier", &verifier),
    ];

    let res = client
        .post(format!("{}/connect/token", getTrueLayerAuthUrl()))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
async fn fetchAccountData(accessToken: &str) -> Result<String, String> {
    let url = format!("{}/data/v1/accounts", getTrueLayerApiUrl());

    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .bearer_auth(accessToken)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if (res.status() == reqwest::StatusCode::UNAUTHORIZED) {
        return Err("unauthorised".to_string());
    }

    if (!res.status().is_success()) {
        let err = res.text().await.map_err(|e| e.to_string())?;
        return Err(format!("TrueLayer API error: {}", err));
    }

    let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(body)
}
