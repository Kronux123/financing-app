import { useState, useSyncExternalStore } from 'react';
import type { BudgetPlan } from '@/lib/budget';
import { createPlan, migratePlan, withSweptRemainders } from '@/lib/budget';

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
        const migrated = migratePlan(JSON.parse(stored));

        if (!migrated) {
            window.localStorage.removeItem(budgetPlanStorageKey);

            return null;
        }

        return migrated;
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

/**
 * The plan being edited alongside the one last written to storage. Holding both
 * in a single state value keeps them in step, so an untouched page can never
 * report itself as dirty.
 */
type Draft = {
    plan: BudgetPlan;
    saved: BudgetPlan;
    /** The stored plan this draft was seeded from, to detect late hydration. */
    source: BudgetPlan | null;
};

export type PlanDraft = {
    plan: BudgetPlan;
    isDirty: boolean;
    update: (next: BudgetPlan) => void;
    save: () => void;
};

/**
 * An editable copy of the stored plan, shared by every page that edits one — the
 * budget and the debt list are two views of the same saved plan, and the late
 * hydration dance below is too easy to get subtly wrong twice.
 */
export function useBudgetPlanDraft(): PlanDraft {
    const storedPlan = useStoredBudgetPlan();
    const [draft, setDraft] = useState<Draft>(() => {
        const initial = storedPlan ?? createPlan();

        return { plan: initial, saved: initial, source: storedPlan };
    });

    // Adopt a plan that arrives after the first render, but never over edits.
    if (draft.source !== storedPlan && draft.plan === draft.saved) {
        const next = storedPlan ?? createPlan();

        setDraft({ plan: next, saved: next, source: storedPlan });
    }

    return {
        plan: draft.plan,
        isDirty: draft.plan !== draft.saved,
        /**
         * Every edit passes through the sweep, so a paycheck saving its
         * remainder keeps that line correct no matter which field moved it.
         */
        update: (next) =>
            setDraft({ ...draft, plan: withSweptRemainders(next) }),
        save: () => {
            saveBudgetPlan(draft.plan);
            setDraft({
                plan: draft.plan,
                saved: draft.plan,
                source: draft.plan,
            });
        },
    };
}
