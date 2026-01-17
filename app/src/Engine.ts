import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';

import { TrueLayerClient } from "./lib/TrueLayer";
import { BankAccount, BankAccountBalance, BankAccountPatch, CategoryStat, Channel, generatePatchFromAccount, Transaction, TransactionCategory, User, WalletEntry } from "./types/Bagel";
import { newOrderedDateTreeFromList, OrderedDateTree } from "./types/OrderedDateTree";
import { TrueLayerAccountBalance, TrueLayerAccountTransaction, TrueLayerCardBalance, TrueLayerCardTransaction, TrueLayerProvider } from "./types/TrueLayer";
import { isTauri } from "./utils/tauri";
import { getDatabaseManager } from './utils/DatabaseManager';
import {
    loadOfflineAccountPatchesFromTauri,
    loadOfflineAccountsFromTauri,
    loadUsersFromTauri,
    loadWalletTokensFromTauri as loadWalletEntriesFromTauri,
    saveOfflineAccountPatchesToTauri,
    saveOfflineAccountsToTauri,
    saveUsersToTauri,
} from './lib/localStorage.ts';

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

interface BagelStore<T> {
    get: () => T,
    set: (next: T) => void,
    subscribe: (fn: () => void) => () => boolean;
}

function createBagelStore<T>(initial: T) {
    let value = initial;
    const listeners = new Set<() => void>();

    return {
        get: () => value,
        set: (next: T | ((prev: T) => T)) => {
            const newValue =
                typeof next === 'function' ? (next as (prev: T) => T)(value) : next;

            if (newValue !== value) {
                value = newValue;
                listeners.forEach(fn => fn());
            }
        },
        subscribe: (fn: () => void) => {
            listeners.add(fn);
            return () => listeners.delete(fn);
        }
    };
}

export function useSyncExternalStoreFromBagelStore<T>(store: BagelStore<T>) {
    return useSyncExternalStore(store.subscribe, store.get);
}

function reactToBagelStore(
    effect: () => void,
    dependencies: BagelStore<any>[]
): () => void {
    const runEffect = () => effect(); // wrap effect to always pull fresh values

    // Subscribe to all dependencies
    const unsubscribers = dependencies.map(store => store.subscribe(runEffect));

    runEffect(); // run once initially
    return () => unsubscribers.forEach(unsub => unsub());
}

export const walletEntriesStore = createBagelStore<WalletEntry[]>([]);
export const usersStore = createBagelStore<User[]>([]);

export const providersStore = createBagelStore<Record<string, TrueLayerProvider>>({});
export const accountsStore = createBagelStore<Record<string, BankAccount>>({});
export const accountsDataLiveStore = createBagelStore<Record<string, BankAccount>>({});
export const accountsDataOfflineStore = createBagelStore<Record<string, BankAccount>>({});
export const accountsDataPatchesStore = createBagelStore<Record<string, BankAccountPatch>>({});
export const accountsLoadStateStore = createBagelStore<ResponseState | null>(null);
export const transactionsTreeStore = createBagelStore(new OrderedDateTree<Transaction>());
export const transactionsLoadedRangeStore = createBagelStore<Date>(getMostRecentSunday());

export const categoriesStore = createBagelStore<TransactionCategory[]>([]);
export const channelsStore = createBagelStore<Channel[]>([]);
export const categoryStatsStore = createBagelStore<CategoryStat[]>([]);
export const channelStatsStore = createBagelStore<Record<string, number>>({});

export class Engine {
    /**
     * Singleton instance of the database manager.
     */
    private static instance: Engine | null = null;

    /**
     * Get singleton instance of the database manager, creating and initialising it if needed.
     * @returns DatabaseManager instance
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
    private accountsLoadState = accountsLoadStateStore;
    private transactionsTree = transactionsTreeStore;
    private transactionsLoadedRange = transactionsLoadedRangeStore;

    private categories = categoriesStore;
    private channels = channelsStore;
    private categoryStats = categoryStatsStore;
    private channelStats = channelStatsStore;

    constructor() {
        this.init();

        this.updateOrAddUser = this.updateOrAddUser.bind(this);
        this.deleteUser = this.deleteUser.bind(this);
        this.updateOrAddAccount = this.updateOrAddAccount.bind(this);
        this.deleteOfflineAccount = this.deleteOfflineAccount.bind(this);
    }

    private async init() {
        this.loadWalletEntries();
        this.loadDatabase();
        this.loadUsers();
        this.fetchProviders();
        this.loadOfflineAccounts();
        this.loadOfflineAccountPatches();

        reactToBagelStore(() => {
            // use TrueLayer tokens to fetch account data
            this.fetchLiveAccounts();
        }, [this.walletEntries]);

        reactToBagelStore(() => {
            // maintain unified accounts from all data partitions
            this.unifyAccounts();
        }, [this.accountsDataLive, this.accountsDataOffline, this.accountsDataPatches]);

        reactToBagelStore(() => {
            // use TrueLayer tokens to fetch accounts' balances
            this.fetchAccountsBalances();
        }, [this.walletEntries, this.accounts]);

        reactToBagelStore(() => {
            // use stored account data to update Providers
            this.updateProviders();
        }, [this.accountsDataLive]);

        reactToBagelStore(() => {
            this.calculateChannelStats();
        }, [this.categoryStats]);
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
                    && provider.country === 'uk' // XXX: restrict to UK for now
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

    private unifyAccounts() {
        this.accounts.set(_prev => {
            // start with offline and live data
            const merged: Record<string, BankAccount> = {
                ...(this.accountsDataOffline.get() || {}),
                ...(this.accountsDataLive.get() || {}),
            };
            // apply patches if present
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

    private async fetchAccountsBalances() {
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
                    updateTimestamp: balance.updateTimestamp,
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
            const patch = generatePatchFromAccount(account, this.accountsDataLive.get()[account.id] || emptyBankAccount);
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
