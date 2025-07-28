import { useEffect, useState } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { openUrl } from '@tauri-apps/plugin-opener';
import { platform } from '@tauri-apps/plugin-os';
import { invoke } from '@tauri-apps/api/core';
import { authenticate } from '@tauri-apps/plugin-biometric';
// import { retrieve, store } from "@impierce/tauri-plugin-keystore";

import { fetchAccountBalance, fetchAccountsData, fetchCardBalance, fetchCardsData, getTrueLayerAuthURL, handleTokenExchange } from './lib/TrueLayer.ts';
import type { TrueLayerAccountBalance, TrueLayerCardBalance } from './types/TrueLayer.ts';

import './styles/App.css';
import { BankAccount, BankCard, User } from './types/Bagel.ts';
import { ResponsiveModal } from './components/common/ResponsiveModal.tsx';

const isTauri = !!(window as any).__TAURI_INTERNALS__;

enum ResponseState {
    LOADING = 'LOADING',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
}

function App() {

    const [users, setUsers] = useState<User[] | null>(null);

    const [accounts, setAccounts] = useState<Record<string, (BankAccount | BankCard)>>({});
    const [accountsState, setAccountsState] = useState<ResponseState | null>(null);

    const [walletTokens, setWalletTokens] = useState<string[]>([]);

    const [openSelectUser, setOpenSelectUser] = useState<any | null>(null); // holds a function to redirect after user selection
    const [openEditUser, setOpenEditUser] = useState<((userID: string) => void) | null>(null); // holds a function to redirect after user creation
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        // HANDLE SETUP

        // LOAD USERS
        invoke('loadJSON', { filename: 'users.json' })
            .then((raw: unknown) => {
                const data: User[] = JSON.parse(raw as string);
                setUsers(data);
            })
            .catch(() => {
                setUsers([]);
            });

        // XXX
        invoke('loadWalletTokens')
            .then((tokens: unknown) => {
                const walletTokensArr = tokens as string[];
                if (walletTokensArr.length > 0) {
                    // use the first token for now
                    setWalletTokens(walletTokensArr);
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
            const state = callbackUrl.searchParams.get('state');

            // trigger token exchange, navigate, etc.
            if (code && state) {
                handleTokenExchange(code, state)
                    .then((walletToken: string) => {
                        setWalletTokens(prev => [...prev, walletToken]);
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
        // SAVE USERS
        if (users !== null) {
            saveUsers();
        }
    }, [users])

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

    function redirectToTrueLayer(userID: string) {
        if (userID !== null) {
            getTrueLayerAuthURL(userID)
                .then(redirectURI => openInBrowser(redirectURI));
        }
    }

    function addAccount(account: BankAccount | BankCard) {
        if (accounts) {
            setAccounts(prev => ({
                ...prev,
                [account.account_id]: account,
            }));
        }
        else {
            // if accounts is null, initialize it with the new account
            setAccounts({ [account.account_id]: account } as Record<string, BankAccount | BankCard>);
        }
    }

    function updateAccountBalance(accountID: string, balance: TrueLayerAccountBalance | TrueLayerCardBalance) {
        if (accounts && accounts[accountID]) {
            setAccounts(prev => {
                const account = prev[accountID];
                if ('card_network' in account) {
                    // BankCard
                    return {
                        ...prev,
                        [accountID]: {
                            ...account,
                            balance: balance as TrueLayerCardBalance,
                        },
                    };
                } else {
                    // BankAccount
                    return {
                        ...prev,
                        [accountID]: {
                            ...account,
                            balance: balance as TrueLayerAccountBalance,
                        },
                    };
                }
            });
        }
    }

    function startLinkAccount() {
        if (isTauri) {
            const redirect = (userID: string) => redirectToTrueLayer(userID);
            if (users === null || users.length === 0) {
                // if no users, prompt to add a user
                setOpenEditUser(() => redirect);
            }
            else if (users.length === 1) {
                // if only one user, select them automatically
                redirect(users[0].id);
            }
            else {
                // if multiple users, prompt to select one
                setOpenSelectUser(() => redirect);
            }
        }
    }

    function updateOrAddUser(userName: string, userID?: string) {
        if (users !== null) {
            if (userID) {
                // update existing user
                setUsers(prev => prev ? prev.map(user => user.id === userID ? { ...user, name: userName } : user) : []);
            }
            else {
                // add new user
                setUsers(prev => [...(prev ?? []), { id: crypto.randomUUID(), name: userName }]);
            }
        }
    }

    function deleteUser(userID: string) {
        if (users !== null) {
            if (userID) {
                setUsers(prev => (prev ? prev.filter(user => user.id !== userID) : []));
            }
        }
    }

    function saveUsers() {
        if (users !== null) {
            invoke('saveJSON', { filename: 'users.json', json: JSON.stringify(users) })
                .catch(err => {
                    console.error('Failed to save users:', err);
                });
        }
    }

    return (
        <div id='app'>

            {/* USER SELECTION MODAL */}
            <ResponsiveModal title='Whose bank do you want to link with?'
                open={openSelectUser !== null}
                onClose={() => setOpenSelectUser(false)}
            >
                <div className='userSelection'>
                    <p>Bagel will group accounts and cards from this bank connection under the selected profile.</p>

                    <div className='column'>
                        <div className='row'>
                            {users &&
                                users.map(user => (
                                    <button key={user.id}
                                        onClick={() => {
                                            if (openSelectUser) {
                                                openSelectUser(user.id); // call the redirect function
                                            }
                                            setOpenSelectUser(null); // close modal
                                        }}
                                    >
                                        {user.name}
                                    </button>
                                ))
                            }
                            {/* <button onClick={createNewProfile}>+ Add someone new</button> */}
                        </div>
                        <p className='small centre'><i>This is for display purposes only, and does not impact authentication.</i></p>
                    </div>
                </div>
            </ResponsiveModal>

            {/* USER CREATION MODAL */}
            <ResponsiveModal title={selectedUser === null ? 'Add a new user' : 'Edit user'}
                open={openEditUser !== null}
                onClose={() => {
                    setOpenEditUser(null);
                    setSelectedUser(null);
                }}
            >
                <UserEditPanel
                    user={selectedUser}
                    updateOrAddUser={updateOrAddUser}
                    deleteUser={deleteUser}
                    onClose={openEditUser}
                    close={() => {
                        setOpenEditUser(null);
                        setSelectedUser(null);
                    }}
                />
            </ResponsiveModal>

            <div className='header row'>

                {/* USER BUTTONS */}
                <div className='row left'>
                    {users &&
                        users.map((user, index) => (
                            <button
                                key={index}
                                className='userButton'
                                onClick={() => {
                                    setOpenEditUser(() => { });
                                    setSelectedUser(user);
                                }}
                            >
                                {user.name}
                            </button>
                        ))
                    }
                    <button
                        className='userButton'
                        onClick={() => setOpenEditUser(() => { })}
                    >
                        {users && users.length > 0 ? '+' : 'Setup User'}
                    </button>
                </div>

                {/* BAGEL ICON */}
                <div className='centre'>
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
                </div>

            </div>

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
                            const displayBalance = balance ? `${currency}\u00A0${isCard ? '-' : ''}${balance.current.toFixed(2)}` : null;
                            const displayAvailable = available ? `${currency}\u00A0${available.toFixed(2)}` : null;

                            const user = users?.find(user => user.id === account.user);

                            return (
                                <div className='accountCard' key={accountId}>
                                    <div className='accountHeader'>
                                        <div className='row'>
                                            <img
                                                className='bankLogo'
                                                src={!isCard ? account.provider.logo_uri : '/serenity.png'}
                                                alt={`${account.display_name} Logo`}
                                            />
                                            <div className='verticalSeparator' />
                                            <div className='name'>{account.display_name}</div>
                                        </div>
                                        <div className='balance'>
                                            {
                                                (!isCard ? displayAvailable : displayBalance)
                                                || <div className='spinner' />
                                            }
                                        </div>
                                    </div>
                                    <div className='body'>
                                        <div className='user'>
                                            {user?.name ?? account.user}
                                        </div>
                                        <div className='type'>
                                            {isCard
                                                ? (account as BankCard).card_type
                                                : (account as BankAccount).account_type}
                                        </div>
                                        <div className='number'>
                                            {isCard
                                                ? ((account as BankCard).card_network === 'VISA' ? 4 : 5) + '*** **** **** ' + (account as BankCard).partial_card_number
                                                : (account as BankAccount).account_number.number}
                                        </div>
                                        {displayAvailable && (
                                            <div className='available'>({!isCard ? displayBalance : displayAvailable})</div>
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

            {/* CONNECT ACCOUNT */}
            {/* TrueLayer */}
            <div className='column' style={{ paddingBottom: '2rem' }}>
                <div className='row'>
                    <button
                        className='column'
                        onClick={() => startLinkAccount()}
                        disabled={!isTauri}
                    >
                        <img
                            src='./TrueLayer/Banks/BankLogos_UnitedKingdom_5icons.svg'
                            alt='All Major UK Banks Supported'
                        />
                        <span>Connect with {Object.values(accounts)?.length === 0 ? 'your' : 'another'} Bank</span>
                    </button>
                    <button
                        className='column'
                    >
                        <span>Manual</span>
                    </button>
                </div>

                <div className='column footend mini'>
                    <span>Powered by</span>
                    <div className='row'>
                        <img
                            className='providerLogo clickable'
                            src='./TrueLayer/TrueLayerLogo/TrueLayer-LOGO-charcoal-transp-horizontal.svg'
                            alt='TrueLayer'
                            onClick={() => openInBrowser('https://truelayer.com')}
                        />
                        <div className='verticalSeparator' />
                        <img
                            className='providerLogo clickable'
                            src='./OpenBanking-Logo.svg'
                            alt='Open Banking'
                            onClick={() => openInBrowser('https://www.openbanking.org.uk')}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}

export default App;

type UserEditPanelProps = {
    user: User | null;
    updateOrAddUser: (userName: string, userID?: string) => void;
    deleteUser: (userID: string) => void;
    onClose: ((userID: string) => void) | null;
    close: () => void;
};

function UserEditPanel({ user, updateOrAddUser, deleteUser, onClose, close }: UserEditPanelProps) {

    const [userID, setUserID] = useState(user !== null ? user.id : crypto.randomUUID());
    const [userName, setUserName] = useState('');

    useEffect(() => {
        if (user) {
            setUserID(user.id);
            setUserName(user.name);
        }
        else {
            setUserID(crypto.randomUUID());
        }
    }, [user]);

    return (
        <div className='column'>

            <input
                className='centre'
                type='text'
                placeholder='User Name'
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                autoFocus
            />

            <div className='row'>
                <button className='centre'
                    onClick={() => {
                        updateOrAddUser(userName, user?.id);
                        close();
                        if (onClose !== null && onClose !== undefined) {
                            onClose(userID);
                        }
                    }}
                    disabled={!userName.trim()}
                >
                    {user ? 'Update' : 'Add'}
                </button>
                {user !== null &&
                    <button className='centre threat'
                        onClick={() => {
                            deleteUser(user?.id);
                            close();
                        }}
                        disabled={!userName.trim()}
                    >
                        Delete
                    </button>
                }
            </div>

        </div>
    );
}
