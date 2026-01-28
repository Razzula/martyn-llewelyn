import { describe, test, expect } from 'bun:test';

import { AccountManager, findAccount } from '../../src/utils/AccountManager.js';
import { BankAccountType, InstrumentType, type BankAccount, type UserSignature } from '../../src/types/Bagel.js';
import { MOCK_ACCOUNTS, NATWEST_ACCOUNT, NATWEST_CARD } from '../data/accounts.js';

const user = (id: string): UserSignature => ({ id });
const account = (id: string, users: UserSignature[] = []): BankAccount => ({
    id,
    name: id,
    instrumentType: InstrumentType.ACCOUNT,
    type: BankAccountType.TRANSACTION,
    users,
    number: {
        number: '',
        iban: undefined,
        swiftBIC: undefined,
        sortCode: undefined
    },
    provider: {
        id: '',
        name: undefined,
        logoURI: undefined
    },
    updateTimestamp: '',
    source: 'TrueLayer',
});

describe('AccountManager', () => {

    test('merge inserts a new account', () => {
        const manager = new AccountManager();
        manager.merge(account('A1', [user('u1')]));
        const out = manager.applyTo(null);
        expect(out['A1'].users.map(x => x.id)).toEqual(['u1']);
    });

    test('merge de-duplicates users by id', () => {
        const manager = new AccountManager();
        manager.merge(account('A1', [user('u1'), user('u2')]));
        manager.merge(account('A1', [user('u2'), user('u3')]));
        const out = manager.applyTo(null);
        expect(out['A1'].users.map(x => x.id).sort()).toEqual(['u1', 'u2', 'u3']);
    });

    test('merge ignores non-user field changes', () => {
        const manager = new AccountManager();
        manager.merge({ ...account('A1', [user('u1')]), name: 'Original' });
        manager.merge({ ...account('A1', [user('u2')]), name: 'IncomingDifferent' });
        const out = manager.applyTo(null);
        expect(out['A1'].name).toBe('Original'); // preserved
        expect(out['A1'].users.map(x => x.id).sort()).toEqual(['u1', 'u2']);
    });

    test('mergeUsers handles undefined incoming', () => {
        const manager = new AccountManager();
        const merged = manager.mergeUsers([user('u1')], undefined);
        expect(merged.map(x => x.id)).toEqual(['u1']);
    });

    test('applyTo(null) returns shallow copy (not internal map ref)', () => {
        const manager = new AccountManager();
        manager.merge(account('A1', [user('u1')]));
        const out = manager.applyTo(null);
        expect(out).not.toBe((manager as any).map);
        expect(out['A1']).toBeDefined();
    });

    test('applyTo merges into previous state and keeps previous fields', () => {
        const prev: Record<string, BankAccount> = {
            A1: { ...account('A1', [user('u1')]), name: 'PrevName' },
            B1: account('B1', [user('b1')]),
        };

        const manager = new AccountManager();
        manager.merge(account('A1', [user('u2')])); // adds u2 to A1
        manager.merge(account('C1', [user('c1')])); // new account

        const merged = manager.applyTo(prev);

        // A1 users merged, name from prev preserved
        expect(merged.A1.name).toBe('PrevName');
        expect(merged.A1.users.map(x => x.id).sort()).toEqual(['u1', 'u2']);

        // B1 untouched
        expect(merged.B1.users.map(x => x.id)).toEqual(['b1']);

        // C1 added
        expect(merged.C1.users.map(x => x.id)).toEqual(['c1']);

        // prev not mutated
        expect(prev.A1.users.map(x => x.id)).toEqual(['u1']);
        expect(Object.keys(prev).sort()).toEqual(['A1', 'B1']);
    });

    describe('findAccount', () => {

        test('search with exact accountNumber', () => {
            const query: Partial<BankAccount> = {
                // see TransactionsFileHandler.test.ts
                name: 'My Natwest Account',
                number: {
                    accountNumber: '11111111',
                    bankNumber: '11-22-33',
                },
            };
            const result = findAccount(query, MOCK_ACCOUNTS);
            expect(result).toEqual(NATWEST_ACCOUNT);
        });

        test('search with exact accountNumber', () => {
            const query: Partial<BankAccount> = {
                // see TransactionsFileHandler.test.ts
                name: 'My Natwest Card',
                number: {
                    accountNumber: '1234',
                },
                instrumentType: InstrumentType.CARD,
            };
            const result = findAccount(query, MOCK_ACCOUNTS);
            expect(result).toEqual(NATWEST_CARD);
        });

        test('search with empty query', () => {
            const query: Partial<BankAccount> = {};
            const result = findAccount(query, MOCK_ACCOUNTS);
            expect(result).toEqual({});
        });

    });

});
