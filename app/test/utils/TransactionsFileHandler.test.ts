import { describe, test, expect, beforeAll } from 'bun:test';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

import TransactionsFileHandler from '../../src/utils/TransactionsFileHandler';
import { TrueLayerTransactionCategory } from '../../src/types/TrueLayer';
import { InstrumentType } from '../../src/types/Bagel';

const stub = (name: string) => join(import.meta.dir, '..', 'data', name);

describe('TransactionsFileHandler', () => {

    describe('File Parsers', () => {

    });

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
            expect(transactions[0]).toEqual({
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
            expect(transactions[0]).toEqual({
                transactionID: expect.any(String),
                timestamp: '2026-01-26T00:00:00Z',
                description: 'BILL PAYMENT VIA FASTER PAYMENT TO MASTER BAGEL REFERENCE BAGEL INTERNAL , MANDATE NO 0001',
                amount: -30.95,
                currency: 'UNKNOWN',
                transactionType: 'UNKNOWN',
                transactionCategory: TrueLayerTransactionCategory.UNKNOWN,

                runningBalance: 3000,
            });
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
        beforeAll(() => {
            const fileName = 'FirstDirect_tx.stub.csv';
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
                description: 'MY OTHER ACCOUNT   OTHER BANK TO FD',
                amount: 300,
                currency: 'UNKNOWN',
                transactionType: 'UNKNOWN', // actually CREDIT, but can't know this without account data
                transactionCategory: TrueLayerTransactionCategory.UNKNOWN,

                runningBalance: 0,
            });
        });
    });

    describe('First Direct JSON', () => {
        let parsed: ReturnType<typeof TransactionsFileHandler.parseFromJSON>;
        beforeAll(() => {
            const fileName = 'FirstDirect_tx.stub.json';
            expect(existsSync(stub(fileName))).toBe(true);
            const raw = readFileSync(stub(fileName), 'utf8');
            parsed = TransactionsFileHandler.parseFromJSON(raw);
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
                description: 'MY OTHER ACCOUNT   OTHER BANK TO FD',
                amount: 300,
                currency: 'UNKNOWN',
                transactionType: 'UNKNOWN', // actually CREDIT, but can't know this without account data
                transactionCategory: TrueLayerTransactionCategory.UNKNOWN,

                runningBalance: 0,
            });
        });
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

                runningBalance: 1280.98,
            });
        });
    });

    describe('NatWest (Card) CSV', () => {
        let parsed: ReturnType<typeof TransactionsFileHandler.parseFromCSV>;
        beforeAll(() => {
            const fileName = 'Natwest_tx_card.stub.csv';
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
                timestamp: '2026-01-12T00:00:00Z',
                description: 'TUNNEL.LU.AM',
                amount: 33.25,
                currency: 'UNKNOWN',
                transactionType: 'UNKNOWN',
                transactionCategory: TrueLayerTransactionCategory.UNKNOWN,
            });
        });
        test('parse account', () => {
            const { account } = parsed;
            expect(account).toEqual({
                name: 'My Card',
                number: {
                    accountNumber: '1234',
                },
                instrumentType: InstrumentType.CARD,
            });
        });
    });

    describe('NatWest CSV', () => {
        let parsed: ReturnType<typeof TransactionsFileHandler.parseFromCSV>;
        beforeAll(() => {
            const fileName = 'Natwest_tx.stub.csv';
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
                timestamp: '2026-01-23T00:00:00Z',
                description: 'DOWN RUCK LTD',
                amount: -29.90,
                currency: 'UNKNOWN',
                transactionType: 'DEBIT',
                transactionCategory: TrueLayerTransactionCategory.DIRECT_DEBIT,

                runningBalance: 1675.79,
            });
        });
        test('parse account', () => {
            const { account } = parsed;
            expect(account).toEqual({
                name: 'My Account',
                number: {
                    accountNumber: '12345678',
                    bankNumber: '11-22-33',
                },
            });
        });
    });

});
