import type { Activity, ActivityPagination } from '@/lib/activities';
import type { BudgetPlan, ExpenseItem } from '@/lib/budget';
import {
    allowanceGroupId,
    endMonthPaycheckId,
    midMonthPaycheckId,
    PLAN_VERSION,
    payablesGroupId,
    savingsGroupId,
} from '@/lib/budget';
import type { Payout, PayoutIncome, PayoutLine } from '@/lib/payout';
import type { SavedMonth } from '@/lib/savings';

/**
 * A made-up account, shown while a walkthrough runs over a page the user has no
 * data on yet. It never leaves the browser and is never saved.
 *
 * Shaped after DemoUserSeeder — the same plan, and the same month-by-month
 * story — but in pesos and built here, because what the server derives from a
 * real account (the savings history, the activity log) comes from queries over
 * saved rows. The paydays are worked out from the plan the way OpenPayoutsForPlan
 * does it, and the history and log from the paydays, so the figures agree with
 * each other on every page.
 */
export type SampleAccount = {
    plan: BudgetPlan;
    /** Newest first, as the payouts page receives them. */
    payouts: Payout[];
    /** Oldest first, as the dashboard and calendar receive it. */
    savings: SavedMonth[];
    /** Newest first. */
    activities: Activity[];
};

/** How far back the sample's paydays reach, counting this month. */
const monthsOfHistory = 6;

type MonthStory = {
    electricity?: number;
    groceries?: number;
    internet?: number;
    allowance?: number;
    unplanned?: { name: string; amount: number };
    bonus?: number;
};

/** DemoUserSeeder::MONTHS in pesos, by calendar month. */
const monthStories: Record<number, MonthStory> = {
    1: { electricity: 2200, groceries: 6400 },
    2: { electricity: 2100, groceries: 5800 },
    3: {
        electricity: 2650,
        groceries: 6150,
        unplanned: { name: 'Dental work', amount: 3500 },
    },
    4: { electricity: 3200, groceries: 6600 },
    5: { electricity: 3450, groceries: 5900, internet: 1450 },
    6: { electricity: 3600, groceries: 6200, bonus: 12500 },
    7: {
        electricity: 3300,
        groceries: 7050,
        allowance: 5200,
        unplanned: { name: 'Aircon repair', amount: 4200 },
    },
    8: { electricity: 2900, groceries: 6100 },
    9: { electricity: 2550, groceries: 5950 },
    10: { electricity: 2350, groceries: 6300 },
    11: { electricity: 2250, groceries: 6500 },
    12: { electricity: 2400, groceries: 7800, allowance: 5600 },
};

const pad = (value: number): string => String(value).padStart(2, '0');

const isoDate = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const monthKey = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

/** The last day of the month `offset` months from today's. */
const endOfMonth = (today: Date, offset: number): string =>
    isoDate(new Date(today.getFullYear(), today.getMonth() + offset + 1, 0));

const startOfMonth = (today: Date, offset: number): string =>
    isoDate(new Date(today.getFullYear(), today.getMonth() + offset, 1));

const item = (
    id: string,
    name: string,
    amount: number,
    paycheckId: string,
    debt?: Pick<ExpenseItem, 'startedOn' | 'endsOn'>,
): ExpenseItem => ({
    id: `sample-${id}`,
    name,
    amount,
    paycheckId,
    ...(debt ? { ...debt, isDebt: true } : {}),
});

/**
 * ₱25,000 twice a month, the end-of-month paycheck sweeping what it has left.
 * The two debts are dated off today so the debt page always finds them partway
 * through: the laptop half paid, the credit card barely started.
 */
const samplePlan = (today: Date): BudgetPlan => ({
    version: PLAN_VERSION,
    cadence: 'semi-monthly',
    grossMonthly: null,
    paychecks: [
        {
            id: midMonthPaycheckId,
            label: '15th',
            dayOfMonth: 15,
            amount: 25000,
            savesRemainder: false,
        },
        {
            id: endMonthPaycheckId,
            label: 'End of month',
            dayOfMonth: 'last',
            amount: 25000,
            savesRemainder: true,
        },
    ],
    groups: [
        {
            id: payablesGroupId,
            name: 'Payables',
            items: [
                item('rent', 'Rent', 9000, midMonthPaycheckId),
                item('electricity', 'Electricity', 2400, midMonthPaycheckId),
                item('water', 'Water', 600, midMonthPaycheckId),
                item('internet', 'Internet', 1700, midMonthPaycheckId),
                item('transport', 'Transport', 2800, midMonthPaycheckId),
                item('groceries', 'Groceries', 6000, endMonthPaycheckId),
                item('phone', 'Phone plan', 1000, endMonthPaycheckId),
                item('health', 'Health insurance', 1500, endMonthPaycheckId),
                item('laptop', 'Laptop installment', 4000, endMonthPaycheckId, {
                    startedOn: startOfMonth(today, -6),
                    endsOn: endOfMonth(today, 5),
                }),
                item('card', 'Credit card', 3000, endMonthPaycheckId, {
                    startedOn: startOfMonth(today, -3),
                    endsOn: endOfMonth(today, 11),
                }),
            ],
        },
        {
            id: allowanceGroupId,
            name: 'Allowance',
            items: [
                item('allowance-mid', 'Allowance', 4500, midMonthPaycheckId),
                item('allowance-end', 'Allowance', 4500, endMonthPaycheckId),
            ],
        },
        {
            id: savingsGroupId,
            name: 'Savings',
            items: [item('savings-mid', 'Savings', 4000, midMonthPaycheckId)],
        },
    ],
    emergencyFund: { monthsOfCover: 3, balance: 45000 },
    savingsPot: { balance: 18000 },
});

/** A payday on a weekend is paid the Friday before, as on the server. */
const paydayOn = (year: number, month: number, day: number | 'last'): Date => {
    const date =
        day === 'last'
            ? new Date(year, month + 1, 0)
            : new Date(year, month, day);
    const weekday = date.getDay();

    if (weekday === 0) {
        date.setDate(date.getDate() - 2);
    } else if (weekday === 6) {
        date.setDate(date.getDate() - 1);
    }

    return date;
};

/** The actual a story gives one planned line, or the plan's own figure. */
const actualFor = (
    line: Omit<PayoutLine, 'actual'>,
    story: MonthStory,
): number => {
    if (line.groupId === allowanceGroupId) {
        return story.allowance ?? line.planned;
    }

    const byName: Record<string, number | undefined> = {
        Electricity: story.electricity,
        Groceries: story.groceries,
        Internet: story.internet,
    };

    return byName[line.name] ?? line.planned;
};

/**
 * Every payday from `monthsOfHistory` months back up to today, newest first.
 * All settled but the newest, which waits for review the way a real one would.
 */
const samplePayouts = (plan: BudgetPlan, today: Date): Payout[] => {
    const payouts: Omit<Payout, 'id' | 'status'>[] = [];

    for (let offset = monthsOfHistory - 1; offset >= 0; offset--) {
        const year = today.getFullYear();
        const month = today.getMonth() - offset;
        const story =
            monthStories[new Date(year, month, 1).getMonth() + 1] ?? {};

        for (const paycheck of plan.paychecks) {
            const paidOn = paydayOn(year, month, paycheck.dayOfMonth);

            if (paidOn > today) {
                continue;
            }

            const isEndOfMonth = paycheck.id === endMonthPaycheckId;
            const incomes: PayoutIncome[] = [
                {
                    id: null,
                    source: 'paycheck',
                    label: paycheck.label,
                    planned: paycheck.amount,
                    actual: paycheck.amount,
                },
            ];

            if (isEndOfMonth && story.bonus) {
                incomes.push({
                    id: null,
                    source: 'bonus',
                    label: 'Bonus',
                    planned: 0,
                    actual: story.bonus,
                });
            }

            const lines: PayoutLine[] = plan.groups.flatMap((group) =>
                group.items
                    .filter((entry) => entry.paycheckId === paycheck.id)
                    .map((entry) => {
                        const planned = {
                            id: null,
                            groupId: group.id,
                            name: entry.name || group.name,
                            planned: entry.amount,
                            isUnplanned: false,
                        };

                        return {
                            ...planned,
                            actual: actualFor(planned, story),
                        };
                    }),
            );

            if (isEndOfMonth && story.unplanned) {
                lines.push({
                    id: null,
                    groupId: payablesGroupId,
                    name: story.unplanned.name,
                    planned: 0,
                    actual: story.unplanned.amount,
                    isUnplanned: true,
                });
            }

            payouts.push({
                key: `${monthKey(paidOn)}-${paycheck.id}`,
                paycheckId: paycheck.id,
                paycheckLabel: paycheck.label,
                paidOn: isoDate(paidOn),
                incomes,
                lines,
            });
        }
    }

    /*
     * Negative ids, so a sample payday can never be mistaken for a row the
     * server holds, even by a route built from one.
     */
    return payouts.reverse().map((payout, index) => ({
        ...payout,
        id: -(index + 1),
        status: index === 0 ? 'pending' : 'finalized',
    }));
};

/**
 * MonthlySavings, client side: income less payables and allowance, from
 * finalized paydays only.
 */
const sampleSavings = (payouts: Payout[]): SavedMonth[] => {
    const byMonth = new Map<string, number>();

    for (const payout of payouts) {
        if (payout.status !== 'finalized') {
            continue;
        }

        const month = payout.paidOn.slice(0, 7);
        const income = payout.incomes.reduce(
            (sum, entry) => sum + entry.actual,
            0,
        );
        const livingCosts = payout.lines
            .filter((line) => line.groupId !== savingsGroupId)
            .reduce((sum, line) => sum + line.actual, 0);

        byMonth.set(month, (byMonth.get(month) ?? 0) + income - livingCosts);
    }

    return [...byMonth.entries()]
        .map(([month, saved]) => ({ month, saved }))
        .sort((a, b) => a.month.localeCompare(b.month));
};

const groupLabels: Record<string, string> = {
    [payablesGroupId]: 'Payables',
    [allowanceGroupId]: 'Allowance',
    [savingsGroupId]: 'Savings',
};

/** ActivityLog, client side: each payday's money in, then its money out. */
const sampleActivities = (payouts: Payout[]): Activity[] => {
    return payouts.flatMap((payout) => {
        const shared = {
            date: payout.paidOn,
            payday: payout.paycheckLabel,
            status: payout.status,
        };

        return [
            ...payout.incomes.map((income, index) => ({
                ...shared,
                key: `sample-income-${payout.id}-${index}`,
                title: income.label,
                category: 'Income',
                amount: income.actual,
                isUnplanned: false,
            })),
            ...payout.lines.map((line, index) => ({
                ...shared,
                key: `sample-line-${payout.id}-${index}`,
                title: line.name,
                category: groupLabels[line.groupId] ?? line.groupId,
                amount: -line.actual,
                isUnplanned: line.isUnplanned,
            })),
        ];
    });
};

let cached: { day: string; account: SampleAccount } | null = null;

/**
 * Built once a day and then handed out as the same object, because the plan
 * draft and the payday drafts notice a new plan by its identity — a fresh copy
 * every render would look like the server sending one every render.
 */
export const sampleAccount = (today: Date = new Date()): SampleAccount => {
    const day = isoDate(today);

    if (cached?.day !== day) {
        const plan = samplePlan(today);
        const payouts = samplePayouts(plan, today);

        cached = {
            day,
            account: {
                plan,
                payouts,
                savings: sampleSavings(payouts),
                activities: sampleActivities(payouts),
            },
        };
    }

    return cached.account;
};

/** The first page of the sample log, sliced the way the server would. */
export const sampleActivityPage = (
    rowsPerPage: number,
): { activities: Activity[]; pagination: ActivityPagination } => {
    const { activities } = sampleAccount();
    const rows = activities.slice(0, rowsPerPage);

    return {
        activities: rows,
        pagination: {
            page: 1,
            pageCount: Math.ceil(activities.length / rowsPerPage),
            rowsPerPage,
            firstRow: 1,
            lastRow: rows.length,
            totalRows: activities.length,
        },
    };
};
