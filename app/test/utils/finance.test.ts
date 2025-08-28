import { expect, test, describe } from 'bun:test';

import { asSortCode, calculateAER, toFinancialString } from '../../src/utils/finance.js';

describe('calculateAER()', async () => {

    test('monthly 4.89% gross gives 5% AER', () => {
        const result = calculateAER(4.89, 1);
        expect(result).toBeCloseTo(5, 2);
    });

    test('quarterly 2.03% gross gives 2.05% AER', () => {
        const result = calculateAER(2.03, 3);
        expect(result).toBeCloseTo(2.05, 2);
    });

    test('annual 5% gross gives 5% AER', () => {
        const result = calculateAER(5, 12);
        expect(result).toBeCloseTo(5, 2);
    });

    test('monthly 0% gross gives 0% AER', () => {
        const result = calculateAER(0, 1);
        expect(result).toBeCloseTo(0, 2);
    });

});

describe('toFinancialString()', () => {
    test('formats number with 2 decimal places and commas', () => {
        expect(toFinancialString(1234567.8)).toBe('1,234,567.80');
        expect(toFinancialString(0)).toBe('0.00');
        expect(toFinancialString(12)).toBe('12.00');
        expect(toFinancialString(12.3456)).toBe('12.35');
    });
});

describe('asSortCode()', () => {
    test('formats plain 6-digit string', () => {
        expect(asSortCode('123456')).toBe('12-34-56');
    });

    test('removes existing formatting and re-applies', () => {
        expect(asSortCode('12-34-56')).toBe('12-34-56');
        expect(asSortCode('12 34 56')).toBe('12-34-56');
    });

    test('ignores extra characters and limits to 6 digits', () => {
        expect(asSortCode('1234567890')).toBe('12-34-56');
        expect(asSortCode('12ab34!56')).toBe('12-34-56');
    });
});
