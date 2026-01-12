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
