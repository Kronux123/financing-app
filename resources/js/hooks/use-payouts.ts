import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { Payout, PayoutStatus } from '@/lib/payout';
import {
    status as payoutStatusRoute,
    update as updatePayout,
} from '@/routes/payouts';

/**
 * Every payday on the ledger, newest first, as the server sent it.
 *
 * Passed by `PayoutController@index` rather than shared, because this is the
 * only page that reads them. There is no loading state and no hydration dance —
 * the value is the same on the server and the client.
 */
export function useStoredPayouts(): Payout[] {
    return usePage<{ payouts: Payout[] }>().props.payouts;
}

/** Writes one record, then lets the reloaded props come back with it. */
export const savePayout = (payout: Payout, onSuccess?: () => void): void => {
    router.put(updatePayout(payout.id).url, serialise(payout), {
        preserveScroll: true,
        onSuccess,
    });
};

/**
 * Finalizing and reopening go their own way, because the transition is not an
 * edit: it decides whether the record is still a draft of what happened or the
 * account of it.
 */
export const setPayoutStatus = (payout: Payout, status: PayoutStatus): void => {
    router.patch(
        payoutStatusRoute(payout.id).url,
        { status },
        { preserveScroll: true },
    );
};

/**
 * The record on the wire.
 *
 * `planned` is left out on purpose. It is what the plan said when the payday was
 * opened, and the server refuses to move it — sending it would only suggest
 * otherwise.
 */
const serialise = (payout: Payout) => {
    return {
        incomes: payout.incomes.map((income) => ({
            id: income.id,
            source: income.source,
            label: income.label,
            actual: income.actual,
        })),
        lines: payout.lines.map((line) => ({
            id: line.id,
            /** Named for the column it lands in, not for the page's reading. */
            group: line.groupId,
            name: line.name,
            actual: line.actual,
        })),
    };
};

/**
 * The record being corrected alongside the one the server holds. Holding both in
 * a single state value keeps them in step, so an untouched card can never report
 * itself as dirty.
 */
type Draft = {
    payout: Payout;
    saved: Payout;
    /** The prop this draft was seeded from, to notice a fresh one arriving. */
    source: Payout;
};

export type PayoutDraft = {
    payout: Payout;
    isDirty: boolean;
    update: (next: Payout) => void;
    save: (onSuccess?: () => void) => void;
};

/**
 * An editable copy of one payday.
 *
 * Corrections are held here rather than sent as they are typed: every keystroke
 * in an amount field is a value change, and a payday is reviewed as one document
 * anyway — which is also the shape the server accepts it in.
 */
export function usePayoutDraft(stored: Payout): PayoutDraft {
    const [draft, setDraft] = useState<Draft>(() => ({
        payout: stored,
        saved: stored,
        source: stored,
    }));

    // Adopt a record that arrives from the server, but never over live edits.
    if (draft.source !== stored && draft.payout === draft.saved) {
        setDraft({ payout: stored, saved: stored, source: stored });
    }

    return {
        payout: draft.payout,
        isDirty: draft.payout !== draft.saved,
        update: (next) => setDraft({ ...draft, payout: next }),
        save: (onSuccess) => {
            const saving = draft.payout;

            savePayout(saving, () => {
                setDraft({ payout: saving, saved: saving, source: saving });
                onSuccess?.();
            });
        },
    };
}
