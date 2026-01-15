#![allow(non_snake_case)]
#![allow(unused_parens)]

use tokio::sync::Mutex;

use crate::truelayer::utils::{getTrueLayerApiUrl, getTrueLayerAuthUrl};
use crate::utils::nowEpoch;
use crate::wallet;
use crate::wallet::TokenFace;
use wallet::{TokenEntry, Wallet};

// TRUELAYER TYPES

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
}

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
    let walletToken = wallet.insert(code, entry, app.clone()).await;

    let face = wallet
        .see(&walletToken, &app)
        .await
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

    updateWalletToken(
        app,
        wallet,
        walletToken,
        userID,
        accessToken,
        refreshToken,
        expiresIn,
    )
    .await
}

#[tauri::command]
pub async fn extendConnection(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    user: User,
    userHasReconfirmedConsent: bool,
) -> Result<serde_json::Value, String> {
    // load env
    let _ = dotenvy::from_path("../../.env");

    // fetch credentials for user
    let entry = {
        let mut walletGuard = wallet.lock().await;
        walletGuard
            .get(walletToken, &app)
            .await
            .ok_or("Invalid walletToken")?
            .clone()
    };

    // make request
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "user_has_reconfirmed_consent": userHasReconfirmedConsent,
        "client_id": env!("VITE_TRUELAYER_CLIENT_ID").to_string(),
        "client_secret": env!("TRUELAYER_CLIENT_SECRET").to_string(),
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
        "refresh_token": entry.refreshToken,
        "redirect_uri": env!("VITE_TRUELAYER_REDIRECT_URI").to_string(),
    });

    let res = client
        .post(format!(
            "{}/data/v1/connections/extend",
            getTrueLayerApiUrl()
        ))
        .header("accept", "application/json")
        .header("content-type", "application/json")
        .bearer_auth(entry.accessToken)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = res.text().await.map_err(|e| e.to_string())?;
    if text.trim().is_empty() {
        return Err("TrueLayer returned empty response".to_string());
    }
    let json: serde_json::Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    println!("{}", serde_json::to_string_pretty(&json).unwrap());
    if (json.get("error").is_some()) {
        println!("TrueLayer error (extend connection): {}", serde_json::to_string_pretty(&json).unwrap());
        if (json.get("error_description").is_some()) {
            return Err(json["error_description"].to_string());
        }
        return Err("Failed to extend connection".to_string());
    }

    // Handle action_needed
    match json.get("action_needed").and_then(|v| v.as_str()) {
        Some("no_action_needed") => {
            let accessToken = json["access_token"]
                .as_str()
                .ok_or("missing access_token")?
                .to_string();
            let refreshToken = json["refresh_token"]
                .as_str()
                .ok_or("missing refresh_token")?
                .to_string();
            let expiresIn = json["expires_in"].as_u64().ok_or("missing expires_in")?;

            _ = updateWalletToken(
                app, wallet,
                walletToken,
                &user.id, accessToken, refreshToken, expiresIn,
            )
            .await;
            Ok(serde_json::json!({ "action_needed": false }))
        }
        Some("authentication_needed") | Some("reconfirmation_of_consent_needed") => {
            // return user_input_link to frontend
            let link = json["user_input_link"]
                .as_str()
                .ok_or("Missing user_input_link")?;
            Ok(serde_json::json!({
                "action_needed": json["action_needed"],
                "user_input_link": link
            }))
        }
        other => {
            println!("Unknown action_needed: {:?}", other);
            Err("Unexpected response from TrueLayer".into())
        }
    }
}

async fn updateWalletToken(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    userID: &str,
    accessToken: String,
    refreshToken: String,
    expiresIn: u64,
) -> Result<TokenEntry, String> {
    let mut wallet = wallet.lock().await;

    let oldEntry = wallet
        .get(walletToken, &app)
        .await
        .cloned()
        .ok_or("Invalid walletToken")?;

    let newEntry = TokenEntry {
        userID: userID.to_string(),
        accessToken,
        refreshToken,
        expiresAt: nowEpoch() + expiresIn,
        consentedAt: oldEntry.consentedAt,
        meta: oldEntry.meta,
    };

    wallet.update(walletToken, newEntry.clone(), app).await;
    Ok(newEntry)
}
