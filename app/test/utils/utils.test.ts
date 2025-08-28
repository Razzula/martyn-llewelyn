import { expect, test, describe } from 'bun:test';

import { getMonthName, getOrdinalSuffix } from '../../src/utils/utils.js';

describe('getMonthName()', () => {
    test('returns full month name for valid inputs', () => {
        expect(getMonthName('01')).toBe('January');
        expect(getMonthName('12')).toBe('December');
    });

    test('returns input if invalid', () => {
        expect(getMonthName('0')).toBe('0');
        expect(getMonthName('13')).toBe('13');
        expect(getMonthName('abc')).toBe('abc');
    });
});

describe('getOrdinalSuffix()', () => {
    test('returns correct suffixes', () => {
        expect(getOrdinalSuffix(1)).toBe('st');
        expect(getOrdinalSuffix(2)).toBe('nd');
        expect(getOrdinalSuffix(3)).toBe('rd');
        for (let i = 4; i <= 20; i++) {
            expect(getOrdinalSuffix(i)).toBe('th');
        }
        expect(getOrdinalSuffix(21)).toBe('st');
        expect(getOrdinalSuffix(22)).toBe('nd');
        expect(getOrdinalSuffix(23)).toBe('rd');
        expect(getOrdinalSuffix(112)).toBe('th');
    });
});
