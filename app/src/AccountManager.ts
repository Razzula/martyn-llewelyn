import { BankAccount, UserSignature } from "./types/Bagel";

export class AccountManager {
    private map: Record<string, BankAccount > = {};

    merge(account: BankAccount ) {
        // merge two instances of an account
        const id = account.id;
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

    applyTo(prev: Record<string, BankAccount> | null): Record<string, BankAccount> {
        if (prev === null) {
            // if no previous state, return the current map
            return { ...this.map };
        }
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
