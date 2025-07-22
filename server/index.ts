import { serve } from 'bun';
import { config } from 'dotenv';

import { exchangeCodeForToken, fetchAccountData } from './lib/TrueLayer';

config({ path: '../.env' }); // load .env from repo root (relative to server dir)

console.log('Starting server...');

let accessToken: string | null = null; // XXX

serve({
    port: 3000,
    async fetch(req) {
        console.log(`Received request: ${req.method} ${req.url}`);

        const url = new URL(req.url, `http://${req.headers.get("host") || "localhost:3000"}`);

        // AUTH FLOW
        if (url.pathname === '/callback') {

            const code = url.searchParams.get('code');
            if (!code) return new Response('Missing code', { status: 400 });

            try {
                const data = await exchangeCodeForToken(code);
                console.log('Access token response:', data);
                accessToken = data.access_token;

                return new Response(null, {
                    status: 302,
                    headers: {
                        Location: 'http://localhost:3180/martyn-llewelyn/',
                    },
                });
            } catch {
                return new Response('Error fetching access token', { status: 500 });
            }

        }
        else if (url.pathname === '/truelayer/accounts') {
            if (!accessToken) {
                console.error('No access token available');
                return new Response(JSON.stringify({ error: 'not_connected' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            const data = await fetchAccountData(accessToken);
            console.log(data);
            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // HEALTH CHECK
        return new Response('Server is running');
    },
});
