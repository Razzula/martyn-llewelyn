#![allow(non_snake_case)]
#![allow(unused_parens)]

use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

#[cfg(target_os = "android")]
pub mod mobile;

#[cfg(target_os = "android")]
use mobile::AndroidKeystore;

// extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the keystore APIs.
#[cfg(target_os = "android")]
pub trait AndroidKeystoreExt<R: Runtime> {
    fn androidKeystore(&self) -> &AndroidKeystore<R>;
}

#[cfg(target_os = "android")]
impl<R: Runtime, T: Manager<R>> AndroidKeystoreExt<R> for T {
    fn androidKeystore(&self) -> &AndroidKeystore<R> {
        self.state::<AndroidKeystore<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("android-keystore")
        .setup(|app, api| {

            #[cfg(target_os = "android")]
            {
                let keystore = mobile::init(app, api)?;
                app.manage(keystore);
            }

            Ok(())
        })
        .build()
}
