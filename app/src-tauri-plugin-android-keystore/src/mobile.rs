#![allow(non_snake_case)]
#![allow(unused_parens)]

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use tauri::{
    plugin::mobile::PluginInvokeError,
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

pub type Result<T> = std::result::Result<T, PluginInvokeError>;

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> Result<AndroidKeystore<R>> {
    let handle =
        api.register_android_plugin("io.github.razzula.martyn_llewelyn.plugin", "KeystorePlugin")?;
    Ok(AndroidKeystore(handle))
}

pub struct AndroidKeystore<R: Runtime>(PluginHandle<R>);

#[derive(Debug, Deserialize, Serialize)]
pub struct FetchResponse {
    pub value: String,
}

impl<R: Runtime> AndroidKeystore<R> {
    pub fn fetch(&self) -> Result<Option<String>> {
        match self.0.run_mobile_plugin("fetch", ()) {
            Ok(FetchResponse { value }) => Ok(Some(value)),
            Err(_) => Ok(None),
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct StoreRequest {
    pub value: String,
}

impl<R: Runtime> AndroidKeystore<R> {
    pub fn store(&self, payload: StoreRequest) -> Result<()> {
        self.0.run_mobile_plugin("store", payload)
    }
}
