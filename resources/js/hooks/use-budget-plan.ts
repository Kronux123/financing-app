import { useSyncExternalStore } from 'react';
import type { BudgetPlan } from '@/lib/budget';
import { isBudgetPlan } from '@/lib/budget';

export const budgetPlanStorageKey = 'budgetPlan';

/** Written by the old finance settings form, read by nothing. Cleared on load. */
const retiredStorageKey = 'financeSettings';

const listeners = new Set<() => void>();

let currentPlan: BudgetPlan | null = null;

const notify = (): void => listeners.forEach((listener) => listener());

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const readStorage = (): BudgetPlan | null => {
    const stored = window.localStorage.getItem(budgetPlanStorageKey);

    if (!stored) {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(stored);

        if (!isBudgetPlan(parsed)) {
            window.localStorage.removeItem(budgetPlanStorageKey);

            return null;
        }

        return parsed;
    } catch {
        window.localStorage.removeItem(budgetPlanStorageKey);

        return null;
    }
};

/**
 * Hydrates at module load rather than during render, so the snapshot React
 * reads is a stable reference. `useSyncExternalStore` bridges the gap between
 * the server's null and this value without a hydration mismatch.
 */
if (typeof window !== 'undefined') {
    currentPlan = readStorage();
    window.localStorage.removeItem(retiredStorageKey);
}

export const saveBudgetPlan = (plan: BudgetPlan): void => {
    window.localStorage.setItem(budgetPlanStorageKey, JSON.stringify(plan));
    currentPlan = plan;
    notify();
};

export const clearBudgetPlan = (): void => {
    window.localStorage.removeItem(budgetPlanStorageKey);
    currentPlan = null;
    notify();
};

/**
 * The last saved plan, or `null` when nothing has been saved yet. Shared across
 * pages, so saving on the finance page updates the dashboard immediately.
 */
export function useStoredBudgetPlan(): BudgetPlan | null {
    return useSyncExternalStore(
        subscribe,
        () => currentPlan,
        () => null,
    );
}
