import { useEffect, useState } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { openUrl } from '@tauri-apps/plugin-opener';
import { invoke } from "@tauri-apps/api/core";

import { fetchAccountBalance, fetchAccountsData, fetchCardBalance, fetchCardsData, getTrueLayerAuthURL, handleTokenExchange } from './lib/TrueLayer.ts';
import type { TrueLayerAccount, TrueLayerAccountBalance, TrueLayerCard, TrueLayerCardBalance } from './types/TrueLayer.ts';

import './styles/App.css';

const isTauri = !!(window as any).__TAURI_INTERNALS__;

enum ResponseState {
    LOADING = 'LOADING',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
}

function App() {

    const [redirectURI, setRedirectURI] = useState<string | null>(null);

    const [accounts, setAccounts] = useState<Record<string, (TrueLayerAccount | TrueLayerCard)>>({});
    const [accountsState, setAccountsState] = useState<ResponseState | null>(null);

    const [walletToken, setwalletToken] = useState<string | null>(null);

    useEffect(() => {
        // HANDLE SETUP
        if (isTauri) {
            // redirection to TrueLayer is only needed in Tauri
            getTrueLayerAuthURL().then(url => {
                setRedirectURI(url);
            });
        }

        // XXX
        invoke('loadwalletTokens')
            .then((tokens: string[]) => {
                if (tokens.length > 0) {
                    // use the first token for now
                    setwalletToken(tokens[0]);
                }
            })
            .catch(err => {
                console.error('Failed to load wallet tokens:', err);
            });

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
                        setwalletToken(sessionStorage.getItem('walletToken'));
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
        if (walletToken) {
            setAccounts({});
            setAccountsState(ResponseState.LOADING); // reset accounts while fetching

            fetchAccountsData(walletToken)
                .then(data => {
                    data.forEach(account => {
                        addAccount(account);
                    });
                    if (accountsState !== ResponseState.ERROR) {
                        setAccountsState(ResponseState.SUCCESS);
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch accounts:', err);
                    setAccountsState(ResponseState.ERROR);
                });

            fetchCardsData(walletToken)
                .then(data => {
                    data.forEach(account => {
                        addAccount(account);
                    });
                })
                .catch(err => {
                    console.error('Failed to fetch cards:', err);
                    setAccountsState(ResponseState.ERROR);
                });
        }
        else {
            setAccounts({});
        }
    }, [walletToken]);

    useEffect(() => {
        // FETCH ACCOUNT BALANCES
        if (!walletToken || !accounts) return;

        if (Object.keys(accounts).length > 0) {

            Object.entries(accounts).forEach(([accountId, account]: [string, TrueLayerAccount | TrueLayerCard]) => {
                if (account.balance) {
                    // already has balance, skip fetching
                    return;
                }

                const isCard = account.hasOwnProperty('card_network');

                if (!isCard) {
                    fetchAccountBalance(walletToken, accountId)
                        .then(data => {
                            if (data) {
                                updateAccountBalance(accountId, data[0]);
                            }
                        })
                        .catch(err => {
                            console.error(`Failed to fetch balance for account ${accountId}:`, err);
                            setAccountsState(ResponseState.ERROR);
                        });
                }
                else {
                    fetchCardBalance(walletToken, accountId)
                        .then(data => {
                            if (data) {
                                updateAccountBalance(accountId, data[0]);
                            }
                        })
                        .catch(err => {
                            console.error(`Failed to fetch balance for card ${accountId}:`, err);
                            setAccountsState(ResponseState.ERROR);
                        });
                }
            });
        }
    }, [accounts, walletToken]);

    async function openInBrowser(uri: string | null) {
        if (uri) {
            await openUrl(uri);
        }
    }

    function addAccount(account: TrueLayerAccount | TrueLayerCard) {
        if (accounts) {
            setAccounts(prev => ({
                ...prev,
                [account.account_id]: account,
            }));
        }
        else {
            // if accounts is null, initialize it with the new account
            setAccounts({ [account.account_id]: account });
        }
    }

    function updateAccountBalance(accountId: string, balance: TrueLayerAccountBalance | TrueLayerCardBalance) {
        if (accounts && accounts[accountId]) {
            setAccounts(prev => ({
                ...prev,
                [accountId]: {
                    ...prev[accountId],
                    balance,
                },
            }));
        }
    }

    return (
        <>

            {accountsState === ResponseState.ERROR &&
                <div className='column'>
                    <img
                        src='./ConfusedBagel-alt.png'
                        alt='Master Bagel is confused...'
                        style={{ width: '100px', height: '100px' }}
                    />
                    <h4>An error occurred!</h4>
                </div>
            }
            {accountsState === ResponseState.LOADING &&
                <div className='column'>
                    <img
                        src='./ConfusedBagel-alt.png'
                        alt='Master Bagel is confused...'
                        style={{ width: '100px', height: '100px' }}
                    />
                    <h4>Loading...</h4>
                    <div className='spinnerOverlay'>
                        <div className='spinner' />
                    </div>
                </div>
            }
            {accountsState === ResponseState.SUCCESS &&
                <div className='column'>
                    <img
                        src='./MasterBagel.png'
                        alt='Master Bagel'
                        style={{ width: '100px', height: '100px' }}
                    />
                    {/* <h4>Your Accounts</h4> */}
                </div>
            }
            {accountsState === null &&
                <div className='column'>
                    <img
                        src='./ConfusedBagel.png'
                        alt='Master Bagel is confused...'
                        style={{ width: '100px', height: '100px' }}
                    />
                </div>
            }

            {
                Object.keys(accounts).length > 0 ? (
                    // POPULATED RECORD
                    <table className='accounts'>
                        <tbody>
                            {Object.entries(accounts).sort().map(([accountId, account]) => {
                                const isCard = 'card_network' in account;

                                return (
                                    <tr key={accountId}>
                                        <td>
                                            <img
                                                className='bankLogo'
                                                src={!isCard ? account.provider.logo_uri : '/serenity.png'}
                                                alt={`${account.display_name} Logo`}
                                                style={{ objectFit: 'contain', flexShrink: 0 }}
                                            />
                                        </td>
                                        {/* <td>{!isCard ? account.provider.display_name : account.provider.provider_id}</td> */}
                                        <td>
                                            {isCard
                                                ? "**** **** **** " + (account as TrueLayerCard).partial_card_number
                                                : (account as TrueLayerAccount).account_number.number}
                                        </td>
                                        <td>{account.display_name}</td>
                                        <td>
                                            {'balance' in account && account.balance ? (
                                                <>
                                                    {account.balance.currency} {account.balance.current.toFixed(2)}
                                                </>
                                            ) : (
                                                <div className='spinner' style={{ width: '1rem', height: '1rem' }} />
                                            )}
                                        </td>
                                        <td>
                                            {isCard
                                                ? (account as TrueLayerCard).card_type
                                                : (account as TrueLayerAccount).account_type}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    // EMPTY RECORD
                    <div className='column'>
                        <h4>No accounts found</h4>
                    </div>
                )
            }

            {redirectURI &&
                <div className='column'>
                    <button
                        className='column'
                        onClick={() => openInBrowser(redirectURI)}
                    >
                        <img
                            src="./TrueLayer/Banks/BankLogos_UnitedKingdom_5icons.svg"
                            alt="All Major UK Banks Supported"
                        />
                        <span>Connect with {Object.values(accounts)?.length === 0 ? 'your' : 'another'} Bank</span>
                    </button>
                    <div className='column footend mini'>
                        <span>Powered by</span>
                        <div className='row'>
                            <img
                                className='providerLogo clickable'
                                src="./TrueLayer/TrueLayerLogo/TrueLayer-LOGO-charcoal-transp-horizontal.svg"
                                alt="TrueLayer"
                                onClick={() => openInBrowser('https://truelayer.com')}
                            />
                            <div className="verticalSeparator" />
                            <img
                                className='providerLogo clickable'
                                src="./OpenBanking-Logo.svg"
                                alt="Open Banking"
                                onClick={() => openInBrowser('https://www.openbanking.org.uk')}
                            />
                        </div>
                    </div>
                </div>
            }
        </>
    );
}

export default App;
