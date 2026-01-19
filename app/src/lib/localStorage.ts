import { invoke } from '@tauri-apps/api/core';

import { isTauri } from "../utils/tauri";
import { BankAccount, BankAccountPatch, User, WalletEntry } from 'src/types/Bagel';

const usersFile = 'users.json';
const accountsOfflineFile = 'accounts.offline.json';
const accountsPatchesFile = 'accounts.patches.json';
const accountsArchiveFile = 'accounts.archive.json';
const accountsCacheFile = 'accounts.cache.json';

export async function loadWalletTokensFromTauri(): Promise<WalletEntry[]> {
    if (isTauri) {
        try {
            const raw: unknown = await invoke('loadWalletTokens');
            const walletEntriesArr = raw as WalletEntry[];
            if (walletEntriesArr.length > 0) {
                return walletEntriesArr;
            }
        }
        catch (err) {
            console.error('Failed to load wallet tokens:', err);
        }
    }
    return [];
}

async function loadJSONFromTauri(filename: string) {
    if (isTauri) {
        try {
            const raw: unknown = await invoke('loadJSON', { filename });
            return JSON.parse(raw as string);
        }
        catch (err) {
            console.error(`Failed to load ${filename}:`, err);
        }
    }
    return {};
}

export async function loadUsersFromTauri() {
    return loadJSONFromTauri(usersFile);
}

export async function loadOfflineAccountsFromTauri() {
    return loadJSONFromTauri(accountsOfflineFile);
}

export async function loadOfflineAccountPatchesFromTauri() {
    return loadJSONFromTauri(accountsPatchesFile);
}

export async function loadOfflineArchiveAccountsFromTauri() {
    return loadJSONFromTauri(accountsArchiveFile);
}

export async function loadLiveAccountCacheFromTauri() {
    return loadJSONFromTauri(accountsCacheFile);
}

function saveJSONToTauri(filename: string, json: Object) {
    if (json !== null) {
        try {
            invoke('saveJSON', { filename, json: JSON.stringify(json) })
        }
        catch (err) {
            console.error('Failed to save users:', err);
        }
    }
}

export function saveUsersToTauri(users: User[]) {
    saveJSONToTauri(usersFile, users);
}

export function saveOfflineAccountsToTauri(accounts: Record<string, BankAccount>) {
    saveJSONToTauri(accountsOfflineFile, accounts);
}

export function saveOfflineAccountPatchesToTauri(patches: Record<string, BankAccountPatch>) {
    saveJSONToTauri(accountsPatchesFile, patches);
}

export function saveOfflineArchiveAccountsToTauri(archives: Record<string, BankAccount>) {
    saveJSONToTauri(accountsArchiveFile, archives);
}

export function saveLiveAccountCacheToTauri(cache: Record<string, BankAccount>) {
    saveJSONToTauri(accountsCacheFile, cache);
}
