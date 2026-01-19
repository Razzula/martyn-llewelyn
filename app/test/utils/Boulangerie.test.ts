import { describe, test, expect, beforeEach } from 'bun:test';
import { createSignal, Boulangerie, type Signal } from '../../src/utils/Boulangerie.js';

describe('Boulangerie and Signals', () => {

    let signal: Signal<number>;

    beforeEach(() => {
        signal = createSignal(0);
    });

    test('createSignal returns initial value', () => {
        expect(signal.get()).toBe(0);
    });

    test('set updates the value', () => {
        signal.set(84631);
        expect(signal.get()).toBe(84631);
    });

    test('set with updater function works', () => {
        signal.set(prev => prev + 5);
        expect(signal.get()).toBe(5);
    });

    test('watch is called on set', () => {
        let called = 0;
        const unsub = signal.watch(() => { called++; });
        signal.set(1);
        expect(called).toBe(1);

        // updating to same value does not trigger
        signal.set(1);
        expect(called).toBe(1);

        signal.set(2);
        expect(called).toBe(2);

        unsub();
        signal.set(3);
        expect(called).toBe(2); // unsubscribed
    });

    test('Boulangerie reacts to signals', () => {
        class TestBakery extends Boulangerie {
            public observed = 0;
            constructor() { super(); }

            start() {
                this.reactToSignal(() => {
                    this.observed = signal.get();
                }, [signal]);
            }
        }

        const bakery = new TestBakery();
        bakery.start();

        expect(bakery.observed).toBe(0);

        signal.set(10);
        expect(bakery.observed).toBe(10);

        signal.set(20);
        expect(bakery.observed).toBe(20);

        bakery.cleanUp();

        signal.set(30);
        expect(bakery.observed).toBe(20); // reaction cleaned up
    });

    test('multiple signals trigger react correctly', () => {
        const s1 = createSignal(1);
        const s2 = createSignal(10);

        class TestBakery extends Boulangerie {
            public sum = 0;
            constructor() { super(); }

            start() {
                this.reactToSignal(() => {
                    this.sum = s1.get() + s2.get();
                }, [s1, s2]);
            }
        }

        const bakery = new TestBakery();
        bakery.start();

        expect(bakery.sum).toBe(1 + 10);

        s1.set(3);
        expect(bakery.sum).toBe(3 + 10);

        s2.set(7);
        expect(bakery.sum).toBe(3 + 7);
    });
});
