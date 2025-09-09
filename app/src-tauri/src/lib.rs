#![allow(non_snake_case)]
#![allow(unused_parens)]

use tauri::{Manager, State};
use tokio::sync::Mutex;

mod wallet;
use wallet::{TokenEntry, Wallet};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // load environment variables from .env file
    dotenvy::dotenv().ok();

    // initialise the Tauri application
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init());

    // configure desktop-specific features
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
                // compress window calls into the main window
                println!("Second instance launched with args: {argv:?}");

                // focus the main window
                use tauri::Manager;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                    let _ = window.show(); // ensures it's visible
                }
            }))
            .plugin(tauri_plugin_keyring::init());
    }

    // configure Android-specific features
    #[cfg(target_os = "android")]
    {
        builder = builder
            .plugin(tauri_plugin_biometric::init())
            .plugin(tauri_plugin_android_keystore::init());
    }

    // configure universal features
    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        // .manage(wallet::MasterPasswordState(Mutex::new(None)))
        // expose functions through Tauri
        .invoke_handler(tauri::generate_handler![
            // WALLET
            loadWalletTokens,
            removeWalletTokens,
            // FILE SYSTEM
            loadJSON,
            saveJSON,
            // TRUELAYER
            exchangeToken,
            fetchUserData,
            fetchAccountsData,
            fetchCardsData,
            fetchAccountBalance,
            fetchCardBalance,
            fetchAccountTransactions,
            fetchCardTransactions,
            fetchProviders,
        ])
        .setup(|app| {
            // setup wallet
            app.manage(tauri::async_runtime::Mutex::new(Wallet::default()));

            // register deep link schemes
            #[cfg(any(windows, target_os = "linux"))]
            {
                // see https://v2.tauri.app/plugin/deep-linking/
                // macos, android, ios: "Deep links must be registered in config. Dynamic registration at runtime is not supported."
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            // setup Android ...
            #[cfg(target_os = "android")]
            {

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

// BASIC FILE HANDLING

#[tauri::command]
async fn loadJSON(app: tauri::AppHandle, filename: String) -> Result<String, String> {
    let path = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join(filename);

    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn saveJSON(app: tauri::AppHandle, filename: String, json: String) -> Result<(), String> {
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

// TRUELAYER API

pub fn getTrueLayerApiUrl() -> &'static str {
    let env = option_env!("VITE_TRUELAYER_ENV").unwrap_or("sandbox");
    if (env.eq_ignore_ascii_case("sandbox")) {
        "https://api.truelayer-sandbox.com"
    } else {
        "https://api.truelayer.com"
    }
}

pub fn getTrueLayerAuthUrl() -> &'static str {
    let env = option_env!("VITE_TRUELAYER_ENV").unwrap_or("sandbox");
    if (env.eq_ignore_ascii_case("sandbox")) {
        "https://auth.truelayer-sandbox.com"
    } else {
        "https://auth.truelayer.com"
    }
}

#[tauri::command]
async fn exchangeToken(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    code: String,
    userID: String,
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

    let accessToken = json["access_token"]
        .as_str()
        .ok_or("missing access_token")?
        .to_string();
    let refreshToken = json["refresh_token"]
        .as_str()
        .ok_or("missing refresh_token")?
        .to_string();
    let expiresIn = json["expires_in"].as_u64().ok_or("missing expires_in")?;
    let expiresAt = nowEpoch() + expiresIn;

    let entry = TokenEntry {
        accessToken: accessToken.clone(),
        refreshToken: refreshToken.clone(),
        expiresAt: expiresAt,
        userID: userID.clone(),
    };

    let mut wallet = wallet.lock().await;
    let walletToken = wallet.insert(entry, app).await;
    Ok(walletToken)
}

async fn refreshToken(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    existingRefreshToken: &str,
    userID: &str,
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

    let accessToken = json["access_token"]
        .as_str()
        .ok_or("missing access_token")?
        .to_string();
    let refreshToken = json["refresh_token"]
        .as_str()
        .ok_or("missing refresh_token")?
        .to_string();
    let expiresIn = json["expires_in"].as_u64().ok_or("missing expires_in")?;
    let expiresAt = nowEpoch() + expiresIn;

    let entry = TokenEntry {
        accessToken: accessToken.clone(),
        refreshToken: refreshToken.clone(),
        expiresAt: expiresAt,
        userID: userID.to_string(),
    };

    let mut wallet = wallet.lock().await;
    wallet.update(walletToken, entry.clone(), app).await;
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
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
) -> Result<String, String> {
    fetchFromTrueLayerUsingWallet(app, walletToken, "data/v1/info", wallet).await
}

#[tauri::command]
async fn fetchAccountsData(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
) -> Result<String, String> {
    fetchFromTrueLayerUsingWallet(app, walletToken, "data/v1/accounts", wallet).await
}

#[tauri::command]
async fn fetchCardsData(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
) -> Result<String, String> {
    fetchFromTrueLayerUsingWallet(app, walletToken, "data/v1/cards", wallet).await
}

#[tauri::command]
async fn fetchAccountBalance(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    accountID: &str,
) -> Result<String, String> {
    let endpoint = format!("data/v1/accounts/{}/balance", accountID);
    fetchFromTrueLayerUsingWallet(app, walletToken, &endpoint, wallet).await
}

#[tauri::command]
async fn fetchCardBalance(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    cardID: &str,
) -> Result<String, String> {
    let endpoint = format!("data/v1/cards/{}/balance", cardID);
    fetchFromTrueLayerUsingWallet(app, walletToken, &endpoint, wallet).await
}

#[tauri::command]
async fn fetchAccountTransactions(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    accountID: &str,
    from: Option<&str>,
    to: Option<&str>,
) -> Result<String, String> {
    let mut endpoint = format!("data/v1/accounts/{}/transactions", accountID);
    let mut query = vec![];

    // query builder
    if let Some(f) = from {
    query.push(format!("from={}", f));
    }
    if let Some(t) = to {
        query.push(format!("to={}", t));
    }
    if !query.is_empty() {
        endpoint.push('?');
        endpoint.push_str(&query.join("&"));
    }

    fetchFromTrueLayerUsingWallet(app, walletToken, &endpoint, wallet).await
}

#[tauri::command]
async fn fetchCardTransactions(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    cardID: &str,
    from: Option<&str>,
    to: Option<&str>,
) -> Result<String, String> {
    let mut endpoint = format!("data/v1/cards/{}/transactions", cardID);
    let mut query = vec![];

    // query builder
    if let Some(f) = from {
    query.push(format!("from={}", f));
    }
    if let Some(t) = to {
        query.push(format!("to={}", t));
    }
    if !query.is_empty() {
        endpoint.push('?');
        endpoint.push_str(&query.join("&"));
    }

    fetchFromTrueLayerUsingWallet(app, walletToken, &endpoint, wallet).await
}

#[tauri::command]
async fn fetchProviders() -> Result<String, String> {
    // Fetch providers from TrueLayer
    let endpoint = format!("api/providers?clientId={}", env!("VITE_TRUELAYER_CLIENT_ID"));
    fetchFromTrueLayer(None, &endpoint, true).await
}

async fn fetchFromTrueLayerUsingWallet(
    app: tauri::AppHandle,
    walletToken: &str,
    endpoint: &str,
    wallet: tauri::State<'_, Mutex<Wallet>>,
) -> Result<String, String> {
    // GET ACCESS TOKEN FROM WALLET
    let (needsRefresh, tokenToRefresh, userID) = {
        let mut wallet = wallet.lock().await;
        let entry = wallet
            .get(walletToken, &app)
            .await
            .cloned()
            .ok_or("Invalid walletToken")?;

        let now = nowEpoch();
        (
            entry.expiresAt <= now + 60,
            entry.refreshToken,
            entry.userID.clone(),
        )
    };

    // REFRESH TOKEN, IF NEEDED
    let accessToken = if needsRefresh {
        let refreshed = refreshToken(app, wallet, walletToken, &tokenToRefresh, &userID).await?;
        refreshed.accessToken
    } else {
        let mut wallet = wallet.lock().await;
        wallet
            .get(walletToken, &app)
            .await
            .unwrap()
            .accessToken
            .clone()
    };

    // EMBED userID IN RESPONSE
    let raw = fetchFromTrueLayer(Some(accessToken.as_str()), &endpoint, false).await?;

    let mut json: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    json["userID"] = serde_json::Value::String(userID.to_string());

    Ok(json.to_string())
}

async fn fetchFromTrueLayer(accessToken: Option<&str>, endpoint: &str, useAuth: bool) -> Result<String, String> {
    // HANDLE REQUEST
    let host = if useAuth {
        getTrueLayerAuthUrl()
    } else {
        getTrueLayerApiUrl()
    };
    let url = format!("{}/{}", host, endpoint);
    let client = reqwest::Client::new();

    let mut req = client.get(&url);

    if let Some(token) = accessToken {
        req = req.bearer_auth(token);
    }

    let res = req
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
            if body.trim().is_empty() {
                "<no content>"
            } else {
                &body
            }
        ));
    }

    Ok(body)
}

#[tauri::command]
async fn loadWalletTokens(
    app: tauri::AppHandle,
    wallet: State<'_, Mutex<Wallet>>,
) -> Result<Vec<String>, String> {
    let mut wallet = wallet.lock().await;
    Ok(wallet.tokenList(&app).await?)
}

#[tauri::command]
async fn removeWalletTokens(
    app: tauri::AppHandle,
    wallet: State<'_, Mutex<Wallet>>,
    walletTokens: Vec<String>,
) -> Result<(), String> {
    let mut wallet = wallet.lock().await;
    for walletToken in walletTokens {
        wallet.remove(&walletToken, app.clone()).await;
    }
    Ok(())
}
