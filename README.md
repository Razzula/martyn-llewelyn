# martyn-llewelyn

<center>
    <img src="./app/public/MasterBagel.png" alt="Martyn Llewelyn Logo" width="64">
    <h1>Master Bagel</h1>
</center>

## Pre-Requisites
`./.env`
```py
VITE_TRUELAYER_ENV=... # 'sandbox' for DEV, any other non-null for PROD
VITE_TRUELAYER_CLIENT_ID=...
VITE_TRUELAYER_REDIRECT_URI=bagel://callback

TRUELAYER_CLIENT_SECRET=... # not exposed to frontend
```
See https://console.truelayer.com/

## Installation
```bash
cd ./app
bun install
```

## Usage
```bash
cd ./app
bun tauri dev
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
