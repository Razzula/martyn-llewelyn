import { useEffect, useState } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { openUrl } from '@tauri-apps/plugin-opener';
import { invoke } from '@tauri-apps/api/core';
// import { retrieve, store } from "@impierce/tauri-plugin-keystore";

import { fetchAccountBalance, fetchAccountsData, fetchCardBalance, fetchCardsData, fetchProviders, getTrueLayerAuthURL, handleTokenExchange } from './lib/TrueLayer.ts';

import './styles/App.css';
import { BankAccount, BankAccountBalance, BankAccountPatch, emptyBankAccount, generatePatchFromAccount, User } from './types/Bagel.ts';
import { ResponsiveModal } from './components/common/ResponsiveModal.tsx';
import { AccountManager } from './AccountManager.ts';
import { fromTrueLayerAccountBalance, fromTrueLayerCardBalance } from './types/TrueLayerAdapters.ts';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/common/Tooltip.tsx';
import { TrueLayerProvider } from './types/TrueLayer.ts';
import Select from './components/common/Select.tsx';

const isTauri = !!(window as any).__TAURI_INTERNALS__;

enum ResponseState {
    LOADING = 'LOADING',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
}

function App() {

    const [users, setUsers] = useState<User[] | null>(null);
    const [providers, setProviders] = useState<Record<string, TrueLayerProvider>>({});

    const [accounts, setAccounts] = useState<Record<string, (BankAccount)>>({});
    const [accountsState, setAccountsState] = useState<ResponseState | null>(null);

    const [accountsDataLive, setAccountsDataLive] = useState<Record<string, BankAccount>>({});
    const [accountsDataOffline, setAccountsDataOffline] = useState<Record<string, BankAccount> | null>(null);
    const [accountsDataPatches, setAccountsDataPatches] = useState<Record<string, BankAccountPatch> | null>(null);

    const [walletTokens, setWalletTokens] = useState<string[]>([]);

    const [openSelectUser, setOpenSelectUser] = useState<((userID: string, userEmail: string) => void) | null>(null); // holds a function to redirect after user selection
    const [openEditUser, setOpenEditUser] = useState<((userID: string, userEmail: string) => void) | null>(null); // holds a function to redirect after user creation
    const [openEditAccount, setOpenEditAccount] = useState<BankAccount | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const [modesty, setModesty] = useState<boolean>(true);

    useEffect(() => {
        // HANDLE SETUP
        if (!isTauri) {
            alert('You are running a browser version of the app. This only supports a limited demo mode, and does not support access to any real accounts.\n\nNothing will be saved, and no data will be fetched from any providers.\n\nPlease refer to https://github.com/Razzula/martyn-llewelyn for more information.');
            return;
        }

        // LOAD PROVIDERS
        fetchProviders(import.meta.env.VITE_CLIENT_ID)
            .then((providers: TrueLayerProvider[]) => {
                const providersMap: Record<string, TrueLayerProvider> = {};
                providers.forEach(provider => {
                    providersMap[provider.provider_id] = provider;
                });
                setProviders(providersMap);
            })
            .catch(err => {
                console.error('Failed to fetch providers:', err);
            });

        // LOAD USERS
        invoke('loadJSON', { filename: 'users.json' })
            .then((raw: unknown) => {
                const data: User[] = JSON.parse(raw as string);
                setUsers(data);
            })
            .catch(() => {
                setUsers([]);
            });

        // LOAD OFFLINE ACCOUNTS
        invoke('loadJSON', { filename: 'accounts.offline.json' })
            .then((raw: unknown) => {
                const data: Record<string, BankAccount> = JSON.parse(raw as string);
                setAccountsDataOffline(data);
            })
            .catch(() => {
                setAccountsDataOffline({});
            });

        // LOAD ACCOUNT PATCHES
        invoke('loadJSON', { filename: 'accounts.patches.json' })
            .then((raw: unknown) => {
                const data: Record<string, BankAccount> = JSON.parse(raw as string);
                setAccountsDataPatches(data);
            })
            .catch(() => {
                setAccountsDataPatches({});
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
        // SAVE ACCOUNTS
        if (accountsDataOffline !== null) {
            saveOfflineAccounts();
        }
    }, [accountsDataOffline]);

    useEffect(() => {
        // SAVE ACCOUNTS
        if (accountsDataPatches !== null) {
            saveAccountPatches();
        }
    }, [accountsDataPatches]);

    useEffect(() => {
        setAccounts(_prev => {
            // start with offline and live data
            const merged: Record<string, BankAccount> = {
                ...(accountsDataOffline || {}),
                ...(accountsDataLive || {}),
            };
            // apply patches if present
            if (accountsDataPatches !== null) {
                Object.entries(accountsDataPatches).forEach(([id, patch]) => {
                    if (merged[id]) {
                        merged[id] = { ...merged[id], ...patch };
                    }
                });
            }
            return merged;
        });
    }, [accountsDataLive, accountsDataOffline, accountsDataPatches]);

    useEffect(() => {
        // FETCH ACCOUNTS
        if (walletTokens.length > 0) {
            setAccountsDataLive({});
            setAccountsState(ResponseState.LOADING); // reset accounts while fetching

            const accountManager = new AccountManager();

            walletTokens.forEach(token => {
                Promise.all([
                    // fetch accounts and cards data
                    fetchAccountsData(token),
                    fetchCardsData(token)
                ])
                    .then(([accounts, cards]) => {
                        [...accounts, ...cards].forEach(account => {
                            // merge into the manager's instance
                            accountManager.merge(account);
                        });

                        // apply partial update, to not block UI
                        setAccountsDataLive(prev => accountManager.applyTo(prev));

                        if (accountsState !== ResponseState.ERROR) {
                            setAccountsState(ResponseState.SUCCESS);
                        }
                    })
                    .catch(err => {
                        console.error(`Failed to fetch for token ${token}:`, err);
                        setAccountsState(ResponseState.ERROR);
                    });
            });
        }
        else {
            setAccountsDataLive({});
        }
    }, [walletTokens]);

    useEffect(() => {
        // FETCH ACCOUNT BALANCES
        if (walletTokens.length === 0 || !accounts) return;

        if (Object.keys(accounts).length > 0) {

            Object.entries(accounts).forEach(([accountID, account]: [string, BankAccount]) => {
                if (account.balance) {
                    // already has balance, skip fetching
                    return;
                }
                if (account.source !== 'TrueLayer') {
                    // only fetch balances for TrueLayer accounts
                    return;
                }

                const isCard = account.cardNetwork !== undefined;
                const walletToken = account.users?.[0]?.walletToken || walletTokens[0]; // XXX: use the first token if not specified

                if (!isCard) {
                    fetchAccountBalance(walletToken, accountID)
                        .then(data => {
                            if (data) {
                                updateAccountBalance(accountID, fromTrueLayerAccountBalance(data[0]));
                            }
                        })
                        .catch(err => {
                            console.error(`Failed to fetch balance for account ${accountID}:`, err);
                            setAccountsState(ResponseState.ERROR);
                        });
                }
                else {
                    fetchCardBalance(walletToken, accountID)
                        .then(data => {
                            if (data) {
                                updateAccountBalance(accountID, fromTrueLayerCardBalance(data[0]));
                            }
                        })
                        .catch(err => {
                            console.error(`Failed to fetch balance for card ${accountID}:`, err);
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

    function updateAccountBalance(accountID: string, balance: BankAccountBalance) {
        if (accounts && accounts[accountID]) {
            const account = accounts[accountID];
            setAccountsDataLive(prev => ({
                ...prev,
                [accountID]: {
                    ...account,
                    balance: balance,
                    updateTimestamp: balance.updateTimestamp,
                },
            }));
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

    function startCreateAccount() {
        const redirect = (_userID: string, _userEmail: string) => setOpenEditAccount({} as BankAccount);
        if (users === null || users.length === 0) {
            // if no users, prompt to add a user
            setOpenEditUser(() => redirect);
        }
        else {
            // user selection handled by panel
            redirect('', '');
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
            const linkedAccounts = Object.values(accounts).filter(account => account.users.some(u => u.id === userID));
            if (linkedAccounts.length > 0) {
                // get walletTokens of accounts linked to this user
                const linkedWalletTokens: string[] = [];
                linkedAccounts.forEach(account => {
                    const userSignature = account.users.find(u => u.id === userID);
                    if (userSignature?.walletToken) {
                        linkedWalletTokens.push(userSignature.walletToken);
                    }
                });

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

    function saveOfflineAccounts() {
        if (accountsDataOffline !== null) {
            invoke('saveJSON', { filename: 'accounts.offline.json', json: JSON.stringify(accountsDataOffline) })
                .catch(err => {
                    console.error('Failed to save offline accounts:', err);
                });
        }
    }

    function saveAccountPatches() {
        if (accountsDataPatches !== null) {
            invoke('saveJSON', { filename: 'accounts.patches.json', json: JSON.stringify(accountsDataPatches) })
                .catch(err => {
                    console.error('Failed to save account patches:', err);
                });
        }
    }

    function updateOrAddAccount(account: BankAccount) {
        if (account.source === 'Bagel') {
            // if it's a manual account, update the offline data
            setAccountsDataOffline(prev => ({
                ...(prev || {}),
                [account.id]: account,
            }));
        }
        else {
            const patch = generatePatchFromAccount(account, accountsDataLive[account.id] || emptyBankAccount);
            // if it's a TrueLayer account, patch the live data
            setAccountsDataPatches(prev => {
                const prevObj = prev ?? {};
                return {
                    ...prevObj,
                    [account.id]: {
                        ...prevObj[account.id],
                        ...patch,
                    }
                };
            });
        }
    }

    function deleteAccount(accountID: string) {
        const account = accountsDataOffline?.[accountID];
        if (account) {
            // if it's an offline account, remove it from the offline data
            setAccountsDataOffline(prev => {
                const newData = { ...prev };
                delete newData[accountID];
                return newData;
            });
        }
        const patch = accountsDataPatches?.[accountID];
        if (patch) {
            // if it's a TrueLayer account, remove the patch
            setAccountsDataPatches(prev => {
                const newData = { ...prev };
                delete newData[accountID];
                return newData;
            });
        }
        // currently, we ignore trying to delete a linked account
    }

    const accountsSum = Object.values(accounts || {}).reduce((sum, account) => {
        const isCard = account.cardNetwork !== undefined;
        const current = account.balance?.current ?? 0;
        const available = account.balance?.available ?? 0;
        const balance = isCard ? -current : available; // cards are negative, others are positive
        return sum + balance;
    }, 0);

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
                <div className='userSelection column'>

                    <img className='centre'
                        src='./BagelSorting.png'
                        alt='Bagel Sorting'
                    />
                    <p>
                        Bagel will neatly organise any accounts and cards from this connection under
                        the selected profile — which drawer of his little filing cabinet should he use?
                    </p>

                    <div className='column'>
                        <div className='row'>
                            {users &&
                                users.map(user => (
                                    <button key={user.id}
                                        className='column'
                                        onClick={() => {
                                            if (openSelectUser) {
                                                openSelectUser(user.id, user.email); // call the redirect function
                                            }
                                            setOpenSelectUser(null); // close modal
                                        }}
                                        style={{ minWidth: '120px' }}
                                    >
                                        <img
                                            className='userIcon'
                                            src={user.icon}
                                            alt={user.name}
                                            style={{ width: '32px', height: '32px' }}
                                        />
                                        <span>{user.name}</span>
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

            {/* ACCOUNT CREATION MODAL */}
            <ResponsiveModal title={openEditAccount?.id ? (openEditAccount?.source === 'Bagel' ? 'Edit manual account' : 'Patch TrueLayer account') : 'Create a manual account'}
                open={openEditAccount !== null}
                onClose={() => {
                    setOpenEditAccount(null);
                }}
                forceMode='centreModal'
            >
                <AccountEditPanel
                    account={openEditAccount}
                    updateOrAddAccount={updateOrAddAccount}
                    deleteAccount={deleteAccount}
                    close={() => setOpenEditAccount(null)}
                    existingAccounts={accounts}
                    users={users || []}
                    providers={providers}
                />
            </ResponsiveModal>

            <div className='header row'>

                {/* USER BUTTONS */}
                <div className='row left'>
                    {users &&
                        users.map((user, index) => (
                            <Tooltip key={user.id}>
                                <TooltipTrigger>
                                    <button
                                        key={index}
                                        className='userButton'
                                        onClick={() => {
                                            setOpenEditUser(() => { });
                                            setSelectedUser(user);
                                        }}
                                    >
                                        {user.icon ?
                                            <img
                                                className='userIcon'
                                                src={user.icon}
                                                alt={user.name}
                                                style={{ width: '32px', height: '32px' }}
                                            /> : <span>{user.name.charAt(0).toUpperCase()}</span>
                                        }
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {user.name}
                                </TooltipContent>
                            </Tooltip>
                        ))
                    }

                    <Tooltip>
                        <TooltipTrigger>
                            <button
                                className={users && users.length > 0 ? 'userButton' : ''}
                                onClick={() => setOpenEditUser(() => { })}
                            >
                                {users && users.length > 0 ? '+' : 'Setup Profile'}
                            </button>
                        </TooltipTrigger>
                        {users && users.length > 0 &&
                            <TooltipContent>
                                Create a profile
                            </TooltipContent>
                        }
                    </Tooltip>
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
                    <Tooltip>
                        <TooltipTrigger>
                            <input
                                type='checkbox'
                                id='modestyToggle'
                                checked={modesty}
                                onChange={(e) => setModesty(e.target.checked)}
                                style={{ marginRight: '1rem' }}
                            />
                        </TooltipTrigger>
                        <TooltipContent>
                            {modesty ? 'Show balances' : 'Hide balances'}
                        </TooltipContent>
                    </Tooltip>
                </div>

            </div>

            <div>
                {!modesty ? `£ ${accountsSum.toFixed(2)}` : '£ ***'}
            </div>

            {
                Object.keys(accounts).length > 0 ? (
                    // POPULATED RECORD
                    <div className='accountsGrid'>
                        {Object.entries(accounts).sort().map(([accountId, account]) => {

                            const isCard = account.cardNetwork !== undefined;

                            const balance = 'balance' in account ? account.balance : null;

                            const available = balance?.available?.toFixed(2) ?? null;
                            const current = balance?.current?.toFixed(2) ?? null;

                            const currency = balance?.currency === 'GBP' ? '£' : balance?.currency;
                            const displayBalance = current ? `${currency}\u00A0${isCard ? '-' : ''}${modesty ? '***' : current}` : null;
                            const displayAvailable = available ? `${currency}\u00A0${modesty ? '***' : available}` : null;

                            const accountUsers = users?.filter(user => account.users.some(u => u.id === user.id));

                            const updateDate = new Date(account.updateTimestamp);
                            const now = new Date();
                            const diffInMinutes = (now.getTime() - updateDate.getTime()) / 60000; // in minutes
                            const isRecent = diffInMinutes <= 15; // consider recent if updated within the last 15 minutes

                            return (
                                <div className='accountCard' key={accountId}
                                    style={{ position: 'relative' }}
                                    onClick={() => setOpenEditAccount(account)}
                                >

                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor: account.source === 'TrueLayer' ? (isRecent ? '#4CAF50' : '#eea342ff') : '#dadada',
                                                    margin: '0.4rem',
                                                    cursor: 'help',
                                                }}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {account.source === 'TrueLayer' &&
                                                <img
                                                    className='bankLogo'
                                                    src='./TrueLayer/TrueLayerLogo/TrueLayer-LOGO-white-transp-horizontal.svg'
                                                    alt='TrueLayer Logo'
                                                    style={{
                                                        width: '80px',
                                                    }}
                                                />
                                            }
                                            {account.updateTimestamp &&
                                                updateDate.toLocaleDateString('en-GB', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                }) + ` (${diffInMinutes.toFixed(0)} min ago)`
                                            }
                                            {account.source === 'Bagel' &&
                                                <span>Manual Entry</span>
                                            }
                                        </TooltipContent>
                                    </Tooltip>

                                    <div className='accountHeader'>
                                        <div className='row'>
                                            {
                                                accountUsers?.map(user => (
                                                    <Tooltip key={user.id}>
                                                        <TooltipTrigger>
                                                            <img
                                                                key={user.id}
                                                                className='bankLogo'
                                                                src={user.icon}
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {user.name}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ))
                                            }
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <img
                                                        className='bankLogo'
                                                        src={providers?.[account.provider.id]?.logo_url || account.provider.logoURI || '/Serenity/unknown.png'}
                                                        alt={`${account.name} Logo`}
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {providers?.[account.provider.id]?.display_name ?? account.provider.name ?? account.provider.id}
                                                </TooltipContent>
                                            </Tooltip>
                                            <div className='verticalSeparator' />
                                            <div className='name'>{account.name}</div>
                                        </div>
                                        <div className='balance'>
                                            {
                                                (!isCard ? displayAvailable : displayBalance)
                                                || <div className='spinner' />
                                            }
                                        </div>
                                    </div>
                                    <div className='body'>
                                        <div className='type'>
                                            {account.type}
                                        </div>
                                        <div className='number'>
                                            {account.number.number}
                                        </div>
                                        <div className='number'>
                                            {account.number.sortCode}
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
                <div className='row'
                    style={{
                        gap: '1rem',
                        alignItems: 'stretch',
                    }}
                >
                    <button
                        className='column'
                        onClick={() => startLinkAccount()}
                        disabled={!isTauri}
                    >
                        <img
                            src='./TrueLayer/Banks/BankLogos_UnitedKingdom_5icons.svg'
                            alt='All Major UK Banks Supported'
                            height={24}
                        />
                        <span>Connect with {Object.values(accounts)?.length === 0 ? 'your' : 'another'} Bank</span>
                    </button>
                    <button
                        className='column'
                        onClick={startCreateAccount}
                    >
                        <img
                            src='./Serenity/dir.png'
                            alt='Add a Manual Entry'
                            height={24}
                        />
                        <span>Manual Entry</span>
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

    const emptyUser: User = {
        id: crypto.randomUUID(),
        name: '',
        email: '',
        icon: '/Serenity/unknown.png',
    };

    const [ephemeralUser, setEphemeralUser] = useState<User>({
        id: user ? user.id : emptyUser.id,
        name: user ? user.name : emptyUser.name,
        email: user ? user.email : emptyUser.email,
        icon: user ? user.icon : emptyUser.icon,
    });

    useEffect(() => {
        if (user) {
            setEphemeralUser({
                ...user,
            });
        }
        else {
            setEphemeralUser({
                id: emptyUser.id,
                name: emptyUser.name,
                email: emptyUser.email,
                icon: emptyUser.icon,
            });
        }
    }, [user]);

    const icons = [
        '/Serenity/bagel.png',
        '/Serenity/nim.png',
        // '/Serenity/paun.png',
        // '/Serenity/andreas.png',
        '/Serenity/mochyn.png',
        '/Serenity/hwyaden.png',
        // '/Serenity/trex.png',
    ]

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
    ) && isTauri; // email only needs to be valid in Tauri context

    const invalidForm = invalidName || invalidEmail;

    return (
        <div className='column'>

            <div className='row'>
                {
                    icons.map((icon, index) => (
                        <img
                            key={index}
                            className={`clickable ${ephemeralUser.icon !== icon ? 'unselected' : ''}`}
                            src={icon}
                            alt={`User Icon ${index + 1}`}
                            onClick={() => setEphemeralUser({ ...ephemeralUser, icon })}
                        />
                    ))
                }
            </div>

            <div className='formRow'>
                <input
                    className={`${invalidName ? 'invalid' : ''}`}
                    type='text'
                    placeholder='User Name'
                    value={ephemeralUser.name}
                    onChange={(e) => setEphemeralUser({ ...ephemeralUser, name: e.target.value })}
                    autoFocus
                />
            </div>

            {isTauri &&
                <div className='formRow'>
                    <input
                        className={`${invalidEmail ? 'invalid' : ''}`}
                        type='text'
                        placeholder='Email Address'
                        value={ephemeralUser.email}
                        onChange={(e) => setEphemeralUser({ ...ephemeralUser, email: e.target.value })}
                        autoFocus
                    />
                </div>
            }

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
                {isTauri &&
                    <p>
                        TrueLayer requires your email to identify you when linking your bank.
                        This is only used for verification and never shared.
                    </p>
                }
            </div>
        </div>
    );
}

type AccountEditPanelProps = {
    account: BankAccount | null;
    updateOrAddAccount: (newAccount: BankAccount) => void;
    deleteAccount: (accountID: string) => void;
    close: () => void;
    existingAccounts?: Record<string, BankAccount> | null;
    users?: User[];
    providers?: Record<string, TrueLayerProvider>;
};

function AccountEditPanel({
    account,
    updateOrAddAccount,
    deleteAccount,
    close,
    existingAccounts,
    users,
    providers,
}: AccountEditPanelProps) {

    const [ephemeralAccount, setEphemeralAccount] = useState<BankAccount>(constructAccount());

    useEffect(() => {
        setEphemeralAccount(constructAccount());
    }, [account]);


    function constructAccount(): BankAccount {
        return {
            ...emptyBankAccount,
            ...account,
            id: account?.id || crypto.randomUUID(),
        };
    }

    const isAccountOnline = ephemeralAccount?.source === 'TrueLayer';
    const isCard = ephemeralAccount?.cardNetwork !== undefined;

    const invalidUsers = (
        // non-null
        ephemeralAccount?.users?.length === 0
    );
    const invalidName = (
        // non-null
        ephemeralAccount?.name?.trim() === ''
    );
    const invalidNumber = (
        // non-null
        ephemeralAccount?.number?.number?.trim() === ''
        // unique
        || (existingAccounts && Object.values(existingAccounts).some(existingAccount =>
            existingAccount.id !== ephemeralAccount.id
            && existingAccount.number?.number === ephemeralAccount.number?.number
        ))
        // format
        || !/^\d{8,10}$/.test(ephemeralAccount?.number?.number || '')
    );
    const invalidSortCode = (
        // non-null
        ephemeralAccount?.number?.sortCode === undefined
        || ephemeralAccount?.number?.sortCode?.trim() === ''
        // format
        || !/^\d{2}-\d{2}-\d{2}$/.test(ephemeralAccount?.number?.sortCode || '')
    );

    const invalidForm = (
        invalidUsers || invalidName || invalidNumber || invalidSortCode
    );

    const selectedBankProviderIndex = providers ? Object.keys(providers).indexOf(ephemeralAccount?.provider?.id || '') : -1;

    return (
        <div className='column'>

            {/* INPUTS */}
            <div className='row'>
                {/* User(s) */}
                {
                    users && users.length > 0 ? (
                        users.map((user, index) => {
                            const isSelected = ephemeralAccount?.users?.find(u => u.id === user.id);

                            return (
                                <Tooltip key={user.id}>
                                    <TooltipTrigger>
                                        <img className={`userIcon clickable ${!isSelected ? 'unselected' : ''}`}
                                            key={index}
                                            src={user.icon}
                                            alt={user.name}
                                            onClick={() => {
                                                setEphemeralAccount(prev => {
                                                    const userSignatures = [...(prev.users || [])];
                                                    const userIndex = userSignatures.findIndex(u => u.id === user.id);
                                                    if (userIndex !== -1) {
                                                        // remove user
                                                        userSignatures.splice(userIndex, 1);
                                                    }
                                                    else {
                                                        // add user
                                                        userSignatures.push({ id: user.id, walletToken: '' });
                                                    }
                                                    return { ...prev, users: userSignatures };
                                                });
                                            }}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {user.name}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })
                    ) : (
                        <span className='centre'>No users selected</span>
                    )
                }
            </div>

            <div className='formRow' style={{display: 'flex', alignItems: 'stretch' }}>
                <Select
                    entries={Object.entries(providers ?? []).map(([id, provider]) => ({
                        key: id,
                        name: provider.display_name,
                        element: (
                            <div className='row'>
                                <img
                                    className='bankLogo'
                                    src={provider.logo_url || '/Serenity/unknown.png'}
                                    alt={provider.display_name || id}
                                />
                                <span>{provider.display_name || id}</span>
                            </div>
                        ),
                        icon: provider.logo_url || '/Serenity/unknown.png',
                    }))}
                    setSelected={(key) => setEphemeralAccount(prev => ({
                        ...prev,
                        provider: {
                            id: key,
                        }
                    }))}
                    forcedIndex={selectedBankProviderIndex}
                    icon={providers?.[ephemeralAccount?.provider?.id]?.logo_url || '/Serenity/unknown.png'}
                />
                <input
                    className={`centre ${invalidName ? 'invalid' : ''}`}
                    type='text'
                    placeholder='Account Name'
                    value={ephemeralAccount?.name}
                    onChange={(e) => setEphemeralAccount({ ...ephemeralAccount, name: e.target.value })}
                    autoFocus
                    style={{
                        flex: 1,
                    }}
                />
            </div>


            <div className='row'>
                <input
                    className={`centre ${invalidNumber ? 'invalid' : ''}`}
                    type='text'
                    placeholder='Account Number'
                    value={ephemeralAccount?.number?.number}
                    onChange={(e) => setEphemeralAccount({ ...ephemeralAccount, number: { ...ephemeralAccount.number, number: e.target.value } })}
                    autoFocus
                    disabled={isAccountOnline}
                />
                <input
                    className={`centre ${invalidSortCode ? 'invalid' : ''}`}
                    type='text'
                    placeholder='Sort Code'
                    value={ephemeralAccount?.number?.sortCode}
                    onChange={(e) => setEphemeralAccount({ ...ephemeralAccount, number: { ...ephemeralAccount.number, sortCode: e.target.value } })}
                    autoFocus
                    disabled={isAccountOnline}
                />
            </div>

            <select
                className='centre'
                value={ephemeralAccount?.type}
                onChange={(e) => setEphemeralAccount({ ...ephemeralAccount, type: e.target.value })}
                disabled={isAccountOnline}
            >
                <option disabled value=''>Select Account Type</option>
                <option value='savings'>Savings</option>
                <option value='checking'>Checking</option>
                <option value='business'>Business</option>
            </select>

            {/* BUTTONS */}
            <div className='row'>
                <button
                    className='centre'
                    onClick={() => {
                        updateOrAddAccount(ephemeralAccount);
                        close();
                    }}
                    disabled={invalidForm}
                >
                    {account?.id ? 'Update' : 'Add'}
                </button>
                {account?.id && (
                    <button
                        className='centre threat'
                        onClick={() => {
                            deleteAccount(account.id);
                            close();
                        }}
                    >
                        Delete
                    </button>
                )}
            </div>

        </div>
    );
}