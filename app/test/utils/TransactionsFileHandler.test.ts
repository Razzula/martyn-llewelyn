import { describe, test, expect, beforeAll } from 'bun:test';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

import TransactionsFileHandler, { FileFormat } from '../../src/utils/TransactionsFileHandler';
import { TrueLayerTransactionCategory } from '../../src/types/TrueLayer';
import { InstrumentType, Transaction } from '../../src/types/Bagel';

import { MOCK_ACCOUNTS } from '../data/accounts';
import { CAHOOT_TX_CSV, CAHOOT_TX_TXT } from '../data/transactions';

const stub = (name: string) => join(import.meta.dir, '..', 'data', name);

describe('TransactionsFileHandler', () => {

    describe('Cahoot CSV (Midata)', () => {
        let parsed: ReturnType<typeof TransactionsFileHandler.parseFromCSV>;
        beforeAll(() => {
            const fileName = 'Cahoot_tx.stub.midata.csv';
            expect(existsSync(stub(fileName))).toBe(true);
            const raw = readFileSync(stub(fileName), 'utf8');
            parsed = TransactionsFileHandler.parseFromCSV(raw);
        });

        test('parse transactions (completeness)', () => {
            const { transactions } = parsed;
            expect(Array.isArray(transactions)).toBe(true);
            expect(transactions.length).toBe(5);
        });
        test('parse transactions (accuracy)', () => {
            const { transactions } = parsed;
            expect(transactions[0]).toEqual(CAHOOT_TX_CSV[0]);
        });
    });

    describe('Cahoot TXT', () => {
        let parsed: ReturnType<typeof TransactionsFileHandler.parseFromTXT>;
        beforeAll(() => {
            const fileName = 'Cahoot_tx.stub.txt';
            expect(existsSync(stub(fileName))).toBe(true);
            const raw = readFileSync(stub(fileName), 'utf8');
            parsed = TransactionsFileHandler.parseFromTXT(raw);
        });

        test('parse transactions (completeness)', () => {
            const { transactions } = parsed;
            expect(Array.isArray(transactions)).toBe(true);
            expect(transactions.length).toBe(5);
        });
        test('parse transactions (accuracy)', () => {
            const { transactions } = parsed;
            expect(transactions[0]).toEqual(CAHOOT_TX_TXT[0]);
        });
        test('parse account', () => {
            const { account } = parsed;
            expect(account).toEqual({
                number: {
                    accountNumber: '5678',
                },
            });
        });
    });

    describe('First Direct CSV', () => {
        let parsed: ReturnType<typeof TransactionsFileHandler.parseFromCSV>;
        let raw: string;
        beforeAll(() => {
            const fileName = 'FirstDirect_tx.stub.csv';
            expect(existsSync(stub(fileName))).toBe(true);
            raw = readFileSync(stub(fileName), 'utf8');
            parsed = TransactionsFileHandler.parseFromCSV(raw);
        });

        const mockTransaction: Partial<Transaction> = {
            transactionID: expect.any(String),
            timestamp: '2026-01-19T00:00:00Z',
            description: 'MY OTHER ACCOUNT   OTHER BANK TO FD',
            amount: 300,
            currency: 'UNKNOWN', // actually GBP, but can't know this without account data
            transactionType: 'UNKNOWN', // actually CREDIT, but can't know this without account data
            transactionCategory: TrueLayerTransactionCategory.UNKNOWN,
            source: FileFormat.CSV,

            runningBalance: 0,
        };

        test('parse transactions (completeness)', () => {
            const { transactions } = parsed;
            expect(Array.isArray(transactions)).toBe(true);
            expect(transactions.length).toBe(5);
        });
        test('parse transactions (accuracy)', () => {
            const { transactions } = parsed;
            expect(transactions[0]).toEqual(mockTransaction);
        });
        // test('parse transactions (accuracy) with account unification', () => {
        //     const { transactions } = TransactionsFileHandler.parseFromCSV(raw, MOCK_ACCOUNTS);
        //     expect(transactions[0]).toEqual({
        //         ...mockTransaction,
        //         currency: 'GBP',
        //         transactionType: 'CREDIT',
        //     });
        // });
    });

    describe('First Direct JSON', () => {
        let parsed: ReturnType<typeof TransactionsFileHandler.parseFromJSON>;
        let raw: string;
        beforeAll(() => {
            const fileName = 'FirstDirect_tx.stub.json';
            expect(existsSync(stub(fileName))).toBe(true);
            raw = readFileSync(stub(fileName), 'utf8');
            parsed = TransactionsFileHandler.parseFromJSON(raw);
        });

        const mockTransaction: Partial<Transaction> = {
            transactionID: expect.any(String),
            timestamp: '2026-01-19T00:00:00Z',
            description: 'MY OTHER ACCOUNT   OTHER BANK TO FD',
            amount: 300,
            currency: 'UNKNOWN', // actually GBP, but can't know this without account data
            transactionType: 'UNKNOWN', // actually CREDIT, but can't know this without account data
            transactionCategory: TrueLayerTransactionCategory.UNKNOWN,
            source: FileFormat.JSON,

            runningBalance: 0,
        };

        test('parse transactions (completeness)', () => {
            const { transactions } = parsed;
            expect(Array.isArray(transactions)).toBe(true);
            expect(transactions.length).toBe(5);
        });
        test('parse transactions (accuracy)', () => {
            const { transactions } = parsed;
            expect(transactions[0]).toEqual(mockTransaction);
        });
        // test('parse transactions (accuracy) with account unification', () => {
        //     const { transactions } = TransactionsFileHandler.parseFromJSON(raw, MOCK_ACCOUNTS);
        //     expect(transactions[0]).toEqual({
        //         ...mockTransaction,
        //         currency: 'GBP',
        //         transactionType: 'CREDIT',
        //     });
        // });
    });

    describe('First Direct CSV (Midata)', () => {
        let parsed: ReturnType<typeof TransactionsFileHandler.parseFromCSV>;
        beforeAll(() => {
            const fileName = 'FirstDirect_tx.stub.midata.csv';
            expect(existsSync(stub(fileName))).toBe(true);
            const raw = readFileSync(stub(fileName), 'utf8');
            parsed = TransactionsFileHandler.parseFromCSV(raw);
        });

        test('parse transactions (completeness)', () => {
            const { transactions } = parsed;
            expect(Array.isArray(transactions)).toBe(true);
            expect(transactions.length).toBe(5);
        });
        test('parse transactions (accuracy)', () => {
            const { transactions } = parsed;
            expect(transactions[0]).toEqual({
                transactionID: expect.any(String),
                timestamp: '2026-01-19T00:00:00Z',
                description: '************************************',
                amount: 300,
                currency: 'GBP',
                transactionType: 'CREDIT',
                transactionCategory: TrueLayerTransactionCategory.CREDIT,
                source: FileFormat.CSV,

                runningBalance: 0,
            });
        });
    });

    describe('Kingdom Bank CSV (Manual)', () => {
        let parsed: ReturnType<typeof TransactionsFileHandler.parseFromCSV>;
        beforeAll(() => {
            const fileName = 'KingdomBank_tx.stub.manual.csv';
            expect(existsSync(stub(fileName))).toBe(true);
            const raw = readFileSync(stub(fileName), 'utf8');
            parsed = TransactionsFileHandler.parseFromCSV(raw);
        });

        test('parse transactions (completeness)', () => {
            const { transactions } = parsed;
            expect(Array.isArray(transactions)).toBe(true);
            expect(transactions.length).toBe(5);
        });
        test('parse transactions (accuracy)[1]', () => {
            const { transactions } = parsed;
            expect(transactions[0]).toEqual({
                transactionID: expect.any(String),
                timestamp: '2026-01-08T00:00:00Z',
                description: 'No description', // TODO can be improved with a mostMeaningfulString
                amount: -1200,
                currency: 'GBP',
                transactionType: 'DEBIT',
                transactionCategory: TrueLayerTransactionCategory.UNKNOWN,
                source: FileFormat.CSV,

                runningBalance: 80.98,
            });
        });
        test('parse transactions (accuracy)[2]', () => {
            const { transactions } = parsed;
            expect(transactions[1]).toEqual({
                transactionID: expect.any(String),
                timestamp: '2025-12-04T00:00:00Z',
                description: 'No description', // TODO can be improved with a mostMeaningfulString
                amount: 44.33,
                currency: 'GBP',
                transactionType: 'CREDIT',
                transactionCategory: TrueLayerTransactionCategory.CREDIT,
                source: FileFormat.CSV,

                runningBalance: 1280.98,
            });
        });
    });

    describe('NatWest (Card) CSV', () => {
        let parsed: ReturnType<typeof TransactionsFileHandler.parseFromCSV>;
        let raw: string;
        beforeAll(() => {
            const fileName = 'Natwest_tx_card.stub.csv';
            expect(existsSync(stub(fileName))).toBe(true);
            raw = readFileSync(stub(fileName), 'utf8');
            parsed = TransactionsFileHandler.parseFromCSV(raw);
        });

        const mockTransaction: Partial<Transaction> = {
            transactionID: expect.any(String),
            timestamp: '2026-01-12T00:00:00Z',
            description: 'TUNNEL.LU.AM',
            amount: -33.25,
            currency: 'UNKNOWN',
            transactionType: 'DEBIT', // negative transaction from a card (inferred from "Account Number")
            transactionCategory: TrueLayerTransactionCategory.UNKNOWN,
            source: FileFormat.CSV,
        };

        test('parse transactions (completeness)', () => {
            const { transactions } = parsed;
            expect(Array.isArray(transactions)).toBe(true);
            expect(transactions.length).toBe(5);
        });
        test('parse transactions (accuracy)', () => {
            const { transactions } = parsed;
            expect(transactions[0]).toEqual(mockTransaction);
        });
        test('parse account', () => {
            const { account } = parsed;
            expect(account).toEqual({
                name: 'My Natwest Card',
                number: {
                    accountNumber: '1234',
                },
                instrumentType: InstrumentType.CARD,
            });
        });
        test('parse transactions (accuracy) with account unification', () => {
            const { transactions } = TransactionsFileHandler.parseFromCSV(raw, MOCK_ACCOUNTS);
            expect(transactions[0]).toEqual({
                ...mockTransaction,
                currency: 'GBP',
                transactionType: 'DEBIT',
            });
        });
    });

    describe('NatWest CSV', () => {
        let parsed: ReturnType<typeof TransactionsFileHandler.parseFromCSV>;
        let raw: string;
        beforeAll(() => {
            const fileName = 'Natwest_tx.stub.csv';
            expect(existsSync(stub(fileName))).toBe(true);
            raw = readFileSync(stub(fileName), 'utf8');
            parsed = TransactionsFileHandler.parseFromCSV(raw);
        });

        const mockTransaction: Partial<Transaction> = {
            transactionID: expect.any(String),
            timestamp: '2026-01-23T00:00:00Z',
            description: 'DOWN RUCK LTD',
            amount: -29.90,
            currency: 'UNKNOWN',
            transactionType: 'DEBIT',
            transactionCategory: TrueLayerTransactionCategory.DIRECT_DEBIT,
            source: FileFormat.CSV,

            runningBalance: 1675.79,
        };

        test('parse transactions (completeness)', () => {
            const { transactions } = parsed;
            expect(Array.isArray(transactions)).toBe(true);
            expect(transactions.length).toBe(5);
        });
        test('parse transactions (accuracy)', () => {
            const { transactions } = parsed;
            expect(transactions[0]).toEqual(mockTransaction);
        });
        test('parse account', () => {
            const { account } = parsed;
            expect(account).toEqual({
                name: 'My Natwest Account',
                number: {
                    accountNumber: '11111111',
                    bankNumber: '11-22-33',
                },
            });
        });
        test('parse transactions (accuracy) with account unification', () => {
            const { transactions } = TransactionsFileHandler.parseFromCSV(raw, MOCK_ACCOUNTS);
            expect(transactions[0]).toEqual({
                ...mockTransaction,
                currency: 'GBP',
            });
        });
    });

});
