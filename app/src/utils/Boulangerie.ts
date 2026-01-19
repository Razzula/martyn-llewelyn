import { useSyncExternalStore } from 'react';

export interface Signal<T> {
    get: () => T,
    set: (next: T | ((prev: T) => T)) => void;
    watch: (fn: () => void) => () => void;
}

/**
 * Create a reactive signal.
 * @param initial The initial value
 * @returns The created signal
 */
export function createSignal<T>(initial: T): Signal<T> {
    let value = initial;
    const listeners = new Set<() => void>();

    return {
        get: () => value,
        set: (next: T | ((prev: T) => T)) => {
            const newValue =
                typeof next === 'function' ? (next as (prev: T) => T)(value) : next;

            if (newValue !== value) {
                value = newValue;
                listeners.forEach(fn => fn());
            }
        },
        watch: (fn: () => void) => {
            listeners.add(fn);
            return () => { listeners.delete(fn); };
        }
    };
}

/**
 * Wrapper for useSyncExternalStore to use a Signal in React components.
 */
export function useSyncExternalSignal<T>(store: Signal<T>) {
    return useSyncExternalStore(store.watch, store.get);
}

/**
 * Set up a reaction to changes in one or more signals.
 * @param effect Function to run when signals change
 * @param sources Signals to watch
 * @returns 
 */
function reactToSignal(
    effect: () => void,
    sources: Signal<any>[]
): () => void {
    const runEffect = () => effect(); // wrap effect to always pull fresh values

    // subscribe to all dependencies
    const watchers = sources.map(store => store.watch(runEffect));

    runEffect(); // run once initially
    return () => watchers.forEach(unsub => unsub());
}

/**
 * Base for reactive classes.
 */
export class Boulangerie {
    private cleanups: (() => void)[] = [];

    /**
     * Set up a reaction to changes in one or more signals, including cleanup.
     * @param effect Function to run when signals change
     * @param sources Signals to watch
     * @returns 
     */
    protected reactToSignal(
        effect: () => void,
        sources: Signal<any>[]
    ) {
        this.cleanups.push(reactToSignal(effect, sources));
    }

    /**
     * Clean up all reactions set up by this instance.
     */
    protected cleanUp() {
        this.cleanups.forEach(c => c());
        this.cleanups = [];
    }
}
