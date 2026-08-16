/**
 * Payout records: what each payday was supposed to deliver, against what it
 * actually did.
 *
 * The shape here mirrors PayoutResource, which is the other half of the
 * contract. Every figure is a copy taken when the payday was opened, so nothing
 * in a record is read back through the plan — editing the plan afterwards cannot
 * rewrite history, and that is the whole point of the feature.
 *
 * Which paydays exist is the server's business too: the daily `payouts:open`
 * command creates them against a clock the browser cannot move. This file no
 * longer works any of them out.
 *
 * Nothing in here touches the DOM or storage.
 */

import {
    allowanceGroupId,
    payablesGroupId,
    savingsGroupId,
} from '@/lib/budget';

export type PayoutStatus = 'pending' | 'finalized';

export type IncomeSource = 'paycheck' | 'bonus' | 'thirteenth_month' | 'other';

export type PayoutIncome = {
    /** Null for a row added while reviewing and not yet written down. */
    id: number | null;
    source: IncomeSource;
    label: string;
    /** Zero for money nobody forecast — a bonus, or 13th month pay. */
    planned: number;
    actual: number;
};

export type PayoutLine = {
    id: number | null;
    /** Copied, never referenced — editing the plan must not rewrite history. */
    groupId: string;
    name: string;
    planned: number;
    actual: number;
    /** Money the plan never forecast: no payable behind it, nought planned. */
    isUnplanned: boolean;
};

export type Payout = {
    /** The row id, which is what the update and status routes are built from. */
    id: number;
    /**
     * `2026-07-monthly`. Stable across reloads, so a card and a test hook can be
     * named without knowing a row id.
     */
    key: string;
    paycheckId: string;
    paycheckLabel: string;
    /** The payday itself, as `YYYY-MM-DD`. */
    paidOn: string;
    incomes: PayoutIncome[];
    lines: PayoutLine[];
    status: PayoutStatus;
};

const sum = (values: number[]): number =>
    values.reduce((total, value) => total + value, 0);

/** What the plan expected to arrive. Only the paycheck is ever forecast. */
export const plannedIncome = (payout: Payout): number => {
    return sum(payout.incomes.map((income) => income.planned));
};

export const actualIncome = (payout: Payout): number => {
    return sum(payout.incomes.map((income) => income.actual));
};

export const plannedTotal = (payout: Payout): number => {
    return sum(payout.lines.map((line) => line.planned));
};

export const actualTotal = (payout: Payout): number => {
    return sum(payout.lines.map((line) => line.actual));
};

/** Positive means the payday came in better than planned. */
export const incomeVariance = (payout: Payout): number => {
    return actualIncome(payout) - plannedIncome(payout);
};

/** Positive means more went out than planned. */
export const spendVariance = (payout: Payout): number => {
    return actualTotal(payout) - plannedTotal(payout);
};

/** What was left after the money actually went out. */
export const leftOver = (payout: Payout): number => {
    return actualIncome(payout) - actualTotal(payout);
};

export const isFinalized = (payout: Payout): boolean => {
    return payout.status === 'finalized';
};

export const withActualIncome = (
    payout: Payout,
    index: number,
    actual: number,
): Payout => {
    return {
        ...payout,
        incomes: payout.incomes.map((income, at) =>
            at === index ? { ...income, actual } : income,
        ),
    };
};

export const withActualLine = (
    payout: Payout,
    index: number,
    actual: number,
): Payout => {
    return {
        ...payout,
        lines: payout.lines.map((line, at) =>
            at === index ? { ...line, actual } : line,
        ),
    };
};

/**
 * The groups a hand-added line may land in, in the order the plan lists them.
 *
 * Named here rather than read off the plan: the group is copied onto a line when
 * the payday opens, so a record keeps its own labels once the plan has moved on.
 */
export const lineGroups: { id: string; label: string }[] = [
    { id: payablesGroupId, label: 'Payables' },
    { id: allowanceGroupId, label: 'Allowance' },
    { id: savingsGroupId, label: 'Savings' },
];

/**
 * Spending the plan never saw coming, put on the payday it came out of.
 *
 * `planned` is nought and stays nought — the server sets it on a row with no id
 * and refuses to move it afterwards — which is exactly what unplanned means. The
 * flag is set here too so the row reads the same before its first save as after.
 */
export const withExtraLine = (
    payout: Payout,
    line: { groupId: string; name: string; actual: number },
): Payout => {
    return {
        ...payout,
        lines: [
            ...payout.lines,
            { ...line, id: null, planned: 0, isUnplanned: true },
        ],
    };
};

/**
 * Drops a line from the record. The server deletes whatever this leaves out.
 *
 * Only unplanned lines are ever offered up — a planned one is the forecast the
 * payday was opened with, and losing that would leave nothing to compare against.
 */
export const withoutLine = (payout: Payout, index: number): Payout => {
    return {
        ...payout,
        lines: payout.lines.filter((_, at) => at !== index),
    };
};
