import { useEffect, useState } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { openUrl } from '@tauri-apps/plugin-opener';
import { invoke } from '@tauri-apps/api/core';
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

    const [openSelectUser, setOpenSelectUser] = useState<((userID: string, userEmail: string) => void) | null>(null); // holds a function to redirect after user selection
    const [openEditUser, setOpenEditUser] = useState<((userID: string, userEmail: string) => void) | null>(null); // holds a function to redirect after user creation
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const [modesty, setModesty] = useState<boolean>(true);

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

    function redirectToTrueLayer(userID: string, userEmail: string) {
        if (userID !== null) {
            getTrueLayerAuthURL(userID, userEmail)
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
                            update_timestamp: balance.update_timestamp,
                        },
                    };
                } else {
                    // BankAccount
                    return {
                        ...prev,
                        [accountID]: {
                            ...account,
                            balance: balance as TrueLayerAccountBalance,
                            update_timestamp: balance.update_timestamp,
                        },
                    };
                }
            });
        }
    }

    function startLinkAccount() {
        if (isTauri) {
            const redirect = (userID: string, userEmail: string) => redirectToTrueLayer(userID, userEmail);
            if (users === null || users.length === 0) {
                // if no users, prompt to add a user
                setOpenEditUser(() => redirect);
            }
            else if (users.length === 1) {
                // if only one user, select them automatically
                redirect(users[0].id, users[0].email);
            }
            else {
                // if multiple users, prompt to select one
                setOpenSelectUser(() => redirect);
            }
        }
    }

    function updateOrAddUser(user: User) {
        if (users !== null) {
            setUsers(prev => {
                const existingUserIndex = prev ? prev.findIndex(u => u.id === user.id) : -1;

                if (existingUserIndex !== -1) {
                    // update existing user
                    const updatedUsers = [...(prev || [])];
                    updatedUsers[existingUserIndex] = { ...updatedUsers[existingUserIndex], ...user };
                    return updatedUsers;
                } else {
                    // add new user
                    return [...(prev || []), { ...user }];
                }
            });
        }
    }

    async function deleteUser(userID: string) {
        if (users !== null) {
            const user = users.find(u => u.id === userID);
            if (!user) {
                console.warn(`User with ID ${userID} not found.`);
                return;
            }

            // check if user has any linked accounts
            const linkedAccounts = Object.values(accounts).filter(account => account.user === userID);
            if (linkedAccounts.length > 0) {
                // get walletTokens of accounts linked to this user
                const linkedWalletTokens = Object.values(accounts)
                    .filter(account => account.user === userID)
                    .map(account => account.walletToken)
                    .filter((token, index, self) => self.indexOf(token) === index); // unique tokens

                
                // confirm with user before unlinking
                const userConfirmation = await confirm(
                    `${user.name} has ${linkedAccounts.length} linked accounts. Are you sure you want to unlink them?`
                ); // XXX: ugly, but gets the job done
                
                if (!userConfirmation) {
                    return; // user cancelled
                }
                await invoke('removeWalletTokens', { walletTokens: linkedWalletTokens });
                setWalletTokens(prev => prev.filter(token => !linkedWalletTokens.includes(token)));
            }

            // remove user from the list
            setUsers(prev => (prev ? prev.filter(user => user.id !== userID) : []));
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

    const footend = (
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
    );

    return (
        <div id='app'>

            {/* USER SELECTION MODAL */}
            <ResponsiveModal title='Whose bank do you want to link with?'
                open={openSelectUser !== null}
                onClose={() => setOpenSelectUser(null)}
                forceMode='bottomSheet'
            >
                <div className='userSelection'>
                    <p>
                        Bagel will neatly organise any accounts and cards from this bank connection under
                        the selected profile — which drawer of his little filing cabinet should he use?
                    </p>

                    <div className='column'>
                        <div className='row'>
                            {users &&
                                users.map(user => (
                                    <button key={user.id}
                                        onClick={() => {
                                            if (openSelectUser) {
                                                openSelectUser(user.id, user.email); // call the redirect function
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

                        <ResponsiveModal.SheetOnly>
                            {footend}
                        </ResponsiveModal.SheetOnly>

                    </div>
                </div>
            </ResponsiveModal>

            {/* USER CREATION MODAL */}
            <ResponsiveModal title={selectedUser === null ? 'Add a new profile' : 'Edit profile'}
                open={openEditUser !== null}
                onClose={() => {
                    setOpenEditUser(null);
                    setSelectedUser(null);
                }}
                forceMode='centreModal'
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
                    existingUsers={users}
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
                        {users && users.length > 0 ? '+' : 'Setup Profile'}
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

                {/* USER BUTTONS */}
                <div className='row right'>
                    <input
                        type='checkbox'
                        id='modestyToggle'
                        checked={modesty}
                        onChange={(e) => setModesty(e.target.checked)}
                        style={{ marginRight: '1rem' }}
                    />
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

                            const available = modesty ? '***' : balance?.available?.toFixed(2) ?? null;
                            const current = modesty ? '***' : balance?.current?.toFixed(2) ?? null;

                            const currency = balance?.currency === 'GBP' ? '£' : balance?.currency;
                            const displayBalance = current ? `${currency}\u00A0${isCard ? '-' : ''}${current}` : null;
                            const displayAvailable = available ? `${currency}\u00A0${available}` : null;

                            const user = users?.find(user => user.id === account.user);

                            const updateDate = new Date(account.update_timestamp);
                            const now = new Date();
                            const diffInMinutes = (now.getTime() - updateDate.getTime()) / 60000; // in minutes
                            const isRecent = diffInMinutes <= 60; // consider recent if updated within the last hour

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
                                            <div
                                                style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor: isRecent ? '#4CAF50' : '#F44336',
                                                    margin: '5px',
                                                }}
                                            />
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

                                        {!isCard && account.interestRate && (
                                            <div className='interestRate'>TODO: Interest Rate</div>
                                        )}

                                        {account.lastBalance && (
                                            <div className='delta'>TODO: Delta</div>
                                        )}

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // EMPTY RECORD
                    <div className='column'>
                        <h4>You don't have any linked accounts.</h4>
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

                {footend}
            </div>

        </div>
    );
}

export default App;

type UserEditPanelProps = {
    user: User | null;
    updateOrAddUser: (newUser: User) => void;
    deleteUser: (userID: string) => void;
    onClose: ((userID: string, userEmail: string) => void) | null;
    close: () => void;
    existingUsers?: User[] | null;
};

function UserEditPanel({
    user,
    updateOrAddUser,
    deleteUser,
    onClose,
    close,
    existingUsers
}: UserEditPanelProps) {

    const [ephemeralUser, setEphemeralUser] = useState<User>({
        id: user ? user.id : crypto.randomUUID(),
        name: user ? user.name : '',
        email: user ? user.email : '',
    });

    useEffect(() => {
        if (user) {
            setEphemeralUser({
                ...user,
            });
        }
        else {
            setEphemeralUser({
                id: crypto.randomUUID(),
                name: '',
                email: '',
            });
        }
    }, [user]);

    const invalidName = (
        // non-nulls
        ephemeralUser.name.trim() === ''
        // unique
        || existingUsers?.some((existingUser) => existingUser.name === ephemeralUser.name && existingUser.id !== ephemeralUser.id)
    );
    const invalidEmail = (
        // non-nulls
        ephemeralUser.email.trim() === ''
        // email format (basic check)
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ephemeralUser.email)
    );

    const invalidForm = invalidName || invalidEmail;

    return (
        <div className='column'>

            <input
                className={`centre ${invalidName ? 'invalid' : ''}`}
                type='text'
                placeholder='User Name'
                value={ephemeralUser.name}
                onChange={(e) => setEphemeralUser({ ...ephemeralUser, name: e.target.value })}
                autoFocus
            />

            <input
                className={`centre ${invalidEmail ? 'invalid' : ''}`}
                type='text'
                placeholder='Email Address'
                value={ephemeralUser.email}
                onChange={(e) => setEphemeralUser({ ...ephemeralUser, email: e.target.value })}
                autoFocus
            />

            <div className='row'>
                <button
                    className='centre'
                    onClick={() => {
                        updateOrAddUser(ephemeralUser);
                        close();
                        if (onClose !== null && onClose !== undefined) {
                            onClose(ephemeralUser.id, ephemeralUser.email);
                        }
                    }}
                    disabled={invalidForm}
                >
                    {user ? 'Update' : 'Add'}
                </button>
                {user !== null && (
                    <button
                        className='centre threat'
                        onClick={() => {
                            deleteUser(user?.id);
                            close();
                        }}
                    >
                        Delete
                    </button>
                )}
            </div>

            <div className='footend small'>
                <p>
                    TrueLayer requires your email to identify you when linking your bank.
                    This is only used for verification and never shared.
                </p>
            </div>
        </div>
    );
}
