use tokio::sync::Mutex;

use crate::{wallet};
use wallet::{Wallet};

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

pub async fn parseAndUpdateWalletMeta(
    app: tauri::AppHandle,
    wallet: tauri::State<'_, Mutex<Wallet>>,
    walletToken: &str,
    jsonText: &str,
) -> Result<(), String> {
    let json: serde_json::Value = serde_json::from_str(jsonText).map_err(|e| e.to_string())?;

    // extract provider_id from the first account
    if let Some(provider_id) = json["results"]
        .get(0)
        .and_then(|acc| acc["provider"]["provider_id"].as_str())
    {
        let mut wallet = wallet.lock().await;
        wallet.setMeta(walletToken, provider_id.to_string(), app).await;
    }

    Ok(())
}
