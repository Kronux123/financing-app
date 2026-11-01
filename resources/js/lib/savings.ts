/**
 * The savings history: what each month actually put by.
 *
 * Mirrors MonthlySavingsResource, and the server decides what counts — income
 * less living costs, on finalized paydays only. Nothing here recomputes that; it
 * only arranges the months for the chart and the calendar to read.
 *
 * A month with no finalized payday is absent rather than zero. Nothing was
 * recorded, which is not the same as nothing was saved, and the calendar draws
 * the two differently.
 */

/**
 * How a month did against the monthly goal, as a share of it: 1 is exactly on
 * goal. The one copy of the thresholds — the savings calendar and the dashboard
 * chart both grade with this, so a month can never be "close" on one and
 * "behind" on the other.
 */
export type GoalTier = 'behind' | 'close' | 'met';

export const goalTierFor = (share: number): GoalTier => {
    if (share >= 1) {
        return 'met';
    }

    if (share >= 0.7) {
        return 'close';
    }

    return 'behind';
};

export type SavedMonth = {
    /** `2026-07`. */
    month: string;
    saved: number;
};

const shortLabels = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

/** The year and zero-based month index in `2026-07`, without parsing a date. */
const partsOf = (month: string): { year: number; index: number } => {
    const [year, ordinal] = month.split('-').map(Number);

    return { year, index: ordinal - 1 };
};

export const monthShortLabel = (month: string): string => {
    return shortLabels[partsOf(month).index] ?? month;
};

/** Oldest first, so the chart reads left to right. */
export const lastMonths = (
    history: SavedMonth[],
    count: number,
): SavedMonth[] => {
    return history.slice(-count);
};

/** Every year the history touches, oldest first. */
export const yearsIn = (history: SavedMonth[]): number[] => {
    const years = new Set(history.map((entry) => partsOf(entry.month).year));

    return [...years].sort((a, b) => a - b);
};

/**
 * Twelve entries, January first, for one year. `null` where that month has no
 * finalized payday behind it.
 */
export const monthsForYear = (
    history: SavedMonth[],
    year: number,
): (number | null)[] => {
    const months = Array<number | null>(12).fill(null);

    history.forEach((entry) => {
        const { year: entryYear, index } = partsOf(entry.month);

        if (entryYear === year) {
            months[index] = entry.saved;
        }
    });

    return months;
};

export type YearSummary = {
    /** Months that actually have a figure. */
    recorded: number;
    total: number;
    average: number;
    best: { label: string; amount: number } | null;
    worst: { label: string; amount: number } | null;
    goalsMet: number;
};

/** Null best and worst when the year holds nothing to compare. */
export const summariseYear = (
    months: (number | null)[],
    goal: number,
): YearSummary => {
    const recorded = months
        .map((amount, index) => ({ amount, index }))
        .filter(
            (entry): entry is { amount: number; index: number } =>
                entry.amount !== null,
        );

    const total = recorded.reduce((sum, entry) => sum + entry.amount, 0);

    return {
        recorded: recorded.length,
        total,
        average: recorded.length > 0 ? total / recorded.length : 0,
        best: recorded.length
            ? label(recorded.reduce((a, b) => (b.amount > a.amount ? b : a)))
            : null,
        worst: recorded.length
            ? label(recorded.reduce((a, b) => (b.amount < a.amount ? b : a)))
            : null,
        goalsMet:
            goal > 0
                ? recorded.filter((entry) => entry.amount >= goal).length
                : 0,
    };
};

const label = ({ amount, index }: { amount: number; index: number }) => ({
    label: shortLabels[index],
    amount,
});
