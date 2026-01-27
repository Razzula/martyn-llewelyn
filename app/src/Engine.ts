import { invoke } from '@tauri-apps/api/core';

import { TrueLayerClient } from "./lib/TrueLayer";
import { BankAccount, BankAccountBalance, BankAccountPatch, CategoryStat, Channel, generatePatchFromAccount, Transaction, TransactionCategory, User, WalletEntry } from "./types/Bagel";
import { newOrderedDateTreeFromList, OrderedDateTree } from "./types/OrderedDateTree";
import { TrueLayerAccountBalance, TrueLayerAccountTransaction, TrueLayerCardBalance, TrueLayerCardTransaction, TrueLayerProvider } from "./types/TrueLayer";
import { isTauri } from "./utils/tauri";
import { getDatabaseManager } from './utils/DatabaseManager';
import {
    loadLiveAccountCacheFromTauri,
    loadOfflineAccountPatchesFromTauri,
    loadOfflineAccountsFromTauri,
    loadUsersFromTauri,
    loadWalletTokensFromTauri as loadWalletEntriesFromTauri,
    saveLiveAccountCacheToTauri,
    saveOfflineAccountPatchesToTauri,
    saveOfflineAccountsToTauri,
    saveUsersToTauri,
} from './lib/localStorage.ts';
import { Boulangerie, createSignal } from './utils/Boulangerie.ts';

import { closedProviders, providerPatches } from './data/providers';

import { defaultChannels, defaultExpenditures, defaultIncomes } from './data/categories.tsx';
import {
    categoryStats as defaultCategoryStats,
    channelStats as defaultChannelStats,
    users as mockUsers,
    walletEntries as mockWalletEntries,
} from './data/TrueLayerMock.ts';
import { getMostRecentSunday, toYYYYMMDD } from './utils/utils.ts';
import { ResponseState } from './App.tsx';
import { AccountManager } from './utils/AccountManager.ts';
import requestGate from './utils/RequestGate.ts';
import { fromTrueLayerAccountBalance, fromTrueLayerAccountTransaction, fromTrueLayerCardBalance, fromTrueLayerCardTransaction } from './types/TrueLayerAdapters.ts';
import { emptyBankAccount } from './data/stubs.ts';

export const walletEntriesStore = createSignal<WalletEntry[]>([]);
export const usersStore = createSignal<User[]>([]);

export const providersStore = createSignal<Record<string, TrueLayerProvider>>({});
export const accountsStore = createSignal<Record<string, BankAccount>>({});
export const accountsDataLiveStore = createSignal<Record<string, BankAccount>>({});
export const accountsDataOfflineStore = createSignal<Record<string, BankAccount>>({});
export const accountsDataPatchesStore = createSignal<Record<string, BankAccountPatch>>({});
export const accountsDataLiveCacheStore = createSignal<Record<string, BankAccount>>({});
export const accountsLoadStateStore = createSignal<ResponseState | null>(null);
export const transactionsTreeStore = createSignal(new OrderedDateTree<Transaction>());
export const transactionsLoadedRangeStore = createSignal<Date>(getMostRecentSunday());

export const categoriesStore = createSignal<TransactionCategory[]>([]);
export const channelsStore = createSignal<Channel[]>([]);
export const categoryStatsStore = createSignal<CategoryStat[]>([]);
export const channelStatsStore = createSignal<Record<string, number>>({});

export class Engine extends Boulangerie {
    /**
     * Singleton instance of the Engine.
     */
    private static instance: Engine | null = null;

    /**
     * Get singleton instance of the Engine, creating and initialising it if needed.
     * @returns Engine instance
     */
    public static get(): Engine {
        if (!Engine.instance) {
            Engine.instance = new Engine();
        }
        return Engine.instance;
    }

    private walletEntries = walletEntriesStore;
    private users = usersStore;

    private providers = providersStore;
    private accounts = accountsStore;
    private accountsDataLive = accountsDataLiveStore;
    private accountsDataOffline = accountsDataOfflineStore;
    private accountsDataPatches = accountsDataPatchesStore;
    private accountsDataLiveCache = accountsDataLiveCacheStore;
    private accountsLoadState = accountsLoadStateStore;
    private transactionsTree = transactionsTreeStore;
    private transactionsLoadedRange = transactionsLoadedRangeStore;

    private categories = categoriesStore;
    private channels = channelsStore;
    private categoryStats = categoryStatsStore;
    private channelStats = channelStatsStore;

    constructor() {
        super();
        this.init();

        this.updateOrAddUser = this.updateOrAddUser.bind(this);
        this.deleteUser = this.deleteUser.bind(this);
        this.updateOrAddAccount = this.updateOrAddAccount.bind(this);
        this.deleteOfflineAccount = this.deleteOfflineAccount.bind(this);
        this.archiveAccount = this.archiveAccount.bind(this);
        this.updateAccountsTransactions = this.updateAccountsTransactions.bind(this);
    }

    private async init() {
        this.loadWalletEntries();
        this.loadDatabase();
        this.loadUsers();
        this.fetchProviders();
        this.loadOfflineAccounts();
        this.loadOfflineAccountPatches();
        this.loadLiveAccountCache();

        this.reactToSignal(() => {
            // use TrueLayer tokens to fetch account data
            this.fetchLiveAccounts();
        }, [this.walletEntries]);

        this.reactToSignal(() => {
            // maintain unified accounts from all data partitions
            this.unifyAccounts();
        }, [this.accountsDataLive, this.accountsDataOffline, this.accountsDataPatches, this.accountsDataLiveCache]);

        this.reactToSignal(() => {
            // use TrueLayer tokens to fetch accounts' balances
            this.fetchAccountsBalancesAndTransactions();
        }, [this.walletEntries, this.accounts]);

        this.reactToSignal(() => {
            // use stored account data to update Providers
            this.updateProviders();
        }, [this.accountsDataLive]);

        this.reactToSignal(() => {
            this.calculateChannelStats();
        }, [this.categoryStats]);

        this.reactToSignal(() => {
            this.saveLiveAccountCache();
        }, [this.accountsDataLive]);
    }

    public async loadWalletEntries() {
        if (isTauri) {
            this.walletEntries.set(await loadWalletEntriesFromTauri());
        }
        else {
            this.walletEntries.set([...mockWalletEntries]);
        }
    }

    private async loadDatabase() {
        if (isTauri) {
            try {
                const dbm = await getDatabaseManager();
                dbm.init()
                dbm.getCategories().then(this.categories.set);
                dbm.getChannels().then(this.channels.set);
                dbm.getCategoryStats().then(this.categoryStats.set);
            }
            catch (err) {
                console.error('Failed to initialise database:', err);
            }
        }
        else {
            this.categories.set([...defaultExpenditures, ...defaultIncomes]);
            this.channels.set([...defaultChannels]);
            this.categoryStats.set(defaultCategoryStats);
            this.channelStats.set(defaultChannelStats);
        }
    }

    private async loadUsers() {
        if (isTauri) {
            this.users.set(await loadUsersFromTauri());
        }
        else {
            this.users.set([...mockUsers]);
        }
    }

    private async fetchProviders() {
        try {
            const providers = await TrueLayerClient.fetchProviders();
            const providersMap: Record<string, TrueLayerProvider> = {};
            // unify TrueLayer's and Bagel's Provider lists
            [...providers, ...closedProviders]
                .filter(provider =>
                    (provider.provider_id !== 'mock' || !isTauri) // remove mock if not needed
                    && (provider.country === 'uk' || provider.country === 'ch') // XXX: restrict to UK for now
                )
                .sort((a, b) => a.display_name.localeCompare(b.display_name))
                .forEach(provider => {
                    providersMap[provider.provider_id] = provider;
                });
            // apply Bagel's patches
            Object.entries(providersMap).forEach(([providerID, provider]) => {
                const patch = providerPatches[providerID];
                if (patch) {
                    Object.assign(provider, patch);
                }
            });

            this.providers.set(providersMap);
        }
        catch (err) {
            console.error('Failed to fetch providers:', err);
        }
    }

    private updateProviders() {
        if (this.accountsDataLive.get()) {
            this.providers.set(prev => {
                // cache account logos for providers
                const newAccounts = { ...this.accountsDataLive.get() };
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
    }

    private async fetchLiveAccounts() {
        if (this.walletEntries.get().length > 0) {
            this.accountsDataLive.set({});
            this.accountsLoadState.set(ResponseState.LOADING); // reset accounts while fetching

            const accountManager = new AccountManager();

            this.walletEntries.get().forEach(walletEntry => {
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
                        this.accountsDataLive.set(prev => accountManager.applyTo(prev));

                        if (this.accountsLoadState.get() !== ResponseState.ERROR) {
                            this.accountsLoadState.set(ResponseState.SUCCESS);
                        }
                    })
                    .catch(err => {
                        console.error(`Failed to fetch for token ${walletEntry}:`, err);
                        this.accountsLoadState.set(ResponseState.ERROR);
                    });
            });
        }
        else {
            this.accountsDataLive.set({});
        }
    }

    private async loadOfflineAccounts() {
        if (isTauri) {
            const offlineAccounts = await loadOfflineAccountsFromTauri();
            this.accountsDataOffline.set(offlineAccounts);
        }
    }

    private async loadOfflineAccountPatches() {
        if (isTauri) {
            const patches = await loadOfflineAccountPatchesFromTauri();
            this.accountsDataPatches.set(patches);
        }
    }

    private async loadLiveAccountCache() {
        if (isTauri) {
            const liveAccountsCache = await loadLiveAccountCacheFromTauri();
            this.accountsDataLiveCache.set(liveAccountsCache);
        }
    }

    private async saveLiveAccountCache() {
        if (isTauri) {
            const accountsLiveDataCache = {
                ...this.accountsDataLiveCache.get(),
                ...this.accountsDataLive.get(),
            };

            const minimalCache: Record<string, Partial<BankAccount>> = {};
            Object.entries(accountsLiveDataCache).forEach(([id, account]: [string, BankAccount]) => {
                // only store minimal data in the cache (i.e. no relational data)
                minimalCache[id] = {
                    id: account.id,
                    name: account.name,
                    instrumentType: account.instrumentType,
                    type: account.type,
                    number: account.number,
                    cardNetwork: account.cardNetwork,
                    provider: account.provider,
                    nationalCurrency: account.nationalCurrency,
                    updateTimestamp: account.updateTimestamp,
                    users: account.users,
                    archived: account.archived,
                    interest: account.interest,
                    url: account.url,
                    
                    balance: account.balance,
                    last: account.last,
                    cached: account.cached,

                    source: 'TrueLayer.cache', // flag cached data
                };
            });
            // only cache real data
            if (Object.keys(minimalCache).length > 0) {
                saveLiveAccountCacheToTauri(minimalCache);
            }
        }
    }

    private unifyAccounts() {
        this.accounts.set(_prev => {
            // start with offline and live data
            const merged: Record<string, BankAccount> = {
                ...(this.accountsDataOffline.get() || {}),
                ...(this.accountsDataLiveCache.get() || {}),
            };
            // patch live data on top of cached data
            if (this.accountsDataLive.get() !== null) {
                Object.entries(this.accountsDataLive.get()).forEach(([id, account]) => {
                    merged[id] = { ...merged[id], ...account };
                });
            }
            // apply patches on top of merged data
            if (this.accountsDataPatches.get() !== null) {
                Object.entries(this.accountsDataPatches.get()).forEach(([id, patch]) => {
                    if (merged[id]) {
                        merged[id] = { ...merged[id], ...patch };
                    }
                });
            }
            return merged;
        });
    }

    private async fetchAccountsBalancesAndTransactions() {
        if (this.walletEntries.get().length === 0 || !this.accounts.get()) {
            return;
        }
        if (Object.keys(this.accounts.get()).length > 0) {

            Object.entries(this.accounts.get()).forEach(([accountID, account]: [string, BankAccount]) => {
                if (account.source !== 'TrueLayer') {
                    // only fetch balances for TrueLayer accounts
                    return;
                }

                const isCard = account.cardNetwork !== undefined;
                const walletToken = account.users?.[0]?.walletToken || this.walletEntries.get()[0]?.walletToken; // XXX: use the first token if not specified

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
                                this.updateAccountBalance(
                                    accountID,
                                    isCard
                                        ? fromTrueLayerCardBalance(entry as TrueLayerCardBalance)
                                        : fromTrueLayerAccountBalance(entry as TrueLayerAccountBalance)
                                );
                            }
                        })
                        .catch(err => {
                            console.error(`Failed to fetch balance for ${isCard ? 'card' : 'account'} ${accountID}:`, err);
                            this.accountsLoadState.set(ResponseState.ERROR);
                        });
                }

                // FETCH ACCOUNT TRANSACTIONS
                if (account.transactions === undefined) {
                    const from = toYYYYMMDD(this.transactionsLoadedRange.get());
                    const to = toYYYYMMDD(new Date());
                    this.updateAccountTransactions(walletToken, accountID, isCard, from, to);
                }

            });
        }
    }

    private updateAccountBalance(accountID: string, balance: BankAccountBalance) {
        if (this.accounts.get() && this.accounts.get()[accountID]) {
            const account = this.accounts.get()[accountID];
            this.accountsDataLive.set(prev => ({
                ...prev,
                [accountID]: {
                    ...account,
                    balance: balance,
                    updateTimestamp: balance.updateTimestamp || new Date().toISOString(),
                },
            }));
        }
    }

    /**
     * For a given account (or card), fetch the required transactions.
     * Make use of RequestGate's request coalescing, to reduce network load.
     */
    private async updateAccountTransactions(walletToken: string, accountID: string, isCard: boolean, from: string, to: string) {
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

            this.handleTransactionLoading(accountID, tree, from, to);
            return tree;
        }
        catch (err) {
            console.error(`Failed to fetch transactions for ${isCard ? 'card' : 'account'} ${accountID}:`, err);
            // setAccountsState(ResponseState.ERROR);
            return null;
        }
    }

    /**
     * For all accounts and cards, fetch the required transactions.
     */
    public async updateAccountsTransactions(from: string, to: string) {
        await Promise.all(Object.entries(this.accounts.get()).map(([accountID, account]: [string, BankAccount]) => {
            if (account.source === 'Bagel') {
                return;
            }
            const walletToken = account.users?.[0]?.walletToken || this.walletEntries.get()[0]?.walletToken; // XXX: use the first token if not specified
            const isCard = account.cardNetwork !== undefined;
            return this.updateAccountTransactions(walletToken, accountID, isCard, from, to);
        }));
    }

    private updateTransactions(newTransactions: OrderedDateTree<Transaction>) {
        /// XXX: this certainly breaks some React rules
        this.transactionsTree.set(prev => prev.graft(newTransactions));
    }

    private handleTransactionLoading(accountID: string, tree: OrderedDateTree<Transaction>, from: string, to: string) {
        if (isTauri) {
            getDatabaseManager().then(dbm => dbm.insertTransactions(tree));
            getDatabaseManager().then(dbm => dbm.getTransactions(from, to).then(dbTree => this.updateAccountTransactionsTree(accountID, dbTree)));
        }
        else {
            // demo has no access to db
            this.updateAccountTransactionsTree(accountID, tree);
        }
    }

    /**
     * Given a new set of transactions for an account, graft them into the existing tree.
     */
    private updateAccountTransactionsTree(accountID: string, transactions: OrderedDateTree<Transaction>) {
        if (this.accounts.get() && this.accounts.get()[accountID]) {
            this.accountsDataLive.set(prev => {
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
        this.updateTransactions(transactions);
    }

    // USER MANAGEMENT

    public updateOrAddUser(user: User) {
        if (this.users.get() !== null) {
            this.users.set(prev => {
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
            saveUsersToTauri(this.users.get());
        }
    }

    public async deleteUser(userID: string) {
        if (this.users.get() !== null) {
            const user = this.users.get().find(u => u.id === userID);
            if (!user) {
                console.warn(`User with ID ${userID} not found.`);
                return;
            }

            // check if user has any linked accounts
            const linkedAccounts = Object.values(this.accounts.get()).filter(account => account.users.some(u => u.id === userID));
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
                // XXX: should revoke token, first
                await invoke('removeWalletTokens', { walletTokens: linkedWalletTokens });
                this.loadWalletEntries();
            }

            // remove user from the list
            this.users.set(prev => (prev ? prev.filter(user => user.id !== userID) : []));
            saveUsersToTauri(this.users.get());
        }
    }

    // ACCOUNT MANAGEMENT
    public updateOrAddAccount(account: BankAccount) {
        if (account.source === 'Bagel') {
            // if it's a manual account, update the offline data
            this.accountsDataOffline.set(prev => ({
                ...(prev || {}),
                [account.id]: account,
            }));
            saveOfflineAccountsToTauri(this.accountsDataOffline.get());
        }
        else {
            // PATCH ACCOUNT
            const originalAccount = account.source === 'TrueLayer' ? this.accountsDataLive.get()[account.id] : this.accountsDataLiveCache.get()[account.id];
            const patch = generatePatchFromAccount(account, originalAccount || emptyBankAccount);
            // if it's a TrueLayer account, patch the live data
            this.accountsDataPatches.set(prev => {
                const prevObj = prev ?? {};
                return {
                    ...prevObj,
                    [account.id]: {
                        ...prevObj[account.id],
                        ...patch,
                    }
                };
            });
            saveOfflineAccountPatchesToTauri(this.accountsDataPatches.get());

            if (account.source === 'TrueLayer.cache') {
                // also update the live cache
                this.accountsDataLiveCache.set(prev => ({
                    ...(prev || {}),
                    [account.id]: {
                        ...prev?.[account.id],
                        ...account,
                    },
                }));
                this.saveLiveAccountCache();
            }
        }
    }

    public deleteOfflineAccount(accountID: string) {
        const account = this.accountsDataOffline.get()?.[accountID];
        if (account) {
            // if it's an offline account, remove it from the offline data
            this.accountsDataOffline.set(prev => {
                const newData = { ...prev };
                delete newData[accountID];
                return newData;
            });
            saveOfflineAccountsToTauri(this.accountsDataOffline.get());
        }
        const patch = this.accountsDataPatches.get()?.[accountID];
        if (patch) {
            // if it's a TrueLayer account, remove the patch
            this.accountsDataPatches.set(prev => {
                const newData = { ...prev };
                delete newData[accountID];
                return newData;
            });
            saveOfflineAccountPatchesToTauri(this.accountsDataPatches.get());
        }
        // currently, we ignore trying to delete a linked account
    }

    public archiveAccount(accountID: string) {
        const account = this.accountsDataOffline.get()?.[accountID];
        if (account) {
            // if it's an offline account, update it
            this.accountsDataOffline.set(prev => {
                const newData = { ...prev };
                newData[accountID] = {
                    ...newData[accountID],
                    archived: !newData[accountID].archived,
                };
                return newData;
            });
            saveOfflineAccountsToTauri(this.accountsDataOffline.get());
        }
        const cache = this.accountsDataLiveCache.get()?.[accountID];
        if (cache) {
            // if it's a cached account, update it
            this.accountsDataLiveCache.set(prev => {
                const newData = { ...prev };
                newData[accountID] = {
                    ...newData[accountID],
                    archived: !newData[accountID].archived,
                };
                return newData;
            });
            this.saveLiveAccountCache();
        }
        // currently, we ignore trying to delete a linked account
    }

    // STATS
    private calculateChannelStats() {
        if (this.categoryStats.get()) {
            const channelStats: Record<string, number> = {};
            this.categoryStats.get().forEach(stat => {
                if (channelStats?.[stat.channelID]) {
                    channelStats[stat.channelID] += stat.totalAmount;
                }
                else {
                    channelStats[stat.channelID] = stat.totalAmount;
                }
            });
            this.channelStats.set(channelStats);
        }
    }

}
