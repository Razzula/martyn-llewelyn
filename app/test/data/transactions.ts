import { expect } from 'bun:test';

import { Transaction } from "../../src/types/Bagel";
import { TrueLayerTransactionCategory } from "../../src/types/TrueLayer";
import { FileFormat } from '../../src/utils/TransactionsFileHandler';

/**
 * test/data/Cahoot_tx.stub.midata.csv
 */
export const CAHOOT_TX_CSV: Transaction[] = [
    {
        transactionID: expect.any(String),
        timestamp: '2026-01-26T00:00:00Z',
        description: '**** ******* *** ****** ******* ** **** ********* ********* *** ******** * ******* ** ****',
        amount: -30.95,
        currency: 'UNKNOWN',
        transactionType: 'DEBIT',
        transactionCategory: TrueLayerTransactionCategory.UNKNOWN,

        runningBalance: 3000,
        source: FileFormat.CSV,
    },
    {
        transactionID: expect.any(String),
        timestamp: '2026-01-19T00:00:00Z',
        description: '******** **** ***** *** **** ********',
        amount: 12.46,
        currency: 'UNKNOWN',
        transactionType: 'CREDIT',
        transactionCategory: TrueLayerTransactionCategory.UNKNOWN,

        runningBalance: 3030.95,
        source: FileFormat.CSV,
    },
    {
        transactionID: expect.any(String),
        timestamp: '2026-01-12T00:00:00Z',
        description: '******** **** ***** *** **** ********',
        amount: 12.06,
        currency: 'UNKNOWN',
        transactionType: 'CREDIT',
        transactionCategory: TrueLayerTransactionCategory.UNKNOWN,

        runningBalance: 3018.49,
        source: FileFormat.CSV,
    },
];

/**
 * test/data/Cahoot_tx.stub.txt
 */
export const CAHOOT_TX_TXT: Transaction[] = [
    {
        transactionID: expect.any(String),
        timestamp: '2026-01-26T00:00:00Z',
        description: 'BILL PAYMENT VIA FASTER PAYMENT TO MASTER BAGEL REFERENCE BAGEL INTERNAL , MANDATE NO 0001',
        amount: -30.95,
        currency: 'UNKNOWN',
        transactionType: 'UNKNOWN',
        transactionCategory: TrueLayerTransactionCategory.UNKNOWN,

        runningBalance: 3000,
        source: FileFormat.TXT,
    },
];
