<center>
    <img src="./app/public/MasterBagel.png" alt="Martyn Llewelyn Logo" width="64">
    <h1>Master Bagel</h1>
    <h4><a href='https://razzula.github.io/martyn-llewelyn/'>io.github.razzula.martyn-llewelyn</a></h4>
</center>

## Setup
### Secrets
```py
# exposed to frontend
VITE_TRUELAYER_ENV=... # 'sandbox' for DEV, any other non-null for PROD
VITE_TRUELAYER_CLIENT_ID=...
VITE_TRUELAYER_REDIRECT_URI=bagel://callback # or bagel-dev://callback

# not exposed to frontend
TRUELAYER_CLIENT_SECRET=...

SIGNING_STORE=keystore.jks # relative to repo root
SIGNING_STORE_PASSWORD=...
SIGNING_KEY_ALIAS=...
SIGNING_KEY_PASSWORD=...
```
See https://console.truelayer.com/ for TrueLayer config, and see below for information on signing.

### Bun
- [Bun](https://bun.sh/docs/installation)

### Tauri
- [Tauri OS Dependencies](https://tauri.app/start/prerequisites/)
- [Rust](https://tauri.app/start/prerequisites/#rust)
- (Optional) [Android](https://tauri.app/start/prerequisites/#android)
  - [`adb`](https://developer.android.com/tools/adb) recommended

## Installation
```bash
cd ./app
bun install
```

## Usage
```bash
cd ./app
bun dev
bun dev-apk # for Android
```

## Building
```bash
cd ./app
bun run build
bun build-apk # for Android
```

### Signing
In order to install builds onto secure systems (such as an Android device), a signed certificate will be required.

Ensure you have a keystore setup such as `./keystore.jks`.

```bash
keytool -genkeypair \
  -v \
  -keystore keystore.jks \
  -alias CHANGE_ME \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass CHANGE_ME \
  -keypass CHANGE_ME
```

#### Android
Gradle will automatically sign the APK using the keystore and secrets provided in the `.env` file.

## Installation
### Android
```bash
adb install ./app/src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
```

## License

This project includes emoji images sourced from SerenityOS, which are licensed under the BSD 2-Clause License.

### Emoji License Information

The emoji images are licensed under the BSD 2-Clause License:

- Copyright (c) 2018-2023, the SerenityOS developers.
- Copyright (c) 2022-2023, Gegga Thor <xexxa@serenityos.org>
- Copyright (c) 2023, Linus Groh.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions, and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions, and the following disclaimer in the documentation and/or other materials provided with the distribution.

The emojis are provided "as is" without any express or implied warranties. See the [LICENSE.md](LICENSE.md) file for more details.
