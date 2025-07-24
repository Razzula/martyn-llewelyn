import { useEffect, useState } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { open } from '@tauri-apps/plugin-shell';

import { fetchAccountData, getTrueLayerAuthURL, handleTokenExchange } from './lib/TrueLayer.ts';
import type { TrueLayerAccount } from './types/TrueLayer.ts';

import './styles/App.css';

const isTauri = !!(window as any).__TAURI_INTERNALS__;

function App() {

    const [redirectURI, setRedirectURI] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<(null | TrueLayerAccount[])>(null);

    const [authToken, setAuthToken] = useState<string | null>(null);

    useEffect(() => {
        // HANDLE SETUP
        if (isTauri) {
            // redirection to TrueLayer is only needed in Tauri
            getTrueLayerAuthURL().then(url => {
                setRedirectURI(url);
            });
        }

        // XXX
        const accessToken = sessionStorage.getItem('accessToken');
        if (accessToken) {
            setAuthToken(accessToken);
        }

    }, []);

    useEffect(() => {
        // LISTEN FOR DEEP LINKS
        let unlisten: (() => void) | undefined;

        onOpenUrl((urls) => {
            // respond to deep link passed from OS
            const callbackUrl = new URL(urls[0]);
            const code = callbackUrl.searchParams.get('code');

            // trigger token exchange, navigate, etc.
            if (code) {
                handleTokenExchange(code)
                    .then(() => {
                        setAuthToken(sessionStorage.getItem('accessToken'));
                    })
                    .catch(err => {
                        console.error('Token exchange failed:', err);
                    });
            }

        }).then((off) => {
            unlisten = off;
        });

        return () => {
            // cleanup listener
            if (unlisten) unlisten();
        };
    }, []);

    useEffect(() => {
        // FETCH ACCOUNTS
        if (authToken) {
            setAccounts(null); // reset accounts while fetching
            fetchAccountData(authToken)
                .then(data => {
                    setAccounts(data);
                })
                .catch(err => {
                    console.error('Failed to fetch accounts:', err);
                    setAccounts(null);
                }
                );
        }
        else {
            setAccounts([]);
        }
    }, [authToken]);

    async function openInBrowser(uri: string | null) {
        if (uri) {
            await open(uri);
        }
    }

    return (
        <>
            {accounts ? (accounts.length > 0 ? (
                <ul>
                    {accounts.map(account => (
                        <li key={account.account_id}>
                            {account.display_name} - {account.currency}
                        </li>
                    ))}
                </ul>

            ) : (
                <p>No accounts found</p>
            )) : (
                <p>Loading...</p>
            )}

            {redirectURI &&
                <button onClick={() => openInBrowser(redirectURI)}>Connect with Bank</button>
            }
        </>
    );
}

export default App;
