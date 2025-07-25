import { useEffect, useState } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { openUrl } from '@tauri-apps/plugin-opener';
import { invoke } from "@tauri-apps/api/core";

import { fetchAccountBalance, fetchAccountsData, fetchCardBalance, fetchCardsData, getTrueLayerAuthURL, handleTokenExchange } from './lib/TrueLayer.ts';
import type { TrueLayerAccount, TrueLayerAccountBalance, TrueLayerCard, TrueLayerCardBalance } from './types/TrueLayer.ts';

import './styles/App.css';
import { BankAccount, BankCard } from './types/Bagel.ts';

const isTauri = !!(window as any).__TAURI_INTERNALS__;

enum ResponseState {
    LOADING = 'LOADING',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
}

function App() {

    const [redirectURI, setRedirectURI] = useState<string | null>(null);

    const [accounts, setAccounts] = useState<Record<string, (BankAccount | BankCard)>>({});
    const [accountsState, setAccountsState] = useState<ResponseState | null>(null);

    const [walletTokens, setWalletTokens] = useState<string[]>([]);

    useEffect(() => {
        // HANDLE SETUP
        if (isTauri) {
            // redirection to TrueLayer is only needed in Tauri
            getTrueLayerAuthURL().then(url => {
                setRedirectURI(url);
            });
        }

        // XXX
        invoke('loadWalletTokens')
            .then((tokens: string[]) => {
                if (tokens.length > 0) {
                    // use the first token for now
                    setWalletTokens(tokens);
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
                        const token = sessionStorage.getItem('walletToken');
                        // XXX
                        if (!token) {
                            console.error('No wallet token found after token exchange');
                            return;
                        }
                        setWalletTokens([token]); // XXX
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
        if (walletTokens.length > 0) {
            setAccounts({});
            setAccountsState(ResponseState.LOADING); // reset accounts while fetching

            walletTokens.forEach(token => {
                fetchAccountsData(token)
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

                fetchCardsData(token)
                    .then(data => {
                        data.forEach(account => {
                            addAccount(account);
                        });
                    })
                    .catch(err => {
                        console.error('Failed to fetch cards:', err);
                        setAccountsState(ResponseState.ERROR);
                    });
            });
        }
        else {
            setAccounts({});
        }
    }, [walletTokens]);

    useEffect(() => {
        // FETCH ACCOUNT BALANCES
        if (walletTokens.length === 0 || !accounts) return;

        if (Object.keys(accounts).length > 0) {

            Object.entries(accounts).forEach(([accountId, account]: [string, BankAccount | BankCard]) => {
                if (account.balance) {
                    // already has balance, skip fetching
                    return;
                }

                const isCard = account.hasOwnProperty('card_network');
                const walletToken = account.walletToken || walletTokens[0]; // XXX: use the first token if not specified

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
    }, [accounts, walletTokens]);

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
        <div id='app'>

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

            {/* { // DEBUG
                walletTokens.length > 0 ? (
                    <div>
                        {
                            walletTokens.map(token => (
                                <div key={token}>    
                                    <h4>{token}</h4>
                                </div>
                            ))
                        }
                    </div>
                ) : (
                    <div>
                        <p>Wallet is empty!!!</p>
                    </div>
                )
            } */}

            {
                Object.keys(accounts).length > 0 ? (
                    // POPULATED RECORD
                    <div className='accountsGrid'>
                        {Object.entries(accounts).sort().map(([accountId, account]) => {

                            const isCard = 'card_network' in account;

                            const balance = 'balance' in account ? account.balance : null;
                            const available = balance?.available ?? null;
                            const currency = balance?.currency === 'GBP' ? '£' : balance?.currency;
                            const displayBalance = balance ? `${currency}\u00A0${balance.current.toFixed(2)}` : null;
                            const displayAvailable = available ? `${currency}\u00A0${available.toFixed(2)}` : null;

                            return (
                                <div className='accountCard' key={accountId}>
                                    <div className='header'>
                                        <div className='row'>
                                            <img
                                                className='bankLogo'
                                                src={!isCard ? account.provider.logo_uri : '/serenity.png'}
                                                alt={`${account.display_name} Logo`}
                                            />
                                            <div className='verticalSeparator' />
                                            <div className='name'>{account.display_name}</div>
                                        </div>
                                        <div className='balance'>{displayAvailable || <div className='spinner' />}</div>
                                    </div>
                                    <div className='body'>
                                        <div className='type'>
                                            {isCard
                                                ? (account as TrueLayerCard).card_type
                                                : (account as TrueLayerAccount).account_type}
                                        </div>
                                        <div className='number'>
                                            {isCard
                                                ? "**** **** **** " + (account as TrueLayerCard).partial_card_number
                                                : (account as TrueLayerAccount).account_number.number}
                                        </div>
                                        {displayAvailable && (
                                            <div className='available'>({displayBalance})</div>
                                        )}
                                        <div className='interestRate'>TODO: Interest Rate</div>
                                        <div className='delta'>TODO: Delta</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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

        </div>
    );
}

export default App;
