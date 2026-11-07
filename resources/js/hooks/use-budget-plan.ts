import { router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { BudgetPlan } from '@/lib/budget';
import { createPlan, isRemainderItem, withSweptRemainders } from '@/lib/budget';
import { sampleAccount } from '@/lib/sample-account';
import {
    isSamplePreviewActive,
    useIsSamplePreview,
} from '@/lib/sample-preview';
import { update as updatePlan } from '@/routes/finance';

/**
 * The saved plan, as the server sent it, with its swept lines put back.
 *
 * Shared from `HandleInertiaRequests`, so every page has it without asking. It
 * arrives in the page payload, which means there is no loading state and no
 * hydration dance — the value is the same on the server and the client.
 *
 * The sweep is applied here rather than on the page that edits one, so the
 * dashboard and the debt page count the swept savings too. Memoised on the prop
 * because the draft below watches its identity to notice a fresh plan.
 */
export function useStoredBudgetPlan(): BudgetPlan | null {
    const ownPlan = usePage<{ plan: BudgetPlan | null }>().props.plan;
    const stored = useIsSamplePreview() ? sampleAccount().plan : ownPlan;

    return useMemo(
        () => (stored === null ? null : withSweptRemainders(stored)),
        [stored],
    );
}

/** Writes the plan, then lets the shared prop come back with the saved copy. */
export const saveBudgetPlan = (
    plan: BudgetPlan,
    onSuccess?: () => void,
): void => {
    if (isSamplePreviewActive()) {
        return;
    }

    router.put(updatePlan().url, serialise(plan), {
        preserveScroll: true,
        onSuccess,
    });
};

/**
 * The plan on the wire.
 *
 * Groups are flattened, because the group is a property of a row rather than
 * something a row lives inside. Ids that were made up on this page are dropped:
 * a number means a row the server already has, anything else is new.
 *
 * The swept remainder is left behind. It is worked out from the paycheck and
 * everything else on it, so storing it would mean keeping a figure in step with
 * the numbers it is computed from — see the expense_items migration, which says
 * the same thing from the other side. `savesRemainder` travels on the paycheck,
 * and that is enough to rebuild the line on the way back in.
 */
const serialise = (plan: BudgetPlan) => {
    return {
        cadence: plan.cadence,
        grossMonthly: plan.grossMonthly ?? null,
        emergencyFund: plan.emergencyFund,
        savingsPot: plan.savingsPot,
        /**
         * Spelled out rather than passed through: several of these are optional
         * on the type, and an absent key is not the same as `false` once it
         * reaches a validator.
         */
        paychecks: plan.paychecks.map((paycheck) => ({
            id: paycheck.id,
            label: paycheck.label,
            dayOfMonth: paycheck.dayOfMonth,
            amount: paycheck.amount,
            savesRemainder: paycheck.savesRemainder ?? false,
        })),
        items: plan.groups.flatMap((group) =>
            group.items
                .filter((item) => !isRemainderItem(item))
                .map((item) => ({
                    id: /^\d+$/.test(item.id) ? item.id : null,
                    paycheckId: item.paycheckId,
                    group: group.id,
                    name: item.name,
                    amount: item.amount,
                    startedOn: item.startedOn ?? null,
                    endsOn: item.endsOn ?? null,
                    isDebt: item.isDebt ?? false,
                })),
        ),
    };
};

/**
 * The plan being edited alongside the one the server holds. Holding both in a
 * single state value keeps them in step, so an untouched page can never report
 * itself as dirty.
 */
type Draft = {
    plan: BudgetPlan;
    saved: BudgetPlan;
    /** The prop this draft was seeded from, to notice a fresh one arriving. */
    source: BudgetPlan | null;
};

export type PlanDraft = {
    plan: BudgetPlan;
    isDirty: boolean;
    update: (next: BudgetPlan) => void;
    save: (onSuccess?: () => void) => void;
    /** Drops live edits, so the next plan the server sends is adopted. */
    discardChanges: () => void;
};

/**
 * An editable copy of the saved plan, shared by every page that edits one.
 */
export function useBudgetPlanDraft(): PlanDraft {
    const storedPlan = useStoredBudgetPlan();
    const [draft, setDraft] = useState<Draft>(() => {
        const initial = storedPlan ?? createPlan();

        return { plan: initial, saved: initial, source: storedPlan };
    });

    // Adopt a plan that arrives from the server, but never over live edits.
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
        save: (onSuccess) => {
            const saving = draft.plan;

            saveBudgetPlan(saving, () => {
                setDraft({ plan: saving, saved: saving, source: saving });
                onSuccess?.();
            });
        },
        /*
         * Functional, because it runs from a visit's callback after the new prop
         * has already rendered once: the draft it rewinds is the current one,
         * and the adoption check above then takes the plan that just arrived.
         */
        discardChanges: () =>
            setDraft((current) => ({ ...current, plan: current.saved })),
    };
}
