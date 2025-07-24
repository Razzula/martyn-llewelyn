use std::collections::HashMap;
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use once_cell::sync::Lazy;
use std::sync::Mutex;

const WALLET_PATH: &str = "wallet.json";

#[derive(Serialize, Deserialize, Clone)]
pub struct TokenEntry {
    pub accessToken: String,
    pub refreshToken: String,
    pub expiresAt: u64, // epoch seconds
}

#[derive(Serialize, Deserialize, Default)]
pub struct Wallet {
    tokens: HashMap<String, TokenEntry>,
}

static WALLET: Lazy<Mutex<Wallet>> = Lazy::new(|| {
    let wallet = Wallet::load();
    Mutex::new(wallet)
});

pub fn getWallet() -> std::sync::MutexGuard<'static, Wallet> {
    WALLET.lock().unwrap()
}

impl Wallet {
    pub fn load() -> Self {
        if (Path::new(WALLET_PATH).exists()) {
            // load from file, if exists
            let data = fs::read_to_string(WALLET_PATH).unwrap_or_default();
            serde_json::from_str(&data).unwrap_or_default()
        }
        else {
            // fresh wallet
            Wallet::default()
        }
    }

    pub fn save(&self) {
        // write to file
        let data = serde_json::to_string_pretty(&self).expect("Failed to serialize wallet");
        fs::write(WALLET_PATH, data).expect("Failed to write wallet");
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
