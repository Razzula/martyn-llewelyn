#![allow(non_snake_case)]
#![allow(unused_parens)]

mod wallet;
mod truelayer;
mod utils;

use tauri::{Manager, State};
use tokio::sync::Mutex;

use wallet::{Wallet, TokenFace};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // load environment variables from .env file
    dotenvy::dotenv().ok();

    // initialise the Tauri application
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
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
            utils::loadJSON,
            utils::saveJSON,
            // TRUELAYER
            truelayer::auth::exchangeToken,
            truelayer::api::fetchUserData,
            truelayer::api::fetchAccountsData,
            truelayer::api::fetchCardsData,
            truelayer::api::fetchAccountBalance,
            truelayer::api::fetchCardBalance,
            truelayer::api::fetchAccountTransactions,
            truelayer::api::fetchCardTransactions,
            truelayer::api::fetchProviders,
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
            {}

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

#[tauri::command]
async fn loadWalletTokens(
    app: tauri::AppHandle,
    wallet: State<'_, Mutex<Wallet>>,
) -> Result<Vec<TokenFace>, String> {
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
