import { describe, test, expect } from 'bun:test';

import { generateTransactionFingerprint, generateTransactionID, generateTransactionIDs } from '../../src/utils/TransactionManager';
import { BankAccount, BankAccountType, InstrumentType, Transaction } from '../../src/types/Bagel';
import { TrueLayerTransactionCategory } from '../../src/types/TrueLayer';
import { CAHOOT_TX_CSV, CAHOOT_TX_TXT } from '../data/transactions';

describe('TransactionManager', () => {

    const DUMMY_ACCOUNT: BankAccount = {
        id: 'ACCOUNT_ID',
        name: 'DUMMY ACCOUNT',
        instrumentType: InstrumentType.ACCOUNT,
        type: BankAccountType.NULL,
        number: {
            accountNumber: '12345678',
            bankNumber: '11-22-33',
        },
        provider: {
            id: '',
        },
        nationalCurrency: '',
        updateTimestamp: '',
        users: [],
        source: 'Bagel',
    };
    const DUMMY_TRANSACTION_1: Transaction = {
        transactionID: 'TRANSACTION_ID',
        timestamp: '',
        description: '****** *****', // "RANDOM SOCKS"
        amount: 0.99,
        currency: '',
        transactionType: '',
        transactionCategory: TrueLayerTransactionCategory.UNKNOWN,
        source: '',

        runningBalance: 42,

        accountID: DUMMY_ACCOUNT.id,
    };
    const DUMMY_TRANSACTION_2: Transaction = {
        transactionID: 'TRANSACTION_ID',
        timestamp: '',
        description: '****** *****', // "GOLDEN ROCKS"
        amount: 0.99,
        currency: '',
        transactionType: '',
        transactionCategory: TrueLayerTransactionCategory.UNKNOWN,
        source: '',

        runningBalance: 42,

        accountID: DUMMY_ACCOUNT.id,
    };

    const TXS_CAHOOT_MIDATA: Transaction[] = CAHOOT_TX_CSV.map(tx => ({
        ...tx,
        accountID: DUMMY_ACCOUNT.id,
    }));
    const TXS_CAHOOT_TXT: Transaction[] = CAHOOT_TX_TXT.map(tx => ({
        ...tx,
        accountID: DUMMY_ACCOUNT.id,
    }));

    describe('Transaction Fingerprint', () => {
        test('Account safeguards', () => {
            const mockAccount: BankAccount = {
                ...DUMMY_ACCOUNT,
                id: 'NOT_ACCOUNT_ID',
            };
            expect(mockAccount.id).not.toEqual(DUMMY_ACCOUNT.id);
            const fingerprint = generateTransactionFingerprint(DUMMY_TRANSACTION_1, mockAccount);
            expect(fingerprint).toBe(null);
        });

        test('reflexivity', () => {
            // use the data of a single (dummy) transaction
            // fingerprints should match
            const fingerprint1 = generateTransactionFingerprint(DUMMY_TRANSACTION_1, DUMMY_ACCOUNT);
            const fingerprint2 = generateTransactionFingerprint(DUMMY_TRANSACTION_1, DUMMY_ACCOUNT);
            expect(fingerprint1).toEqual(fingerprint2);
        });

        test('deduping', () => {
            // use the data of a single (real) transaction, from two separate sources
            // fingerprints should match
            const fingerprint1 = generateTransactionFingerprint(TXS_CAHOOT_MIDATA[0], DUMMY_ACCOUNT);
            const fingerprint2 = generateTransactionFingerprint(TXS_CAHOOT_TXT[0], DUMMY_ACCOUNT);
            expect(fingerprint1).toEqual(fingerprint2);
        });

        test('anti-collision (obvious)', () => {
            // use the data of two very distinct (real) Transactions
            // fingerprints should NOT match
            const fingerprint1 = generateTransactionFingerprint(TXS_CAHOOT_MIDATA[1], DUMMY_ACCOUNT);
            const fingerprint2 = generateTransactionFingerprint(TXS_CAHOOT_MIDATA[2], DUMMY_ACCOUNT);
            expect(fingerprint1).not.toEqual(fingerprint2);
        });

        test('collision (identical)', () => {
            // use the data of two very similar, but unique (dummy) Transactions
            // these are NOT the same, but, their fingerprints should match
            const fingerprint1 = generateTransactionFingerprint(DUMMY_TRANSACTION_1, DUMMY_ACCOUNT);
            const fingerprint2 = generateTransactionFingerprint(DUMMY_TRANSACTION_2, DUMMY_ACCOUNT);
            expect(fingerprint1).toEqual(fingerprint2);
        });
    });

    describe('Transaction ID', () => {
        test('Account safeguards', () => {
            const mockAccount: BankAccount = {
                ...DUMMY_ACCOUNT,
                id: 'NOT_ACCOUNT_ID',
            };
            expect(mockAccount.id).not.toEqual(DUMMY_ACCOUNT.id);
            const id = generateTransactionID(DUMMY_TRANSACTION_1, mockAccount);
            expect(id).toBe(null);
        });

        test('reflexivity', () => {
            // use the data of a single (dummy) transaction
            // IDs should match
            const id1 = generateTransactionID(DUMMY_TRANSACTION_1, DUMMY_ACCOUNT);
            const id2 = generateTransactionID(DUMMY_TRANSACTION_1, DUMMY_ACCOUNT);
            expect(id1).toEqual(id2);
        });

        test('deduping', () => {
            // use the data of a single (real) transaction, from two separate sources
            // IDs should NOT match
            // TODO: is this useful?
            const id1 = generateTransactionID(TXS_CAHOOT_MIDATA[0], DUMMY_ACCOUNT);
            const id2 = generateTransactionID(TXS_CAHOOT_TXT[0], DUMMY_ACCOUNT);
            expect(id1).not.toEqual(id2);
        });

        test('anti-collision (obvious)', () => {
            // use the data of two very distinct (real) Transactions
            // IDs should NOT match
            const id1 = generateTransactionID(TXS_CAHOOT_MIDATA[1], DUMMY_ACCOUNT);
            const id2 = generateTransactionID(TXS_CAHOOT_MIDATA[2], DUMMY_ACCOUNT);
            expect(id1).not.toEqual(id2);
        });

        test('collision (identical) naive', () => {
            // use the data of two very similar, but unique (dummy) Transactions
            // IDs should NOT match, but won't distinguish due to isolation
            const id1 = generateTransactionID(DUMMY_TRANSACTION_1, DUMMY_ACCOUNT);
            const id2 = generateTransactionID(DUMMY_TRANSACTION_2, DUMMY_ACCOUNT);
            expect(id1).toEqual(id2);
        });

        test('collision (identical)', () => {
            // use the data of two very similar, but unique (dummy) Transactions
            // IDs should NOT match
            const [id1, id2] = generateTransactionIDs([
                DUMMY_TRANSACTION_1, DUMMY_TRANSACTION_2,
            ], DUMMY_ACCOUNT);
            expect(id1).not.toEqual(id2);
        });
    });

});
