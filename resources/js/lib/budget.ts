/**
 * The budget plan model and every calculation derived from it.
 *
 * The maths lives here rather than in the components so it can be exercised
 * directly, and so the backend release has one place to mirror when this moves
 * server-side. Nothing in this file touches the DOM or storage.
 */

export type PayCadence = 'monthly' | 'semi-monthly';

export type Paycheck = {
    id: string;
    label: string;
    /** `'last'` means the final calendar day, which varies by month. */
    dayOfMonth: number | 'last';
    amount: number;
};

export type ExpenseItem = {
    id: string;
    name: string;
    amount: number;
    /** The paycheck that funds this line. */
    paycheckId: string;
};

export type ExpenseGroup = {
    id: string;
    name: string;
    items: ExpenseItem[];
};

export type BudgetPlan = {
    /** Bumped when the shape changes, so stored plans can be migrated. */
    version: 1;
    cadence: PayCadence;
    paychecks: Paycheck[];
    groups: ExpenseGroup[];
};

export type PlanTotals = {
    income: number;
    allocated: number;
    unallocated: number;
};

export const PLAN_VERSION = 1;

export const monthlyPaycheckId = 'monthly';
export const midMonthPaycheckId = 'mid-month';
export const endMonthPaycheckId = 'end-month';

export const cadenceOptions: { value: PayCadence; label: string }[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'semi-monthly', label: 'Semi-monthly' },
];

/**
 * Fixed ids because these four ship with every new plan — only user-added rows
 * need generated ids, which keeps plan creation free of side effects.
 */
const defaultGroupNames: { id: string; name: string }[] = [
    { id: 'needs', name: 'Needs' },
    { id: 'utilities', name: 'Utilities' },
    { id: 'wants', name: 'Wants' },
    { id: 'savings', name: 'Savings' },
];

export const createId = (prefix: string): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * The paychecks a cadence implies. Semi-monthly is the 15th and the last day of
 * the month — 24 a year, not the 26 that biweekly would give.
 */
export const paychecksFor = (
    cadence: PayCadence,
    amounts: number[] = [],
): Paycheck[] => {
    if (cadence === 'semi-monthly') {
        return [
            {
                id: midMonthPaycheckId,
                label: '15th',
                dayOfMonth: 15,
                amount: amounts[0] ?? 0,
            },
            {
                id: endMonthPaycheckId,
                label: 'End of month',
                dayOfMonth: 'last',
                amount: amounts[1] ?? 0,
            },
        ];
    }

    return [
        {
            id: monthlyPaycheckId,
            label: 'Monthly pay',
            dayOfMonth: 'last',
            amount: amounts[0] ?? 0,
        },
    ];
};

export const createPlan = (): BudgetPlan => {
    return {
        version: PLAN_VERSION,
        cadence: 'monthly',
        paychecks: paychecksFor('monthly'),
        groups: defaultGroupNames.map((group) => ({ ...group, items: [] })),
    };
};

export const itemsFor = (
    group: ExpenseGroup,
    paycheckId: string,
): ExpenseItem[] => {
    return group.items.filter((item) => item.paycheckId === paycheckId);
};

/** Totals one group, optionally narrowed to a single paycheck. */
export const groupTotal = (
    group: ExpenseGroup,
    paycheckId?: string,
): number => {
    const items = paycheckId ? itemsFor(group, paycheckId) : group.items;

    return items.reduce((sum, item) => sum + item.amount, 0);
};

export const monthlyIncome = (plan: BudgetPlan): number => {
    return plan.paychecks.reduce((sum, paycheck) => sum + paycheck.amount, 0);
};

export const allocatedFor = (plan: BudgetPlan, paycheckId: string): number => {
    return plan.groups.reduce(
        (sum, group) => sum + groupTotal(group, paycheckId),
        0,
    );
};

export const unallocatedFor = (
    plan: BudgetPlan,
    paycheckId: string,
): number => {
    const paycheck = plan.paychecks.find((item) => item.id === paycheckId);

    if (!paycheck) {
        return 0;
    }

    return paycheck.amount - allocatedFor(plan, paycheckId);
};

/**
 * Share of a paycheck already spoken for. Returns 0 for an unpaid paycheck so a
 * blank plan reads as "nothing allocated" rather than dividing by zero.
 */
export const allocationShare = (
    plan: BudgetPlan,
    paycheckId: string,
): number => {
    const paycheck = plan.paychecks.find((item) => item.id === paycheckId);

    if (!paycheck || paycheck.amount <= 0) {
        return 0;
    }

    return allocatedFor(plan, paycheckId) / paycheck.amount;
};

export const planTotals = (plan: BudgetPlan): PlanTotals => {
    const income = monthlyIncome(plan);
    const allocated = plan.groups.reduce(
        (sum, group) => sum + groupTotal(group),
        0,
    );

    return { income, allocated, unallocated: income - allocated };
};

/**
 * Moves a plan onto a new cadence without losing anything the user typed.
 *
 * Going monthly to semi-monthly halves the income across the two dates and
 * parks every expense on the 15th to be redistributed; going back sums the
 * income and funds everything from the single paycheck. Expenses are never
 * dropped, and no item is left pointing at a paycheck that no longer exists.
 */
export const reassignTo = (
    plan: BudgetPlan,
    cadence: PayCadence,
): BudgetPlan => {
    if (plan.cadence === cadence) {
        return plan;
    }

    const income = monthlyIncome(plan);
    const amounts =
        cadence === 'semi-monthly'
            ? [Math.floor(income / 2), income - Math.floor(income / 2)]
            : [income];

    const paychecks = paychecksFor(cadence, amounts);
    const targetId = paychecks[0].id;

    return {
        ...plan,
        cadence,
        paychecks,
        groups: plan.groups.map((group) => ({
            ...group,
            items: group.items.map((item) => ({
                ...item,
                paycheckId: targetId,
            })),
        })),
    };
};

const isExpenseItem = (value: unknown): value is ExpenseItem => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const item = value as Partial<ExpenseItem>;

    return (
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.amount === 'number' &&
        typeof item.paycheckId === 'string'
    );
};

const isExpenseGroup = (value: unknown): value is ExpenseGroup => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const group = value as Partial<ExpenseGroup>;

    return (
        typeof group.id === 'string' &&
        typeof group.name === 'string' &&
        Array.isArray(group.items) &&
        group.items.every(isExpenseItem)
    );
};

const isPaycheck = (value: unknown): value is Paycheck => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const paycheck = value as Partial<Paycheck>;

    return (
        typeof paycheck.id === 'string' &&
        typeof paycheck.label === 'string' &&
        typeof paycheck.amount === 'number' &&
        (paycheck.dayOfMonth === 'last' ||
            typeof paycheck.dayOfMonth === 'number')
    );
};

/**
 * Validates a stored plan field by field. A half-written or outdated blob is
 * rejected outright rather than reaching the calculations as `undefined`.
 */
export const isBudgetPlan = (value: unknown): value is BudgetPlan => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const plan = value as Partial<BudgetPlan>;

    return (
        plan.version === PLAN_VERSION &&
        (plan.cadence === 'monthly' || plan.cadence === 'semi-monthly') &&
        Array.isArray(plan.paychecks) &&
        plan.paychecks.length > 0 &&
        plan.paychecks.every(isPaycheck) &&
        Array.isArray(plan.groups) &&
        plan.groups.every(isExpenseGroup)
    );
};

/** True once the user has entered anything worth showing elsewhere. */
export const isPlanPopulated = (plan: BudgetPlan): boolean => {
    return monthlyIncome(plan) > 0 || planTotals(plan).allocated > 0;
};
