#![allow(non_snake_case)]
#![allow(unused_parens)]

use tokio::sync::Mutex;

use crate::truelayer::{auth::refreshToken, utils::{getTrueLayerApiUrl, getTrueLayerAuthUrl, parseAndUpdateWalletMeta}};
use crate::{wallet};
use wallet::{Wallet};

// TRUELAYER API

#[tauri::command]
pub async fn fetchUserData(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
) -> Result<String, String> {
    fetchFromTrueLayerUsingWallet(app, walletToken, "data/v1/info", wallet).await
}

#[tauri::command]
pub async fn fetchAccountsData(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
) -> Result<String, String> {
    let resultText = fetchFromTrueLayerUsingWallet(app.clone(), walletToken, "data/v1/accounts", wallet.clone()).await?;
    let _ = parseAndUpdateWalletMeta(app, wallet, walletToken, &resultText).await; // XXX: should fire and forget
    Ok(resultText)
}

#[tauri::command]
pub async fn fetchCardsData(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
) -> Result<String, String> {
    let resultText = fetchFromTrueLayerUsingWallet(app.clone(), walletToken, "data/v1/cards", wallet.clone()).await?;
    let _ = parseAndUpdateWalletMeta(app, wallet, walletToken, &resultText).await; // XXX: should fire and forget
    Ok(resultText)
}

#[tauri::command]
pub async fn fetchAccountBalance(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    accountID: &str,
) -> Result<String, String> {
    let endpoint = format!("data/v1/accounts/{}/balance", accountID);
    fetchFromTrueLayerUsingWallet(app, walletToken, &endpoint, wallet).await
}

#[tauri::command]
pub async fn fetchCardBalance(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    cardID: &str,
) -> Result<String, String> {
    let endpoint = format!("data/v1/cards/{}/balance", cardID);
    fetchFromTrueLayerUsingWallet(app, walletToken, &endpoint, wallet).await
}

#[tauri::command]
pub async fn fetchAccountTransactions(
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
pub async fn fetchCardTransactions(
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
pub async fn fetchProviders() -> Result<String, String> {
    // Fetch providers from TrueLayer
    let endpoint = format!(
        "api/providers?clientId={}",
        env!("VITE_TRUELAYER_CLIENT_ID")
    );
    fetchFromTrueLayer(None, &endpoint, true).await
}

pub async fn fetchFromTrueLayerUsingWallet(
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

        let now = crate::utils::nowEpoch();
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

pub async fn fetchFromTrueLayer(
    accessToken: Option<&str>,
    endpoint: &str,
    useAuth: bool,
) -> Result<String, String> {
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

    let res = req.send().await.map_err(|e| e.to_string())?;

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
