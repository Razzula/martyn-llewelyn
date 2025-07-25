use std::collections::HashMap;
use std::fs;

use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Clone)]
pub struct TokenEntry {
    pub accessToken: String,
    pub refreshToken: String,
    pub expiresAt: u64, // epoch seconds
}

#[derive(Serialize, Deserialize, Default)]
pub struct Wallet {
    tokens: HashMap<String, TokenEntry>,

    #[serde(skip)]
    path: std::path::PathBuf,
}

impl Wallet {
    pub fn load(appHandle: &AppHandle) -> Self {
        let walletPath = appHandle
            .path()
            .app_local_data_dir()
            .expect("Failed to resolve app_local_data_dir")
            .join("wallet.json");
        println!("Wallet path: {}", walletPath.display());

        if (walletPath.exists()) {
            // load from file, if exists
            let data = fs::read_to_string(&walletPath).unwrap_or_default();
            serde_json::from_str::<Wallet>(&data).unwrap_or_default()
                .withPath(walletPath)
        }
        else {
            // fresh wallet
            Wallet::default().withPath(walletPath)
        }
    }

    fn withPath(mut self, path: std::path::PathBuf) -> Self {
        self.path = path;
        self
    }

    pub fn save(&self) {
        // write to file
        let data = serde_json::to_string_pretty(&self).expect("Failed to serialize wallet");
        // write
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).expect("Failed to create wallet directory");
        }
        fs::write(&self.path, data).expect("Failed to write wallet");
    }

    pub fn insert(&mut self, entry: TokenEntry) -> String {
        // generate a new entry
        let walletToken = Uuid::new_v4().to_string();
        self.tokens.insert(walletToken.clone(), entry);
        self.save();
        walletToken
    }

    pub fn update(&mut self, walletToken: &str, entry: TokenEntry) {
        self.tokens.insert(walletToken.to_string(), entry);
        self.save();
    }

    pub fn get(&self, walletToken: &str) -> Option<&TokenEntry> {
        self.tokens.get(walletToken)
    }

    pub fn tokenList(&self) -> Vec<String> {
        // return flat list of all wallet tokens
        self.tokens.keys().cloned().collect()
    }
}
