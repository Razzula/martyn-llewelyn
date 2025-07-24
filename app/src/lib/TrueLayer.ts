import { invoke } from "@tauri-apps/api/core";

import { TrueLayerAccessTokenResponse, TrueLayerAccount } from "../types/TrueLayer";
import { generateCodeChallenge, generateCodeVerifier } from "../utils/PKCE";

export async function getTrueLayerAuthURL() {

    const env = import.meta.env.VITE_TRUELAYER_ENV || 'sandbox';

    const authHost = (env === 'sandbox')
        ? 'https://auth.truelayer-sandbox.com'
        : 'https://auth.truelayer.com';

    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

    sessionStorage.setItem('code_verifier', verifier); // store the code verifier for later use

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: import.meta.env.VITE_TRUELAYER_CLIENT_ID,
        redirect_uri: import.meta.env.VITE_TRUELAYER_REDIRECT_URI,
        scope: 'info accounts balance transactions',
        state: crypto.randomUUID(),
        nonce: crypto.randomUUID(),
        code_challenge: challenge,
        code_challenge_method: 'S256',
        enable_mock: (env === 'sandbox').toString(),
        providers: (env === 'sandbox') ? 'uk-cs-mock' : '', // mock UK bank
        // providers: 'ob-natwest ob-first-direct',
    });

    const redirectURI = `${authHost}/?${params.toString()}`;
    return redirectURI;
}

export async function fetchAccountData(accessToken: string): Promise<TrueLayerAccount[]> {
    const res = JSON.parse(
        await invoke('fetchAccountData', { accessToken })
    );
    return res.results || [];
}

export async function handleTokenExchange(code: string) {
    const verifier = sessionStorage.getItem('code_verifier');

    const tokens: TrueLayerAccessTokenResponse = JSON.parse(
        await invoke('exchangeToken', { code, verifier })
    );

    // store/access tokens as needed
    sessionStorage.setItem('accessToken', tokens.access_token);
}
