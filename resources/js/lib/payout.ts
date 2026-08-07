/**
 * Payout records: what each payday was supposed to deliver, against what it
 * actually did.
 *
 * The shape here is the contract the backend will mirror. A scheduled job will
 * create a pending record on every payday and freeze the plan into it; until
 * that exists, a record is derived from the current plan on the way in, and only
 * written down once you touch it. See `isFrozen`.
 *
 * Nothing in this file touches the DOM or storage.
 */

import type { BudgetPlan, Paycheck } from '@/lib/budget';
import { itemsFor, isRemainderItem } from '@/lib/budget';

export type PayoutStatus = 'pending' | 'finalized';

export type PayoutLine = {
    /** Copied, never referenced — editing the plan must not rewrite history. */
    groupId: string;
    name: string;
    planned: number;
    actual: number;
};

export type Payout = {
    /**
     * `2026-08-mid-month`. Stable, so a record is never created twice, and made
     * of characters a CSS selector can hold — a colon here reads as a pseudo
     * selector and breaks every test hook built from it.
     */
    id: string;
    paycheckId: string;
    paycheckLabel: string;
    /** The payday itself, as `YYYY-MM-DD`. */
    paidOn: string;
    plannedIncome: number;
    actualIncome: number;
    lines: PayoutLine[];
    status: PayoutStatus;
};

/** How far back the page offers records. Six paydays is a quarter, or half a year. */
export const payoutHistoryMonths = 6;

const twoDigits = (value: number): string => String(value).padStart(2, '0');

export const isoDate = (date: Date): string => {
    return [
        date.getFullYear(),
        twoDigits(date.getMonth() + 1),
        twoDigits(date.getDate()),
    ].join('-');
};

/** Day 0 of the next month is the last day of this one. */
const lastDayOf = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
};

const paydayFor = (paycheck: Paycheck, month: Date): string => {
    const year = month.getFullYear();
    const index = month.getMonth();
    const day =
        paycheck.dayOfMonth === 'last'
            ? lastDayOf(year, index)
            : Math.min(paycheck.dayOfMonth, lastDayOf(year, index));

    return `${year}-${twoDigits(index + 1)}-${twoDigits(day)}`;
};

export const payoutId = (paycheckId: string, paidOn: string): string => {
    return `${paidOn.slice(0, 7)}-${paycheckId}`;
};

/**
 * A pending record for one paycheck in one month, taken from the plan as it
 * stands. Actuals start equal to the plan, so an untouched payday that went
 * exactly as intended needs no editing before it is finalized.
 */
export const payoutFor = (
    plan: BudgetPlan,
    paycheck: Paycheck,
    month: Date,
): Payout => {
    const paidOn = paydayFor(paycheck, month);

    const lines = plan.groups.flatMap((group) =>
        itemsFor(group, paycheck.id)
            .filter((item) => !isRemainderItem(item))
            .map((item) => ({
                groupId: group.id,
                name: item.name || group.name,
                planned: item.amount,
                actual: item.amount,
            })),
    );

    return {
        id: payoutId(paycheck.id, paidOn),
        paycheckId: paycheck.id,
        paycheckLabel: paycheck.label,
        paidOn,
        plannedIncome: paycheck.amount,
        actualIncome: paycheck.amount,
        lines,
        status: 'pending',
    };
};

/**
 * Every payday that has already happened inside the window, newest first.
 *
 * A payday still to come is left out: there is nothing to review about money
 * that has not arrived.
 */
export const duePayouts = (
    plan: BudgetPlan,
    today: Date,
    monthsBack: number = payoutHistoryMonths,
): Payout[] => {
    const cutoff = isoDate(today);

    return Array.from({ length: monthsBack }, (_, back) => back)
        .flatMap((back) => {
            const month = new Date(
                today.getFullYear(),
                today.getMonth() - back,
                1,
            );

            return plan.paychecks.map((paycheck) =>
                payoutFor(plan, paycheck, month),
            );
        })
        .filter((payout) => payout.paidOn <= cutoff)
        .sort((a, b) => b.paidOn.localeCompare(a.paidOn));
};

export const plannedTotal = (payout: Payout): number => {
    return payout.lines.reduce((sum, line) => sum + line.planned, 0);
};

export const actualTotal = (payout: Payout): number => {
    return payout.lines.reduce((sum, line) => sum + line.actual, 0);
};

/** Positive means the payday came in better than planned. */
export const incomeVariance = (payout: Payout): number => {
    return payout.actualIncome - payout.plannedIncome;
};

/** Positive means more went out than planned. */
export const spendVariance = (payout: Payout): number => {
    return actualTotal(payout) - plannedTotal(payout);
};

/** What was left after the money actually went out. */
export const leftOver = (payout: Payout): number => {
    return payout.actualIncome - actualTotal(payout);
};

export const isFinalized = (payout: Payout): boolean => {
    return payout.status === 'finalized';
};

export const withActualIncome = (payout: Payout, actual: number): Payout => {
    return { ...payout, actualIncome: actual };
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

export const withStatus = (payout: Payout, status: PayoutStatus): Payout => {
    return { ...payout, status };
};

const isPayoutLine = (value: unknown): value is PayoutLine => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const line = value as Partial<PayoutLine>;

    return (
        typeof line.groupId === 'string' &&
        typeof line.name === 'string' &&
        typeof line.planned === 'number' &&
        typeof line.actual === 'number'
    );
};

export const isPayout = (value: unknown): value is Payout => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const payout = value as Partial<Payout>;

    return (
        typeof payout.id === 'string' &&
        typeof payout.paycheckId === 'string' &&
        typeof payout.paycheckLabel === 'string' &&
        typeof payout.paidOn === 'string' &&
        typeof payout.plannedIncome === 'number' &&
        typeof payout.actualIncome === 'number' &&
        (payout.status === 'pending' || payout.status === 'finalized') &&
        Array.isArray(payout.lines) &&
        payout.lines.every(isPayoutLine)
    );
};

/**
 * The records to show: the ones you have touched, plus freshly derived ones for
 * every payday you have not.
 *
 * A record you have never opened still follows the plan, which is what you would
 * want from a line that says "this is what the plan says this payday holds". The
 * moment you edit or finalize one it is written down and stops moving — that is
 * the freeze, and it is why history cannot be rewritten by a later plan edit.
 */
export const mergePayouts = (due: Payout[], stored: Payout[]): Payout[] => {
    const frozen = new Map(stored.map((payout) => [payout.id, payout]));

    return due.map((payout) => frozen.get(payout.id) ?? payout);
};
