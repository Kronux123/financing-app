import { useSyncExternalStore } from 'react';
import type { Payout } from '@/lib/payout';
import { isPayout } from '@/lib/payout';

export const payoutsStorageKey = 'payouts';

const listeners = new Set<() => void>();

const empty: Payout[] = [];

let currentPayouts: Payout[] = empty;

const notify = (): void => listeners.forEach((listener) => listener());

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const readStorage = (): Payout[] => {
    const stored = window.localStorage.getItem(payoutsStorageKey);

    if (!stored) {
        return empty;
    }

    try {
        const parsed: unknown = JSON.parse(stored);

        if (!Array.isArray(parsed) || !parsed.every(isPayout)) {
            window.localStorage.removeItem(payoutsStorageKey);

            return empty;
        }

        return parsed;
    } catch {
        window.localStorage.removeItem(payoutsStorageKey);

        return empty;
    }
};

/**
 * Hydrated at module load rather than during render, so React reads a stable
 * snapshot. Mirrors `use-budget-plan`.
 *
 * TODO(backend): only records you have touched live here. A scheduled job should
 * be the one creating them, on the server, against a clock the browser cannot
 * move — the rest of the list is derived from the plan on the way in.
 */
if (typeof window !== 'undefined') {
    currentPayouts = readStorage();
}

/** Writes one record, replacing any earlier version of the same payday. */
export const savePayout = (payout: Payout): void => {
    const next = [
        ...currentPayouts.filter((stored) => stored.id !== payout.id),
        payout,
    ];

    window.localStorage.setItem(payoutsStorageKey, JSON.stringify(next));
    currentPayouts = next;
    notify();
};

export const clearPayouts = (): void => {
    window.localStorage.removeItem(payoutsStorageKey);
    currentPayouts = empty;
    notify();
};

/** The records written down so far. Untouched paydays are not in here. */
export function useStoredPayouts(): Payout[] {
    return useSyncExternalStore(
        subscribe,
        () => currentPayouts,
        () => empty,
    );
}
