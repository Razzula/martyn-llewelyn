import { describe, test, expect } from 'bun:test';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

import TransactionsFileHandler from '../../src/utils/TransactionsFileHandler';
import { TrueLayerTransactionCategory } from '../../src/types/TrueLayer';

const stub = (name: string) => join(import.meta.dir, '..', 'data', name);

describe('TransactionsFileHandler', () => {

    test('Cahoot CSV (Midata)', () => {
        const fileName = 'Cahoot_tx.stub.midata.csv';
        expect(existsSync(stub(fileName))).toBe(true);
        const raw = readFileSync(stub(fileName), 'utf8');

        const { account, transactions } = TransactionsFileHandler.parseFromCSV(raw);

        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBe(5);
        expect(transactions[0]).toMatchObject({
            transactionID: expect.any(String),
            timestamp: '2026-01-26T00:00:00Z',
            description: '**** ******* *** ****** ******* ** **** ********* ********* *** ******** * ******* ** ****',
            amount: -30.95,
            currency: 'UNKNOWN',
            transactionType: 'DEBIT',
            transactionCategory: TrueLayerTransactionCategory.UNKNOWN,

            runningBalance: 3000,
        });
    });

    // test('Cahoot TXT', () => {
    //     const fileName = 'Cahoot_tx.stub.txt';
    //     expect(existsSync(stub(fileName))).toBe(true);
    //     const raw = readFileSync(stub(fileName), 'utf8');

    //     const { account, transactions } = TransactionsFileHandler.parseFromTXT(raw);

    //     expect(Array.isArray(transactions)).toBe(true);
    //     expect(transactions.length).toBe(5);
    //     // expect(transactions[0]).toMatchObject({
    //     //     transactionID: expect.any(String),
    //     //     timestamp: '',
    //     //     description: '',
    //     //     amount: 0,
    //     //     currency: '',
    //     //     transactionType: '',
    //     //     transactionCategory: TrueLayerTransactionCategory.UNKNOWN,
    //     // });
    // });

    test('First Direct CSV', () => {
        const fileName = 'FirstDirect_tx.stub.csv';
        expect(existsSync(stub(fileName))).toBe(true);
        const raw = readFileSync(stub(fileName), 'utf8');

        const { account, transactions } = TransactionsFileHandler.parseFromCSV(raw);

        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBe(5);
        expect(transactions[0]).toMatchObject({
            transactionID: expect.any(String),
            timestamp: '2026-01-19T00:00:00Z',
            description: 'MY OTHER ACCOUNT   OTHER BANK TO FD',
            amount: 300,
            currency: 'UNKNOWN',
            transactionType: 'UNKNOWN', // actually CREDIT, but can't know this without account data
            transactionCategory: TrueLayerTransactionCategory.UNKNOWN,

            runningBalance: 0,
        });
    });

    test('First Direct JSON', () => {
        const fileName = 'FirstDirect_tx.stub.json';
        expect(existsSync(stub(fileName))).toBe(true);
        const raw = readFileSync(stub(fileName), 'utf8');

        const { account, transactions } = TransactionsFileHandler.parseFromJSON(raw);

        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBe(5);
        expect(transactions[0]).toMatchObject({
            transactionID: expect.any(String),
            timestamp: '2026-01-19T00:00:00Z',
            description: 'MY OTHER ACCOUNT   OTHER BANK TO FD',
            amount: 300,
            currency: 'UNKNOWN',
            transactionType: 'UNKNOWN', // actually CREDIT, but can't know this without account data
            transactionCategory: TrueLayerTransactionCategory.UNKNOWN,

            runningBalance: 0,
        });
    });

    test('First Direct CSV (Midata)', () => {
        const fileName = 'FirstDirect_tx.stub.midata.csv';
        expect(existsSync(stub(fileName))).toBe(true);
        const raw = readFileSync(stub(fileName), 'utf8');

        const { account, transactions } = TransactionsFileHandler.parseFromCSV(raw);

        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBe(5);
        expect(transactions[0]).toMatchObject({
            transactionID: expect.any(String),
            timestamp: '2026-01-19T00:00:00Z',
            description: '************************************',
            amount: 300,
            currency: 'GBP',
            transactionType: 'CREDIT',
            transactionCategory: TrueLayerTransactionCategory.CREDIT,

            runningBalance: 0,
        });
    });

    test('Kingdom Bank CSV (Manual)', () => {
        const fileName = 'KingdomBank_tx.stub.manual.csv';
        expect(existsSync(stub(fileName))).toBe(true);
        const raw = readFileSync(stub(fileName), 'utf8');

        const { account, transactions } = TransactionsFileHandler.parseFromCSV(raw);

        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBe(5);
        expect(transactions[0]).toMatchObject({
            transactionID: expect.any(String),
            timestamp: '2026-01-08T00:00:00Z',
            description: 'No description', // TODO can be improved with a mostMeaningfulString
            amount: -1200,
            currency: 'GBP',
            transactionType: 'DEBIT',
            transactionCategory: TrueLayerTransactionCategory.UNKNOWN,

            runningBalance: 80.98,
        });
        expect(transactions[1]).toMatchObject({
            transactionID: expect.any(String),
            timestamp: '2025-12-04T00:00:00Z',
            description: 'No description', // TODO can be improved with a mostMeaningfulString
            amount: 44.33,
            currency: 'GBP',
            transactionType: 'CREDIT',
            transactionCategory: TrueLayerTransactionCategory.CREDIT,

            runningBalance: 1280.98,
        });
    });

    test('NatWest (Card) CSV', () => {
        const fileName = 'Natwest_tx_card.stub.csv';
        expect(existsSync(stub(fileName))).toBe(true);
        const raw = readFileSync(stub(fileName), 'utf8');

        const { account, transactions } = TransactionsFileHandler.parseFromCSV(raw);

        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBe(5);
        expect(transactions[0]).toMatchObject({
            transactionID: expect.any(String),
            timestamp: '2026-01-12T00:00:00Z',
            description: 'TUNNEL.LU.AM',
            amount: 33.25,
            currency: 'UNKNOWN',
            transactionType: 'UNKNOWN',
            transactionCategory: TrueLayerTransactionCategory.UNKNOWN,
        });
        expect(account).toMatchObject({
            name: 'My Card',
            number: {
                accountNumber: '1234',
            },
        });
    });

    test('NatWest CSV', () => {
        const fileName = 'Natwest_tx.stub.csv';
        expect(existsSync(stub(fileName))).toBe(true);
        const raw = readFileSync(stub(fileName), 'utf8');

        const { account, transactions } = TransactionsFileHandler.parseFromCSV(raw);

        expect(Array.isArray(transactions)).toBe(true);
        expect(transactions.length).toBe(5);
        expect(transactions[0]).toMatchObject({
            transactionID: expect.any(String),
            timestamp: '2026-01-23T00:00:00Z',
            description: 'DOWN RUCK LTD',
            amount: -29.90,
            currency: 'UNKNOWN',
            transactionType: 'DEBIT',
            transactionCategory: TrueLayerTransactionCategory.DIRECT_DEBIT,

            runningBalance: 1675.79,
        });
        expect(account).toMatchObject({
            name: 'My Account',
            number: {
                accountNumber: '12345678',
                bankNumber: '11-22-33',
            },
        });
    });

});
