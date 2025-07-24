import { invoke } from "@tauri-apps/api/core";

import { TrueLayerAccount, TrueLayerAccountBalance, TrueLayerCard, TrueLayerCardBalance, TrueLayerUser } from "../types/TrueLayer";
import { generateCodeChallenge, generateCodeVerifier } from "../utils/PKCE";

export async function getTrueLayerAuthURL() {

    const env = import.meta.env.VITE_TRUELAYER_ENV || 'sandbox';

    const authHost = (env === 'sandbox')
        ? 'https://auth.truelayer-sandbox.com'
        : 'https://auth.truelayer.com';

    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

    sessionStorage.setItem('codeVerifier', verifier); // store the code verifier for later use

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: import.meta.env.VITE_TRUELAYER_CLIENT_ID,
        redirect_uri: import.meta.env.VITE_TRUELAYER_REDIRECT_URI,
        scope: 'info accounts cards balance transactions offline_access',
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

export async function handleTokenExchange(code: string) {
    const verifier = sessionStorage.getItem('codeVerifier');

    const walletToken: string = await invoke('exchangeToken', { code, verifier });

    // store/access tokens as needed
    sessionStorage.setItem('walletToken', walletToken);
}

export async function fetchUserData(walletToken: string): Promise<TrueLayerUser | null> {
    const res = JSON.parse(
        await invoke('fetchUserData', { walletToken })
    );
    return res.results || null;
}

export async function fetchAccountsData(walletToken: string): Promise<TrueLayerAccount[]> {
    const res = JSON.parse(
        await invoke('fetchAccountsData', { walletToken })
    );
    return res.results || [];
}

export async function fetchCardsData(walletToken: string): Promise<TrueLayerCard[]> {
    const res = JSON.parse(
        await invoke('fetchCardsData', { walletToken })
    );
    return res.results || [];
}

export async function fetchAccountBalance(walletToken: string, accountId: string): Promise<TrueLayerAccountBalance[]> {
    const res = JSON.parse(
        await invoke('fetchAccountBalance', { walletToken, accountId })
    );
    return res.results || [];
}

export async function fetchCardBalance(walletToken: string, cardId: string): Promise<TrueLayerCardBalance[]> {
    const res = JSON.parse(
        await invoke('fetchCardBalance', { walletToken, cardId })
    );
    return res.results || [];
}
