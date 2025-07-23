#![allow(non_snake_case)]
#![allow(unused_parens)]

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()

    // expose functions through Tauri
    .invoke_handler(tauri::generate_handler![
      exchangeToken,
      fetchAccountData,
    ])

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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

pub fn getTrueLayerApiUrl() -> &'static str {
  match std::env::var("VITE_TRUELAYER_ENV").unwrap_or_else(|_| "sandbox".to_string()).as_str() {
    "sandbox" => "https://api.truelayer-sandbox.com",
    _ => "https://api.truelayer.com",
  }
}

pub fn getTrueLayerAuthUrl() -> &'static str {
  match std::env::var("VITE_TRUELAYER_ENV").unwrap_or_else(|_| "sandbox".to_string()).as_str() {
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

  let clientID = env::var("VITE_TRUELAYER_CLIENT_ID").map_err(|e| e.to_string())?;
  let redirectURI = env::var("VITE_TRUELAYER_REDIRECT_URI").map_err(|e| e.to_string())?;
  let clientSecret = env::var("TRUELAYER_CLIENT_SECRET").map_err(|e| e.to_string())?;

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
    .await.map_err(|e| e.to_string())?;

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
