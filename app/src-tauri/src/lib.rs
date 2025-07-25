#![allow(non_snake_case)]
#![allow(unused_parens)]

use std::sync::Mutex;

use tauri::Manager; 

mod wallet;
use wallet::{TokenEntry, Wallet};

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
        .invoke_handler(tauri::generate_handler![
            // TRUELAYER
            exchangeToken,
            fetchUserData,
            fetchAccountsData,
            fetchCardsData,
            fetchAccountBalance,
            fetchCardBalance,
            // WALLET
            loadWalletTokens,
        ])
        .setup(|app| {
            // setup wallet
            let wallet = Wallet::load(&app.handle());
            app.manage(std::sync::Mutex::new(wallet));

            // register deep link schemes
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
    let env = option_env!("VITE_TRUELAYER_ENV").unwrap_or("sandbox");
    if (env.eq_ignore_ascii_case("sandbox")) {
        "https://api.truelayer-sandbox.com"
    }
    else {
        "https://api.truelayer.com"
    }
}

pub fn getTrueLayerAuthUrl() -> &'static str {
    let env = option_env!("VITE_TRUELAYER_ENV").unwrap_or("sandbox");
    if (env.eq_ignore_ascii_case("sandbox")) {
        "https://auth.truelayer-sandbox.com"
    }
    else {
        "https://auth.truelayer.com"
    }
}


#[tauri::command]
async fn exchangeToken(
    wallet: tauri::State<'_, Mutex<Wallet>>,
    code: String,
    verifier: String,
) -> Result<String, String> {
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
    let json: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;

    let accessToken = json["access_token"].as_str().ok_or("missing access_token")?.to_string();
    let refreshToken = json["refresh_token"].as_str().ok_or("missing refresh_token")?.to_string();
    let expiresIn = json["expires_in"].as_u64().ok_or("missing expires_in")?;
    let expiresAt = nowEpoch() + expiresIn;

    let entry = TokenEntry {
        accessToken: accessToken.clone(),
        refreshToken: refreshToken.clone(),
        expiresAt: expiresAt,
    };

    let mut wallet = wallet.lock().unwrap();
    let walletToken = wallet.insert(entry);
    Ok(walletToken)
}

async fn refreshToken(
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    existingRefreshToken: &str,
) -> Result<TokenEntry, String> {
    use dotenvy::from_path;
    use std::env;

    // load .env
    let _ = from_path("../../.env");
    let clientID = env!("VITE_TRUELAYER_CLIENT_ID").to_string();
    let clientSecret = env!("TRUELAYER_CLIENT_SECRET").to_string();

    let client = reqwest::Client::new();
    let params = [
        ("grant_type", "refresh_token"),
        ("refresh_token", existingRefreshToken),
        ("client_id", &clientID),
        ("client_secret", &clientSecret),
    ];

    let res = client
        .post(format!("{}/connect/token", getTrueLayerAuthUrl()))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = res.text().await.map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;

    let accessToken = json["access_token"].as_str().ok_or("missing access_token")?.to_string();
    let refreshToken = json["refresh_token"].as_str().ok_or("missing refresh_token")?.to_string();
    let expiresIn = json["expires_in"].as_u64().ok_or("missing expires_in")?;
    let expiresAt = nowEpoch() + expiresIn;

    let entry = TokenEntry {
        accessToken: accessToken.clone(),
        refreshToken: refreshToken.clone(),
        expiresAt: expiresAt,
    };

    let mut wallet = wallet.lock().unwrap();
    wallet.update(walletToken, entry.clone());
    Ok(entry)
}

fn nowEpoch() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs()
}

#[tauri::command]
async fn fetchUserData(
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
) -> Result<String, String> {
    fetchFromTrueLayer(walletToken, "data/v1/info", wallet).await
}

#[tauri::command]
async fn fetchAccountsData(
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
) -> Result<String, String> {
    fetchFromTrueLayer(walletToken, "data/v1/accounts", wallet).await
}

#[tauri::command]
async fn fetchCardsData(
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
) -> Result<String, String> {
    fetchFromTrueLayer(walletToken, "data/v1/cards", wallet).await
}

#[tauri::command]
async fn fetchAccountBalance(
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    accountID: &str,
) -> Result<String, String> {
    let endpoint = format!("data/v1/accounts/{}/balance", accountID);
    fetchFromTrueLayer(walletToken, &endpoint, wallet).await
}


#[tauri::command]
async fn fetchCardBalance(
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    cardID: &str,
) -> Result<String, String> {
    let endpoint = format!("data/v1/cards/{}/balance", cardID);
    fetchFromTrueLayer(walletToken, &endpoint, wallet).await
}

async fn fetchFromTrueLayer(
    walletToken: &str,
    endpoint: &str,
    wallet: tauri::State<'_, Mutex<Wallet>>,
) -> Result<String, String> {

    // GET ACCESS TOKEN FROM WALLET
    let (needsRefresh, tokenToRefresh) = {
        let wallet = wallet.lock().unwrap();
        let entry = wallet.get(walletToken).cloned().ok_or("Invalid walletToken")?;

        let now = nowEpoch();
        (entry.expiresAt <= now + 60, entry.refreshToken)
    };

    let accessToken = if needsRefresh {
        let refreshed = refreshToken(wallet, walletToken, &tokenToRefresh).await?;
        refreshed.accessToken
    }
    else {
        let wallet = wallet.lock().unwrap();
        wallet.get(walletToken).unwrap().accessToken.clone()
    };

    // HANDLE REQUEST
    let url = format!("{}/{}", getTrueLayerApiUrl(), endpoint);
    let client = reqwest::Client::new();

    let res = client
        .get(&url)
        .bearer_auth(accessToken)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();

    if (status == reqwest::StatusCode::UNAUTHORIZED) {
        return Err("unauthorised".to_string());
    }

    let body = res.text().await.map_err(|e| e.to_string())?;

    if (!status.is_success()) {
        return Err(format!(
            "TrueLayer API error ({}): {}",
            status,
            if body.trim().is_empty() { "<no content>" } else { &body }
        ));
    }

    Ok(body)
}

#[tauri::command]
fn loadWalletTokens(wallet: tauri::State<'_, std::sync::Mutex<Wallet>>) -> Vec<String> {
    let wallet = wallet.lock().unwrap();
    wallet.tokenList()
}
