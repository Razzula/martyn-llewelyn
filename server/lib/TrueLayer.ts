import type { TrueLayerAccessTokenResponse, TrueLayerAccount } from '@shared/types/TrueLayer';

function getTrueLayerAuthURL() {
    const env = import.meta.env.VITE_TRUELAYER_ENV || 'sandbox';
    return (env === 'sandbox')
        ? 'https://auth.truelayer-sandbox.com'
        : 'https://auth.truelayer.com';
}

function getTrueLayerAPIURL() {
    const env = import.meta.env.VITE_TRUELAYER_ENV || 'sandbox';
    return (env === 'sandbox')
        ? 'https://api.truelayer-sandbox.com'
        : 'https://api.truelayer.com';
}

export async function exchangeCodeForToken(code: string): Promise<TrueLayerAccessTokenResponse> {
    const res = await fetch(`${getTrueLayerAuthURL()}/connect/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.VITE_TRUELAYER_REDIRECT_URI!,
            client_id: process.env.VITE_TRUELAYER_CLIENT_ID!,
            client_secret: process.env.TRUELAYER_CLIENT_SECRET!,
        }),
    });

    const data = await res.json();

    if (!res.ok) {
        console.error('Error fetching access token:', data);
        throw new Error('Failed to exchange token');
    }

    return data as TrueLayerAccessTokenResponse;
}

export async function fetchAccountData(accessToken: string): Promise<TrueLayerAccount[]> {
    const res = await fetch(`${getTrueLayerAPIURL()}/data/v1/accounts`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (res.status === 401) {
        throw new Error('unauthorised');
    }

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`TrueLayer API error: ${err}`);
    }

    const { results } = await res.json() as { results: TrueLayerAccount[] };
    return results;
}
