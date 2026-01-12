import { RefObject, useEffect, useRef, useState } from 'react';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { invoke } from '@tauri-apps/api/core';

import { TrueLayerClient } from './lib/TrueLayer.ts';

import { BankAccount, BankAccountBalance, BankAccountPatch, CategoryStat, Channel, generatePatchFromAccount, WalletEntry, Transaction, TransactionCategory, User } from './types/Bagel.ts';
import { ResponsiveModal } from './components/common/ResponsiveModal.tsx';
import { AccountManager } from './utils/AccountManager.ts';
import { fromTrueLayerAccountBalance, fromTrueLayerAccountTransaction, fromTrueLayerCardBalance, fromTrueLayerCardTransaction } from './types/TrueLayerAdapters.ts';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/common/Tooltip.tsx';
import { TrueLayerAccountBalance, TrueLayerAccountTransaction, TrueLayerCardBalance, TrueLayerCardTransaction, TrueLayerProvider } from './types/TrueLayer.ts';
import { closedProviders } from './data/providers.ts';
import { isTauri, openInBrowser } from './utils/tauri.ts';
import AccountEditPanel from './components/AccountEditPanel.tsx';

import './styles/App.css';
import { emptyBankAccount } from './data/stubs.ts';
import UserEditPanel from './components/UserEditPanel.tsx';
import SegmentedControl from './components/common/SegmentedControl.tsx';
import AccountsPanel from './components/AccountsPanel.tsx';
import TransactionsPanel from './components/TransactionsPanel.tsx';
import { newOrderedDateTreeFromList, OrderedDateTree } from './types/OrderedDateTree.ts';
import { ToggleSwitch } from './components/common/ToggleSwitch.tsx';
import { WiggleWrapper } from './components/common/WiggleWrapper.tsx';
import Spinner from './components/common/Spinner.tsx';
import { RadioButtons, ToggleButton } from './components/common/RadioButtons.tsx';
import { categoryStats as defaultCategoryStats, channelStats as defaultChannelStats } from './data/TrueLayerMock.ts';

import VisibilityIcon from './assets/icons/Visibility.svg?react';
import VisibilityOffIcon from './assets/icons/VisibilityOff.svg?react';
import { getMostRecentSunday, isMobile, toYYYYMMDD } from './utils/utils.ts';

import requestGate from './utils/RequestGate.ts';
import { getDatabaseManager } from './utils/DatabaseManager.ts';

import Ascending from './assets/icons/Ascending.svg?react';
import Descending from './assets/icons/Descending.svg?react';
import MoneyBag from './assets/icons/MoneyBag.svg?react';
import Alpha from './assets/icons/SortByAlpha.svg?react';
import Bank from './assets/icons/Bank.svg?react';
import Users from './assets/icons/Users.svg?react';
import List from './assets/icons/List.svg?react';
import GridView from './assets/icons/GridView.svg?react';
import Waterfall from './assets/icons/Waterfall.svg?react';
import Category from './assets/icons/Category.svg?react';
import { defaultChannels, defaultExpenditures, defaultIncomes } from './data/categories.tsx';
import DashboardPanel from './components/DashboardPanel.tsx';

enum ResponseState {
    LOADING = 'LOADING',
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
}

export type AppSettings = {
    accounts: {
        sortBy: 'name' | 'balance',
        sortOrder: 'asc' | 'desc',
        groupBy?: 'bank' | 'user' | 'type',
    },
    transactions: {
        displayAs: 'list' | 'grid' | 'waterfall',
    },
    global: {
        modesty: boolean,
    },
}

const defaultAppSettings = (): AppSettings => ({
    accounts: {
        sortBy: 'balance',
        sortOrder: 'desc',
    },
    transactions: {
        displayAs: 'list',
    },
    global: {
        modesty: true,
    },
});

function App() {

    const [panel, setPanel] = useState<'dashboard' | 'accounts' | 'transactions' | 'standing'>('dashboard');

    const [users, setUsers] = useState<User[] | null>(null);
    const [providers, setProviders] = useState<Record<string, TrueLayerProvider>>({});

    const [accounts, setAccounts] = useState<Record<string, (BankAccount)>>({});
    const [accountsState, setAccountsState] = useState<ResponseState | null>(null);

    const [accountsDataLive, setAccountsDataLive] = useState<Record<string, BankAccount>>({});
    const [accountsDataOffline, setAccountsDataOffline] = useState<Record<string, BankAccount> | null>(null);
    const [accountsDataPatches, setAccountsDataPatches] = useState<Record<string, BankAccountPatch> | null>(null);

    const [transactionsTree, setTransactionsTree] = useState<OrderedDateTree<Transaction>>(new OrderedDateTree<Transaction>());
    const [transactionsLoadedRange, setTransactionsLoadedRange] = useState<Date>(getMostRecentSunday());

    const [walletEntries, setWalletEntries] = useState<WalletEntry[]>([]);

    const [openSelectUser, setOpenSelectUser] = useState<((userID: string, userEmail: string) => void) | null>(null); // holds a function to redirect after user selection
    const [openEditUser, setOpenEditUser] = useState<((userID: string, userEmail: string) => void) | null>(null); // holds a function to redirect after user creation
    const [openEditAccount, setOpenEditAccount] = useState<BankAccount | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings());

    const [categories, setCategories] = useState<TransactionCategory[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);

    const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
    const [channelStats, setChannelStats] = useState<Record<string, number>>({});

    useEffect(() => {
        // HANDLE SETUP

        // LOAD PROVIDERS
        TrueLayerClient.fetchProviders()
            .then((providers: TrueLayerProvider[]) => {
                const providersMap: Record<string, TrueLayerProvider> = {};
                [...providers, ...closedProviders]
                    .filter(provider =>
                        (provider.provider_id !== 'mock' || !isTauri) // remove mock if not needed
                        && provider.country === 'uk' // XXX: restrict to UK for now
                    )
                    .sort((a, b) => a.display_name.localeCompare(b.display_name))
                    .forEach(provider => {
                        providersMap[provider.provider_id] = provider;
                    });
                setProviders(providersMap);
            })
            .catch(err => {
                console.error('Failed to fetch providers:', err);
            });

        if (isTauri) {
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
                .then((walletEntries: unknown) => {
                    const walletEntriesArr = walletEntries as WalletEntry[];
                    if (walletEntriesArr.length > 0) {
                        setWalletEntries(walletEntriesArr);
                    }
                })
                .catch(err => {
                    console.error('Failed to load wallet tokens:', err);
                });

            // SQLite
            getDatabaseManager().then(dbm => {
                dbm.init().catch(err => {
                    console.error('Failed to initialise database:', err);
                })
                dbm.getCategories().then(setCategories);
                dbm.getChannels().then(setChannels);
                dbm.getCategoryStats().then(setCategoryStats);
            });
        }
        else {
            // in browser, use a demo token
            setUsers([
                {
                    id: 'mock-user-1',
                    name: 'Demo User 1',
                    icon: './Serenity/rubberducky.png',
                    email: 'martyn-llewelyn@razzula.github.io',
                },
                {
                    id: 'mock-user-2',
                    name: 'Demo User 2',
                    icon: './Serenity/hwyaden.png',
                    email: 'martyn-llewelyn@razzula.github.io',
                },
            ]);
            setWalletEntries([
                { walletToken: 'mock-user-1', userID: 'mock-user-1', consentedAt: 0, },
                { walletToken: 'mock-user-2', userID: 'mock-user-1', consentedAt: 0, },
            ]);
            setCategories([...defaultExpenditures, ...defaultIncomes]);
            setChannels([...defaultChannels]);
            setCategoryStats(defaultCategoryStats);
            setChannelStats(defaultChannelStats);
        }

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
                TrueLayerClient.handleTokenExchange(code, state)
                    .then((walletEntry: WalletEntry) => {
                        setWalletEntries(prev => [...prev, walletEntry]);
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
        if (walletEntries.length > 0) {
            console.debug('Wallet Entries:', walletEntries);
            setAccountsDataLive({});
            setAccountsState(ResponseState.LOADING); // reset accounts while fetching

            const accountManager = new AccountManager();

            walletEntries.forEach(walletEntry => {
                Promise.all([
                    // fetch accounts and cards data
                    TrueLayerClient.fetchAccountsData(walletEntry.walletToken),
                    TrueLayerClient.fetchCardsData(walletEntry.walletToken)
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
                        console.error(`Failed to fetch for token ${walletEntry}:`, err);
                        setAccountsState(ResponseState.ERROR);
                    });
            });
        }
        else {
            setAccountsDataLive({});
        }
    }, [walletEntries]);

    useEffect(() => {
        // FETCH ACCOUNT BALANCES
        if (walletEntries.length === 0 || !accounts) return;

        if (Object.keys(accounts).length > 0) {

            Object.entries(accounts).forEach(([accountID, account]: [string, BankAccount]) => {
                if (account.source !== 'TrueLayer') {
                    // only fetch balances for TrueLayer accounts
                    return;
                }

                const isCard = account.cardNetwork !== undefined;
                const walletToken = account.users?.[0]?.walletToken || walletEntries[0]?.walletToken; // XXX: use the first token if not specified

                // FETCH ACCOUNT BALANCE
                if (account.balance === undefined) {
                    const request = isCard
                        ? () => TrueLayerClient.fetchCardBalance(walletToken, accountID)
                        : () => TrueLayerClient.fetchAccountBalance(walletToken, accountID);

                    requestGate.run<TrueLayerCardBalance[] | TrueLayerAccountBalance[]>(
                        `bl:${accountID}`,
                        request,
                        10 * 60 * 1000,
                    )
                        .then((data) => {
                            if (data) {
                                const entry = data[0];
                                updateAccountBalance(
                                    accountID,
                                    isCard
                                        ? fromTrueLayerCardBalance(entry as TrueLayerCardBalance)
                                        : fromTrueLayerAccountBalance(entry as TrueLayerAccountBalance)
                                );
                            }
                        })
                        .catch(err => {
                            console.error(`Failed to fetch balance for ${isCard ? 'card' : 'account'} ${accountID}:`, err);
                            setAccountsState(ResponseState.ERROR);
                        });
                }

                // FETCH ACCOUNT TRANSACTIONS
                if (account.transactions === undefined) {
                    const from = toYYYYMMDD(transactionsLoadedRange);
                    const to = toYYYYMMDD(new Date());
                    updateAccountTransactions(walletToken, accountID, isCard, from, to);
                }

            });
        }
    }, [accounts, walletEntries]);

    useEffect(() => {
        if (categoryStats) {
            const channelStats: Record<string, number> = {};
            categoryStats.forEach(stat => {
                if (channelStats?.[stat.channelID]) {
                    channelStats[stat.channelID] += stat.totalAmount;
                }
                else {
                    channelStats[stat.channelID] = stat.totalAmount;
                }
            });
            setChannelStats(channelStats);
        }
    }, [categoryStats])

    function redirectToTrueLayer(userID: string, userEmail: string) {
        if (userID !== null) {
            TrueLayerClient.getTrueLayerAuthURL(userID, userEmail)
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

    /**
     * Given a new set of transactions for an account, graft them into the existing tree.
     */
    function updateAccountTransactionsTree(accountID: string, transactions: OrderedDateTree<Transaction>) {
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
        }
        updateTransactions(transactions);
    }

    /**
     * For a given account (or card), fetch the required transactions.
     * Make use of RequestGate's request coalescing, to reduce network load.
     */
    async function updateAccountTransactions(walletToken: string, accountID: string, isCard: boolean, from: string, to: string) {
        const request = isCard
            ? () => TrueLayerClient.fetchCardTransactions(walletToken, accountID, from, to)
            : () => TrueLayerClient.fetchAccountTransactions(walletToken, accountID, from, to);
        const mapping = isCard
            ? (tx: TrueLayerCardTransaction, accountID: string | undefined) => fromTrueLayerCardTransaction(tx, accountID)
            : (tx: TrueLayerAccountTransaction, accountID: string | undefined) => fromTrueLayerAccountTransaction(tx, accountID);

        try {
            const data = await requestGate.run(
                `tx:${accountID}:${from}:${to}`,
                request,
                10 * 60 * 1000,
            );

            if (!data) {
                return null;
            }
            const tree = newOrderedDateTreeFromList(
                data.map(tx => mapping(tx, accountID)),
                tx => new Date(tx.timestamp)
            );

            handleTransactionLoading(accountID, tree, from, to);
            return tree;
        }
        catch (err) {
            console.error(`Failed to fetch transactions for ${isCard ? 'card' : 'account'} ${accountID}:`, err);
            setAccountsState(ResponseState.ERROR);
            return null;
        }
    }

    /**
     * For all accounts and cards, fetch the required transactions.
     */
    async function updateAccountsTransactions(from: string, to: string) {
        await Promise.all(Object.entries(accounts).map(([accountID, account]: [string, BankAccount]) => {
            const walletToken = account.users?.[0]?.walletToken || walletEntries[0]?.walletToken; // XXX: use the first token if not specified
            const isCard = account.cardNetwork !== undefined;
            return updateAccountTransactions(walletToken, accountID, isCard, from, to);
        }));
    }

    function updateTransactions(newTransactions: OrderedDateTree<Transaction>) {
        /// XXX: this certainly breaks some React rules
        setTransactionsTree(prev => prev.graft(newTransactions));
    }

    function handleTransactionLoading(accountID: string, tree: OrderedDateTree<Transaction>, from: string, to: string) {
        if (isTauri) {
            getDatabaseManager().then(dbm => dbm.insertTransactions(tree));
            getDatabaseManager().then(dbm => dbm.getTransactions(from, to).then(dbTree => updateAccountTransactionsTree(accountID, dbTree)));
        }
        else {
            // demo has no access to db
            updateAccountTransactionsTree(accountID, tree);
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
                setWalletEntries(prev =>
                    prev.filter(walletEntry => !linkedWalletTokens.includes(walletEntry.walletToken))
                );
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
                    src='./Finance/OpenBanking-Logo.svg'
                    alt='Open Banking'
                    onClick={() => openInBrowser('https://www.openbanking.org.uk')}
                />
            </div>
        </div>
    );

    return (
        <div
            id='app'
            style={{
                marginTop: isMobile() ? '2.2rem' : 0,
            }}
        >

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

            <div className='header'>

                {!isTauri &&
                    <div className='banner'>
                        <p>
                            You are running a browser version of the app. This only supports a limited demo mode, and does not support access to any real accounts.
                            Nothing will be saved, and no real data can be fetched from any banks.
                        </p>
                        <p className='small'>
                            Please refer
                            to <a href='https://github.com/Razzula/martyn-llewelyn'>https://github.com/Razzula/martyn-llewelyn</a> for
                            more information.
                        </p>
                    </div>
                }

                <div className='headerGrid'>

                    {/* USER BUTTONS */}
                    <div className='headerLeft'>
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
                    <div className='headerCentre'>
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
                                <Spinner useOverlay />
                            </div>
                        }
                        {accountsState === ResponseState.SUCCESS &&
                            <div className='column'>
                                <div
                                    className='floatBubble'
                                    style={{
                                        paddingTop: isMobile() ? '-10px' : 0,
                                    }}
                                >
                                    <WiggleWrapper
                                        balloonMs={2000}
                                        balloonElement={<img src='./Serenity/Heart.png' alt='❤️' style={{ width: '50px', height: '50px' }} />}
                                    >
                                        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                            <img
                                                className={`hat ${appSettings.global.modesty ? 'lowered' : ''}`}
                                                src='./MasterBagel-Hat.png'
                                                alt='Master Bagel'
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                            />
                                            <img
                                                src='./MasterBagel-Body.png'
                                                alt='Master Bagel'
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                            />
                                        </div>
                                    </WiggleWrapper>
                                </div>
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

                    {/* WINDOW CONTROLS */}
                    <div className='headerRight'>
                        {/* MODESTY */}
                        <Tooltip placement='left'>
                            <TooltipTrigger>
                                <div>
                                    <ToggleSwitch
                                        isOn={!appSettings.global.modesty}
                                        handleToggle={() => setAppSettings(prev => ({
                                            ...prev,
                                            global: {
                                                ...prev.global,
                                                modesty: !prev.global.modesty,
                                            },
                                        }))}
                                        iconOn={<VisibilityIcon />}
                                        iconOnColour='#ea4335'
                                        iconOff={<VisibilityOffIcon />}
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {appSettings.global.modesty ? 'Show balances' : 'Hide balances'}
                            </TooltipContent>
                        </Tooltip>

                        {/* ACCOUNTS WINDOW SETTINGS */}
                        {panel === 'accounts' &&
                            <div className='row'>
                                {/* Order Accounts */}
                                <RadioButtons
                                    options={[
                                        { key: 'balance', desc: 'Sort by Balance', icon: <MoneyBag /> },
                                        { key: 'name', desc: 'Sort by Name', icon: <Alpha /> },
                                    ]}
                                    selected={appSettings.accounts.sortBy}
                                    setSelected={(key: string) => setAppSettings(prev => ({
                                        ...prev,
                                        accounts: {
                                            ...prev.accounts,
                                            sortBy: key as AppSettings['accounts']['sortBy']
                                        },
                                    }))}
                                    tooltipPlacement='bottom'
                                    iconOnColour='green'
                                    iconOffColour='#e3e3e3'
                                />
                                <div className='verticalSeparator' />
                                <ToggleButton
                                    options={[
                                        { key: 'asc', desc: 'Ascending', icon: <Ascending />, iconColour: 'green' },
                                        { key: 'desc', desc: 'Descending', icon: <Descending />, iconColour: 'red' },
                                    ]}
                                    selected={appSettings.accounts.sortOrder}
                                    setSelected={(key: string) => setAppSettings(prev => ({
                                        ...prev,
                                        accounts: {
                                            ...prev.accounts,
                                            sortOrder: key as AppSettings['accounts']['sortOrder']
                                        },
                                    }))}
                                    tooltipPlacement='bottom'
                                />
                            </div>
                        }

                        {panel === 'accounts' &&
                            <RadioButtons
                                options={[
                                    {
                                        key: 'bank',
                                        desc: `${appSettings.accounts.groupBy === 'bank' ? 'Grouped' : 'Group'} by Provider`,
                                        icon: <Bank />,
                                    },
                                    {
                                        key: 'user',
                                        desc: `${appSettings.accounts.groupBy === 'user' ? 'Grouped' : 'Group'} by User`,
                                        icon: <Users />,
                                    },
                                    {
                                        key: 'type',
                                        desc: `${appSettings.accounts.groupBy === 'bank' ? 'Grouped' : 'Group'} by Type`,
                                        icon: <Category />,
                                    },
                                ]}
                                selected={appSettings.accounts.groupBy}
                                setSelected={(key: string) => setAppSettings(prev => ({
                                    ...prev,
                                    accounts: {
                                        ...prev.accounts,
                                        groupBy: (prev.accounts.groupBy === key ? undefined : key) as AppSettings['accounts']['groupBy']
                                    },
                                }))}
                                tooltipPlacement='bottom'
                                iconOnColour='green'
                                iconOffColour='#e3e3e3'
                            />
                        }
                        {panel === 'transactions' &&
                            <RadioButtons
                                options={[
                                    {
                                        key: 'list',
                                        desc: 'List View',
                                        icon: <List />,
                                    },
                                    {
                                        key: 'grid',
                                        desc: 'Grid View',
                                        icon: <GridView />,
                                    },
                                    {
                                        key: 'waterfall',
                                        desc: 'Waterfall View',
                                        icon: <Waterfall />,
                                    },
                                ]}
                                selected={appSettings.transactions.displayAs}
                                setSelected={(key: string) => setAppSettings(prev => ({
                                    ...prev,
                                    transactions: {
                                        ...prev.transactions,
                                        displayAs: key as AppSettings['transactions']['displayAs']
                                    },
                                }))}
                                tooltipPlacement='bottom'
                                iconOnColour='green'
                                iconOffColour='#e3e3e3'
                            />
                        }

                    </div>

                    {/* PRIMARY CONTROLS */}
                    <div className='headerControls'>
                        <SegmentedControl
                            name='primaryGroup'
                            callback={(val: string) => setPanel(val as 'accounts' | 'transactions')}
                            controlRef={controlRef}
                            segments={[
                                {
                                    label: 'Dashboard',
                                    value: 'dashboard',
                                    ref: segmentRefs[0]
                                },
                                {
                                    label: 'Accounts',
                                    value: 'accounts',
                                    ref: segmentRefs[1]
                                },
                                {
                                    label: 'Transactions',
                                    value: 'transactions',
                                    ref: segmentRefs[2]
                                },
                                // {
                                //     label: 'Standing',
                                //     value: 'standing',
                                //     ref: segmentRefs[3]
                                // },
                            ]}
                        />
                    </div>

                </div>
            </div>

            <div className='body'>
                {panel === 'dashboard' &&
                    <DashboardPanel
                        accounts={accounts}
                        modesty={appSettings.global.modesty}
                        categories={categories}
                        channels={channels}
                        categoryStats={categoryStats}
                        channelStats={channelStats}
                    />
                }
                {panel === 'accounts' &&
                    <AccountsPanel
                        accounts={accounts}
                        users={users}
                        providers={providers}
                        modesty={appSettings.global.modesty}
                        windowSettings={appSettings.accounts}
                        setOpenEditAccount={setOpenEditAccount}
                        startLinkAccount={startLinkAccount}
                        startCreateAccount={startCreateAccount}
                        footend={footend}
                    />
                }
                {panel === 'transactions' &&
                    <TransactionsPanel
                        transactionsTree={transactionsTree.getTree()}
                        accounts={accounts}
                        users={users}
                        providers={providers}
                        modesty={appSettings.global.modesty}
                        windowSettings={appSettings.transactions}
                        footend={footend}
                        updateAccountsTransactions={updateAccountsTransactions}
                        transactionsLoadedRange={transactionsLoadedRange} setTransactionsLoadedRange={setTransactionsLoadedRange}

                        categories={categories} channels={channels}
                    />
                }
                {panel === 'standing' &&
                    <div>UNDER CONSTRUCTION...</div>
                }
            </div>
        </div>
    );
}

export default App;
