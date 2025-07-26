#![allow(non_snake_case)]
#![allow(unused_parens)]

use std::collections::HashMap;
use std::fs;

use aes_gcm::aead::{generic_array::GenericArray, Aead, KeyInit};
use aes_gcm::Aes256Gcm;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

pub async fn getOrGenerateMasterKey(app: AppHandle) -> Result<[u8; 32], String> {
    // LINUX, ...
    #[cfg(not(target_os = "android"))]
    {
        use tauri_plugin_keyring::KeyringExt;

        let service = "wallet-encryption";
        let username = "default";

        // try to retrieve the key
        if let Some(hexKey) = app
            .keyring()
            .get_password(service, username)
            .map_err(|e| e.to_string())?
        {
            let key = hex::decode(&hexKey).map_err(|e| e.to_string())?;
            return Ok(key.try_into().map_err(|_| "invalid key length")?);
        }

        // if not found, generate and store one
        let mut key = [0u8; 32];
        rand::rng().fill_bytes(&mut key);
        app.keyring()
            .set_password(service, username, &hex::encode(&key))
            .map_err(|e| e.to_string())?;

        return Ok(key);
    }

    // ANDROID
    #[cfg(target_os = "android")]
    {
        // try to retrieve the key
        let masterKey = app.state::<MasterKey>();
        if let Some(key) = masterKey.get() {
            return Ok(key);
        }

        // if not found, error
        Err("Master key not set. Please set it using the Android keystore.".into())
    }
}

pub fn encryptJSON(json: &str, key: &[u8; 32]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new(GenericArray::from_slice(key));
    let mut nonce = [0u8; 12];
    rand::rng().fill_bytes(&mut nonce);
    let ciphertext = cipher
        .encrypt(GenericArray::from_slice(&nonce), json.as_bytes())
        .map_err(|e| e.to_string())?;

    let mut combined = nonce.to_vec();
    combined.extend(ciphertext);
    Ok(combined)
}

pub fn decryptData(data: &[u8], key: &[u8; 32]) -> Result<String, String> {
    if (data.len() < 12) {
        return Err("Data too short".into());
    }

    let (nonce, ciphertext) = data.split_at(12);
    let cipher = Aes256Gcm::new(GenericArray::from_slice(key));
    let plaintext = cipher
        .decrypt(GenericArray::from_slice(nonce), ciphertext)
        .map_err(|e| e.to_string())?;

    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TokenEntry {
    pub accessToken: String,
    pub refreshToken: String,
    pub expiresAt: u64, // epoch seconds
    pub userID: String,
}

#[derive(Serialize, Deserialize, Default)]
pub struct Wallet {
    tokens: HashMap<String, TokenEntry>,

    #[serde(skip)]
    path: std::path::PathBuf,
}

impl Wallet {
    pub async fn load(app: &AppHandle) -> Self {
        let walletPath = app
            .path()
            .app_local_data_dir()
            .expect("Failed to resolve app_local_data_dir")
            .join("wallet.enc");
        println!("Wallet path: {}", walletPath.display());

        if (walletPath.exists()) {
            // load from file, if exists
            let encryptedData = fs::read(&walletPath).unwrap_or_default();
            let data = decryptData(
                &encryptedData,
                &getOrGenerateMasterKey(app.clone()).await.unwrap(),
            )
            .expect("Failed to decrypt wallet data");

            serde_json::from_str::<Wallet>(&data)
                .unwrap_or_default()
                .withPath(walletPath)
        } else {
            // fresh wallet
            Wallet::default().withPath(walletPath)
        }
    }

    fn withPath(mut self, path: std::path::PathBuf) -> Self {
        self.path = path;
        self
    }

    pub async fn save(&self, app: AppHandle) {
        // write to file
        let encryptedData = encryptJSON(
            &serde_json::to_string_pretty(&self).expect("Failed to serialize wallet"),
            &getOrGenerateMasterKey(app.clone()).await.unwrap(),
        );
        // write
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).expect("Failed to create wallet directory");
        }
        fs::write(&self.path, encryptedData.unwrap()).expect("Failed to write wallet");
    }

    pub async fn insert(&mut self, entry: TokenEntry, app: AppHandle) -> String {
        if (self.isEmpty()) {
            *self = Wallet::load(&app).await;
        }
        // generate a new entry
        let walletToken = Uuid::new_v4().to_string();
        self.tokens.insert(walletToken.clone(), entry);
        self.save(app).await;
        walletToken
    }

    pub async fn update(&mut self, walletToken: &str, entry: TokenEntry, app: AppHandle) {
        if (self.isEmpty()) {
            *self = Wallet::load(&app).await;
        }
        self.tokens.insert(walletToken.to_string(), entry);
        self.save(app).await;
    }

    pub async fn get(&mut self, walletToken: &str, app: &AppHandle) -> Option<&TokenEntry> {
        if (self.isEmpty()) {
            *self = Wallet::load(app).await;
        }
        self.tokens.get(walletToken)
    }

    pub fn isEmpty(&self) -> bool {
        self.tokens.is_empty()
    }

    pub async fn tokenList(&mut self, app: &AppHandle) -> Result<Vec<String>, String> {
        if (self.isEmpty()) {
            *self = Wallet::load(app).await;
        }
        // return flat list of all wallet tokens
        Ok(self.tokens.keys().cloned().collect())
    }
}

#[cfg(target_os = "android")]
use std::sync::Mutex;

#[cfg(target_os = "android")]
pub struct MasterKey(Mutex<Option<[u8; 32]>>);

#[cfg(target_os = "android")]
impl MasterKey {
    pub fn new() -> Self {
        MasterKey(Mutex::new(None))
    }

    pub fn get(&self) -> Option<[u8; 32]> {
        *self.0.lock().unwrap()
    }

    pub fn set(&self, key: [u8; 32]) {
        *self.0.lock().unwrap() = Some(key);
    }
}
