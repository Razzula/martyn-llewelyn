import { expect, test, describe } from 'bun:test';
import {
    isMobile,
    getMostRecentSunday,
    toYYYYMMDDFromDate,
    isEmptyString,
    isFutureDate
} from '../../src/utils/utils.js';

describe('getMostRecentSunday()', () => {
    test('returns day if it is Sunday and allowFrom=true', () => {
        const sunday = new Date('2026-01-18'); // Sunday
        const result = getMostRecentSunday(sunday, true);
        expect(result.getDay()).toBe(0);
        expect(result.toDateString()).toBe(sunday.toDateString());
    });

    test('returns previous Sunday if day is Sunday and allowFrom=false', () => {
        const sunday = new Date('2026-01-18'); // Sunday
        const result = getMostRecentSunday(sunday, false);
        expect(result.getDay()).toBe(0);
        expect(result.getDate()).toBe(11); // previous Sunday
    });

    test('returns correct Sunday for other days', () => {
        const wednesday = new Date('2026-01-26'); // Wednesday
        const result = getMostRecentSunday(wednesday);
        expect(result.getDay()).toBe(0);
        expect(result.getDate()).toBe(25); // previous Sunday
    });
});

describe('toYYYYMMDD()', () => {
    test('formats date correctly', () => {
        const date = new Date('2026-01-18T15:00:00Z');
        expect(toYYYYMMDDFromDate(date)).toBe('2026-01-18');
    });
});

describe('isEmptyString()', () => {
    test('returns true for undefined, null, or whitespace', () => {
        expect(isEmptyString()).toBe(true);
        expect(isEmptyString('')).toBe(true);
        expect(isEmptyString('   ')).toBe(true);
    });

    test('returns false for non-empty strings', () => {
        expect(isEmptyString('foo')).toBe(false);
        expect(isEmptyString('  bar  ')).toBe(false);
    });
});

describe('isFutureDate()', () => {
    test('returns true for invalid or future dates', () => {
        const future = new Date(Date.now() + 100000).toISOString();
        expect(isFutureDate(future)).toBe(true);
        expect(isFutureDate('invalid')).toBe(true);
        expect(isFutureDate(null)).toBe(true);
        expect(isFutureDate(undefined)).toBe(true);
    });

    test('returns false for past dates', () => {
        const past = new Date(Date.now() - 100000).toISOString();
        expect(isFutureDate(past)).toBe(false);
    });
});
