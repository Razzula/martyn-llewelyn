import { BankAccount, BankCard, UserSignature } from "./types/Bagel";

export class AccountManager {
    private map: Record<string, BankAccount | BankCard> = {};

    merge(account: BankAccount | BankCard) {
        // merge two instances of an account
        const id = account.account_id;
        const existing = this.map[id];

        if (existing) {
            this.map[id] = {
                ...existing,
                users: this.mergeUsers(existing.users, account.users),
            };
        }
        else {
            this.map[id] = account;
        }
    }

    mergeUsers(existing: UserSignature[], incoming: UserSignature[] = []) {
        // merge users by ID, keeping existing users and adding new ones
        const ids = new Set(existing.map(u => u.id));
        return [...existing, ...incoming.filter(u => !ids.has(u.id))];
    }

    applyTo(prev: Record<string, BankAccount | BankCard>) {
        // merge the current map with the previous state
        const merged = { ...prev };
        for (const id in this.map) {
            if (merged[id]) {
                merged[id] = {
                    ...merged[id],
                    users: this.mergeUsers(merged[id].users, this.map[id].users),
                };
            }
            else {
                merged[id] = this.map[id];
            }
        }
        return merged;
    }
}
