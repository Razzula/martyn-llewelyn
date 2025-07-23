import { useEffect, useState } from 'react';

import { fetchAccountData, getTrueLayerAuthURL } from './lib/TrueLayer.ts';
import type { TrueLayerAccount } from './types/TrueLayer.ts';

import './styles/App.css';

function App() {

    const [redirectURI, setRedirectURI] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<(null | TrueLayerAccount[])>(null);

    const [authToken, setAuthToken] = useState<string | null>(null);

    useEffect(() => {

        getTrueLayerAuthURL().then(url => {
            setRedirectURI(url);
        });

        const accessToken = sessionStorage.getItem('accessToken');
        if (accessToken) {
            setAuthToken(accessToken);
        }

    }, []);

    useEffect(() => {
        if (authToken) {
            setAccounts(null); // reset accounts while fetching
            fetchAccountData(authToken)
                .then(data => {
                    console.log('Fetched accounts:', data);
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
            
            { redirectURI &&
                <a href={redirectURI}>Test!</a>
            }
        </>
    );
}

export default App;
