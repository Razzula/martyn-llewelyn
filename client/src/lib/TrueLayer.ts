
export function getTrueLayerAuthURL() {

    const env = import.meta.env.VITE_TRUELAYER_ENV || 'sandbox';

    const authHost = (env === 'sandbox')
        ? 'https://auth.truelayer-sandbox.com'
        : 'https://auth.truelayer.com';

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: import.meta.env.VITE_TRUELAYER_CLIENT_ID,
        redirect_uri: import.meta.env.VITE_TRUELAYER_REDIRECT_URI,
        scope: 'info accounts balance transactions',
        state: crypto.randomUUID(),
        nonce: crypto.randomUUID(),
        enable_mock: (env === 'sandbox').toString(),
        providers: (env === 'sandbox') ? 'uk-cs-mock' : '', // mock UK bank
        // providers: 'ob-natwest ob-first-direct',
    });
    
    const redirectURI = `${authHost}/?${params.toString()}`;
    return redirectURI;
}
