import { useEffect, useState } from 'react';

import { getTrueLayerAuthURL } from './lib/TrueLayer.ts';
import type { TrueLayerAccount } from '@shared/types/TrueLayer';

import './styles/App.css';

function App() {

    const [accounts, setAccounts] = useState<(null | TrueLayerAccount[])>(null);

    useEffect(() => {
        fetch('/martyn-llewelyn/truelayer/accounts')
            .then(res => res.json())
            .then(data => {
                if (data.error === 'not_connected') {
                    // prompt user to connect bank
                    console.error('User not connected');
                    setAccounts([]);
                } else {
                    // set account data
                    console.log('Account data:', data);
                    setAccounts(data);
                }
            })
            .catch(err => {
                console.error('Failed to fetch accounts:', err);
            });
    }, []);

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
            <a href={getTrueLayerAuthURL()}>Test!</a>
        </>
    );
}

export default App;
