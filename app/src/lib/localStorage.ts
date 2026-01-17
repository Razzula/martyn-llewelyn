import { invoke } from '@tauri-apps/api/core';

import { isTauri } from "../utils/tauri";
import { BankAccount, BankAccountPatch, User, WalletEntry } from 'src/types/Bagel';

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

export async function loadUsersFromTauri() {
    if (isTauri) {
        try {
            const raw: unknown = await invoke('loadJSON', { filename: 'users.json' });
            return JSON.parse(raw as string);
        }
        catch (err) {
            console.error('Failed to load users:', err);
        }
    }
    return [];
}

export async function loadOfflineAccountsFromTauri() {
    if (isTauri) {
        try {
            const raw: unknown = await invoke('loadJSON', { filename: 'accounts.offline.json' });
            return JSON.parse(raw as string);
        }
        catch (err) {
            console.error('Failed to load offline accounts:', err);
        }
    }
    return {};
}

export async function loadOfflineAccountPatchesFromTauri() {
    if (isTauri) {
        try {
            const raw: unknown = await invoke('loadJSON', { filename: 'accounts.patches.json' });
            return JSON.parse(raw as string);
        }
        catch (err) {
            console.error('Failed to load account patches:', err);
        }
    }
    return {};
}

export function saveUsersToTauri(users: User[]) {
    if (users !== null) {
        try {
            invoke('saveJSON', { filename: 'users.json', json: JSON.stringify(users) })
        }
        catch (err) {
            console.error('Failed to save users:', err);
        }
    }
}

export function saveOfflineAccountsToTauri(accounts: Record<string, BankAccount>) {
    if (accounts !== null) {
        try {
            invoke('saveJSON', { filename: 'accounts.offline.json', json: JSON.stringify(accounts) })
        }
        catch (err) {
            console.error('Failed to save users:', err);
        }
    }
}

export function saveOfflineAccountPatchesToTauri(patches: Record<string, BankAccountPatch>) {
    if (patches !== null) {
        try {
            invoke('saveJSON', { filename: 'accounts.patches.json', json: JSON.stringify(patches) })
        }
        catch (err) {
            console.error('Failed to save users:', err);
        }
    }
}
