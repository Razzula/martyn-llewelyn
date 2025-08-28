import { describe, test, expect } from 'bun:test';

import {
    OrderedDateTree,
    newOrderedDateTreeFromList,
    type OrderedDateTreeStruct,
} from '../../src/types/OrderedDateTree.js';

type Transaction = { transactionID: string; timestamp: string; note?: string }; // minimal stub

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));

describe('OrderedDateTree', () => {

    test('add inserts under year/month/day keys', () => {
        const t = new OrderedDateTree<Transaction>();
        const item: Transaction = { transactionID: 't1', timestamp: d(2025, 8, 28).toISOString() };

        t.add(d(2025, 8, 28), item);

        const tree = t.getTree() as OrderedDateTreeStruct<Transaction>;
        expect(Object.keys(tree)).toEqual(['2025']);
        expect(Object.keys(tree['2025'])).toEqual(['08']);
        expect(Object.keys(tree['2025']['08'])).toEqual(['28']);
        expect(tree['2025']['08']['28'][0]).toEqual(item);
        expect(t.count()).toBe(1);
    });

    test('add de-duplicates by transactionID on same day', () => {
        const t = new OrderedDateTree<Transaction>();
        const when = d(2025, 8, 28);
        const a: Transaction = { transactionID: 'dup', timestamp: when.toISOString() };
        const b: Transaction = { transactionID: 'dup', timestamp: when.toISOString(), note: 'second' };

        t.add(when, a);
        t.add(when, b);

        const leaf = t.getTree()['2025']['08']['28'];
        expect(leaf.length).toBe(1);
        expect(t.count()).toBe(1);
    });

    test('add allows same ID on different days (different buckets)', () => {
        const t = new OrderedDateTree<Transaction>();
        const a: Transaction = { transactionID: 'x', timestamp: d(2025, 8, 27).toISOString() };
        const b: Transaction = { transactionID: 'x', timestamp: d(2025, 8, 28).toISOString() };

        t.add(d(2025, 8, 27), a);
        t.add(d(2025, 8, 28), b);

        expect(t.getTree()['2025']['08']['27'].length).toBe(1);
        expect(t.getTree()['2025']['08']['28'].length).toBe(1);
        expect(t.count()).toBe(2);
    });

    test("graft merges another tree using each item's timestamp", () => {
        const left = new OrderedDateTree<Transaction>();
        const right = new OrderedDateTree<Transaction>();

        const t1: Transaction = { transactionID: 'a', timestamp: d(2025, 8, 26).toISOString() };
        const t2: Transaction = { transactionID: 'b', timestamp: d(2025, 8, 27).toISOString() };
        const t3: Transaction = { transactionID: 'c', timestamp: d(2025, 8, 27).toISOString() };

        left.add(d(2025, 8, 26), t1);
        right.add(d(2025, 8, 27), t2);
        right.add(d(2025, 8, 27), t3);

        left.graft(right);

        expect(left.count()).toBe(3);
        expect(left.getTree()['2025']['08']['26'].map(x => x.transactionID)).toEqual(['a']);
        expect(left.getTree()['2025']['08']['27'].map(x => x.transactionID).sort()).toEqual(['b','c']);
    });

    test('graft respects de-duplication when IDs collide', () => {
        const a = new OrderedDateTree<Transaction>();
        const b = new OrderedDateTree<Transaction>();

        const item: Transaction = { transactionID: 'same', timestamp: d(2025, 8, 28).toISOString() };

        a.add(d(2025, 8, 28), item);
        b.add(d(2025, 8, 28), item);

        a.graft(b);

        expect(a.getTree()['2025']['08']['28'].length).toBe(1);
        expect(a.count()).toBe(1);
    });

    test('newOrderedDateTreeFromList builds the same structure', () => {
        const items: Transaction[] = [
            { transactionID: 't1', timestamp: d(2025, 8, 28).toISOString() },
            { transactionID: 't2', timestamp: d(2025, 8, 28).toISOString() },
            { transactionID: 't3', timestamp: d(2025, 7, 1).toISOString() },
        ];

        const tree = newOrderedDateTreeFromList(items, (it) => new Date(it.timestamp));

        expect(tree.count()).toBe(3);
        expect(tree.getTree()['2025']['08']['28'].map(x => x.transactionID).sort()).toEqual(['t1','t2']);
        expect(tree.getTree()['2025']['07']['01'].map(x => x.transactionID)).toEqual(['t3']);
    });

    test('month/day keys are zero-padded', () => {
        const t = new OrderedDateTree<Transaction>();
        const item: Transaction = { transactionID: 't', timestamp: d(2025, 1, 5).toISOString() };
        t.add(d(2025, 1, 5), item);

        expect(Object.keys(t.getTree()['2025'])).toEqual(['01']);
        expect(Object.keys(t.getTree()['2025']['01'])).toEqual(['05']);
    });
});
