import { RefObject, useEffect, useRef, useState } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { invoke } from '@tauri-apps/api/core';

import { fetchAccountBalance, fetchAccountsData, fetchAccountTransactions, fetchCardBalance, fetchCardsData, fetchCardTransactions, fetchProviders, getTrueLayerAuthURL, handleTokenExchange } from './lib/TrueLayer.ts';

import { BankAccount, BankAccountBalance, BankAccountPatch, generatePatchFromAccount, Transaction, User } from './types/Bagel.ts';
import { ResponsiveModal } from './components/common/ResponsiveModal.tsx';
import { AccountManager } from './AccountManager.ts';
import { fromTrueLayerAccountBalance, fromTrueLayerAccountTransaction, fromTrueLayerCardBalance, fromTrueLayerCardTransaction } from './types/TrueLayerAdapters.ts';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/common/Tooltip.tsx';
import { TrueLayerProvider } from './types/TrueLayer.ts';
import { closedProviders } from './data/providers.ts';
import { isTauri, openInBrowser } from './utils/utils.ts';
import AccountEditPanel from './components/AccountEditPanel.tsx';

import './styles/App.css';
import { emptyBankAccount } from './data/stubs.ts';
import UserEditPanel from './components/UserEditPanel.tsx';
import SegmentedControl from './components/common/SegmentedControl.tsx';
import AccountsPanel from './components/AccountsPanel.tsx';
import TransactionsPanel from './components/TransactionsPanel.tsx';
import { newOrderedDateTreeFromList, OrderedDateTree } from './types/OrderedDateTree.ts';

enum ResponseState {
    LOADING = 'LOADING',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
}

function App() {

    const [panel, setPanel] = useState<'accounts' | 'transactions'>('accounts');

    const [users, setUsers] = useState<User[] | null>(null);
    const [providers, setProviders] = useState<Record<string, TrueLayerProvider>>({});

    const [accounts, setAccounts] = useState<Record<string, (BankAccount)>>({});
    const [accountsState, setAccountsState] = useState<ResponseState | null>(null);

    const [accountsDataLive, setAccountsDataLive] = useState<Record<string, BankAccount>>({});
    const [accountsDataOffline, setAccountsDataOffline] = useState<Record<string, BankAccount> | null>(null);
    const [accountsDataPatches, setAccountsDataPatches] = useState<Record<string, BankAccountPatch> | null>(null);

    const [transactionsTree, setTransactionsTree] = useState<OrderedDateTree<Transaction>>(new OrderedDateTree<Transaction>());

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
        fetchProviders()
            .then((providers: TrueLayerProvider[]) => {
                const providersMap: Record<string, TrueLayerProvider> = {};
                [...providers, ...closedProviders]
                    .filter(provider => provider.provider_id !== 'mock' && provider.country === 'uk') // XXX: restrict to UK for now
                    .sort((a, b) => a.display_name.localeCompare(b.display_name))
                    .forEach(provider => {
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
        if (accountsDataLive) {
            setProviders(prev => {
                // cache account logos for providers
                const newAccounts = { ...accountsDataLive };
                Object.values(newAccounts).forEach(account => {
                    const providerID = account.provider?.id || undefined;
                    if (providerID && account.provider?.logoURI !== undefined) {
                        if (
                            prev?.[providerID]
                            && prev?.[providerID].accountLogo === undefined
                        ) {
                            // if provider has no account logo, set it to the default
                            prev[providerID].accountLogo = account.provider.logoURI;
                        }
                    }
                });
                return prev;
            })
        }
    }, [accountsDataLive]);

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
                if (account.source !== 'TrueLayer') {
                    // only fetch balances for TrueLayer accounts
                    return;
                }

                const isCard = account.cardNetwork !== undefined;
                const walletToken = account.users?.[0]?.walletToken || walletTokens[0]; // XXX: use the first token if not specified

                // FETCH ACCOUNT BALANCE
                if (account.balance === undefined) {
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
                }

                // FETCH ACCOUNT TRANSACTIONS
                if (account.transactions === undefined) {
                        if (!isCard) {
                            fetchAccountTransactions(walletToken, accountID)
                                .then(data => {
                                    if (data) {
                                        updateAccountTransactions(
                                            accountID,
                                            newOrderedDateTreeFromList(
                                                data.map(tx => fromTrueLayerAccountTransaction(tx, accountID)),
                                                tx => new Date(tx.timestamp)
                                            ),
                                        );
                                    }
                                })
                                .catch(err => {
                                    console.error(`Failed to fetch transactions for account ${accountID}:`, err);
                                    setAccountsState(ResponseState.ERROR);
                                });
                        }
                        else {
                            fetchCardTransactions(walletToken, accountID)
                                .then(data => {
                                    if (data) {
                                        updateAccountTransactions(
                                            accountID,
                                            newOrderedDateTreeFromList(
                                                data.map(tx => fromTrueLayerCardTransaction(tx, accountID)),
                                                tx => new Date(tx.timestamp)
                                            ),
                                        );
                                    }
                                })
                                .catch(err => {
                                    console.error(`Failed to fetch transactions for card ${accountID}:`, err);
                                    setAccountsState(ResponseState.ERROR);
                                });
                        }
                }

            });
        }
    }, [accounts, walletTokens]);

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

    function updateAccountTransactions(accountID: string, transactions: OrderedDateTree<Transaction>) {
        if (accounts && accounts[accountID]) {
            setAccountsDataLive(prev => {
                const transactionTree = prev[accountID]?.transactions || new OrderedDateTree<Transaction>();
                transactionTree.graft(transactions);

                return ({
                    ...prev,
                    [accountID]: {
                        ...prev[accountID],
                        transactions: transactionTree,
                    }
                })
            });
            updateTransactions(transactions);
        }
    }

    function updateTransactions(newTransactions: OrderedDateTree<Transaction>) {
        /// XXX: this certainly breaks some React rules
        transactionsTree.graft(newTransactions);
        setTransactionsTree(transactionsTree);
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

    // refs for SegmentedControl segments
    const segmentRefs: RefObject<HTMLDivElement>[] = [
        useRef<HTMLDivElement>(null),
        useRef<HTMLDivElement>(null),
        useRef<HTMLDivElement>(null),
        useRef<HTMLDivElement>(null),
    ];

    // ref for the SegmentedControl container
    const controlRef = useRef<HTMLDivElement>(null);

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
                                src={ modesty ? './MasterBagel-hide.png' : './MasterBagel.png' }
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

                    <div>
                        <SegmentedControl
                            name='primary-group'
                            callback={(val: string) => setPanel(val as 'accounts' | 'transactions')}
                            controlRef={controlRef}
                            segments={[
                                {
                                    label: 'Accounts',
                                    value: 'accounts',
                                    ref: segmentRefs[0]
                                },
                                {
                                    label: 'Transactions',
                                    value: 'transactions',
                                    ref: segmentRefs[1]
                                },
                            ]}
                        />
                    </div>
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

            { panel === 'accounts' &&
                <AccountsPanel
                    accounts={accounts}
                    users={users}
                    providers={providers}
                    accountsSum={accountsSum}
                    modesty={modesty}
                    setOpenEditAccount={setOpenEditAccount}
                    startLinkAccount={startLinkAccount}
                    startCreateAccount={startCreateAccount}
                    footend={footend}
                />
            }

            { panel === 'transactions' &&
                <TransactionsPanel
                    transactionsTree={transactionsTree.getTree()}
                    accounts={accounts}
                    users={users}
                    providers={providers}
                    modesty={modesty}
                    footend={footend}
                />
            }

        </div>
    );
}

export default App;
