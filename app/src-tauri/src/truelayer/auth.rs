#![allow(non_snake_case)]
#![allow(unused_parens)]

use tokio::sync::Mutex;

use crate::wallet::TokenFace;
use crate::{truelayer::utils::getTrueLayerAuthUrl};
use crate::{wallet};
use crate::{utils::nowEpoch};
use wallet::{TokenEntry, Wallet};

// TRUELAYER AUTH

#[tauri::command]
pub async fn exchangeToken(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    code: String,
    userID: String,
    verifier: String,
) -> Result<TokenFace, String> {
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
    if (json.get("error").is_some()) {
        println!("TrueLayer error (token exchange): {}", json["error"]);
        if (json.get("error_description").is_some()) {
            println!("Details: {}", json["error_description"]);
        }
    }

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
        userID: userID.clone(),
        accessToken: accessToken.clone(),
        refreshToken: refreshToken.clone(),
        expiresAt: expiresAt,
        consentedAt: nowEpoch(),
        meta: None,
    };

    let mut wallet = wallet.lock().await;
    let walletToken = wallet.insert(entry, app.clone()).await;

    let face = wallet.see(&walletToken, &app).await
        .ok_or("Failed to retrieve newly inserted token")?;
    Ok(face)
}

pub async fn refreshToken(
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
    if (json.get("error").is_some()) {
        println!("TrueLayer error (token refresh): {}", json["error"]);
        if (json.get("error_description").is_some()) {
            println!("Details: {}", json["error_description"]);
        }
    }

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
    
    let mut wallet = wallet.lock().await;

    let oldEntry = wallet
        .get(walletToken, &app)
        .await
        .cloned()
        .ok_or("Invalid walletToken")?;

    let newEntry = TokenEntry {
        userID: userID.to_string(),
        accessToken: accessToken.clone(),
        refreshToken: refreshToken.clone(),
        expiresAt: expiresAt,
        consentedAt: oldEntry.consentedAt,
        meta: oldEntry.meta,
    };

    wallet.update(walletToken, newEntry.clone(), app).await;
    Ok(newEntry)
}
