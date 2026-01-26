import { describe, test, expect } from 'bun:test';
import { join } from 'path';
import { existsSync } from 'fs';

const stub = (name: string) => join(import.meta.dir, '..', 'data', name);

describe('TransactionsFileHandler', () => {

    test('Cahoot CSV (Midata)', () => {
        expect(existsSync(stub('Cahoot_tx.stub.midata.csv'))).toBe(true);
    });

    test('Cahoot TXT', () => {
        expect(existsSync(stub('Cahoot_tx.stub.txt'))).toBe(true);
    });

    test('First Direct CSV', () => {
        expect(existsSync(stub('FirstDirect_tx.stub.csv'))).toBe(true);
    });

    test('First Direct JSON', () => {
        expect(existsSync(stub('FirstDirect_tx.stub.json'))).toBe(true);
    });

    test('First Direct CSV (Midata)', () => {
        expect(existsSync(stub('FirstDirect_tx.stub.midata.csv'))).toBe(true);
    });

    test('Kingdom Bank CSV (Manual)', () => {
        expect(existsSync(stub('KingdomBank_tx.stub.manual.csv'))).toBe(true);
    });

    test('NatWest (Card) CSV', () => {
        expect(existsSync(stub('Natwest_tx_card.stub.csv'))).toBe(true);
    });

    test('NatWest CSV', () => {
        expect(existsSync(stub('Natwest_tx.stub.csv'))).toBe(true);
    });

});
