import { describe, test, expect, beforeEach } from 'bun:test';
import requestGate from '../../src/utils/RequestGate.js';

describe('RequestGate', () => {
    let gate = requestGate;

    beforeEach(() => {
        gate.clear(); // reset before each test
    });

    test('runs a request and returns its value', async () => {
        const fn = async () => 42;
        const result = await gate.run('test1', fn);
        expect(result).toBe(42);
    });

    test('caches result for cacheTolerance', async () => {
        let count = 0;
        const fn = async () => { count++; return count; };

        const result1 = await gate.run('cacheTest', fn, 1000); // 1s cache
        const result2 = await gate.run('cacheTest', fn, 1000);

        expect(result1).toBe(1);
        expect(result2).toBe(1); // second call hits cache
        expect(count).toBe(1); // fn only executed once
    });

    test('in-flight deduplication returns same promise', async () => {
        let calls = 0;
        const fn = async () => { calls++; await new Promise(r => setTimeout(r, 50)); return 'ok'; };

        const p1 = gate.run('dedupe', fn);
        const p2 = gate.run('dedupe', fn);

        const [r1, r2] = await Promise.all([p1, p2]);
        expect(r1).toBe('ok');
        expect(r2).toBe('ok');
        expect(calls).toBe(1); // only one request actually ran
    });

    test('clear removes cached entry', async () => {
        let calls = 0;
        const fn = async () => { calls++; return 'val'; };

        await gate.run('toClear', fn, 1000);
        gate.clear('toClear');
        await gate.run('toClear', fn, 1000);

        expect(calls).toBe(2); // second run calls fn again
    });

    test('clear without id removes everything', async () => {
        let callsA = 0;
        let callsB = 0;
        const fnA = async () => { callsA++; return 'A'; };
        const fnB = async () => { callsB++; return 'B'; };

        await gate.run('A', fnA, 1000);
        await gate.run('B', fnB, 1000);
        gate.clear();
        await gate.run('A', fnA, 1000);
        await gate.run('B', fnB, 1000);

        expect(callsA).toBe(2);
        expect(callsB).toBe(2);
    });

    test('handles concurrent cache + dedupe correctly', async () => {
        let calls = 0;
        const fn = async () => { calls++; await new Promise(r => setTimeout(r, 50)); return 'X'; };

        const [r1, r2] = await Promise.all([gate.run('concurrent', fn, 1000), gate.run('concurrent', fn, 1000)]);
        const r3 = await gate.run('concurrent', fn, 1000); // should hit cache

        expect(r1).toBe('X');
        expect(r2).toBe('X');
        expect(r3).toBe('X');
        expect(calls).toBe(1);
    });
});
