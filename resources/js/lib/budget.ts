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
    /** Sends whatever this paycheck has left to savings. See `withSweptRemainders`. */
    savesRemainder?: boolean;
};

export type ExpenseItem = {
    id: string;
    name: string;
    amount: number;
    /** The paycheck that funds this line. */
    paycheckId: string;
    /**
     * Last day this payable is due, as `YYYY-MM-DD`. Absent means it runs
     * indefinitely, which is what most payables do.
     *
     * TODO(backend): a payable past its end date should drop out of the plan on
     * its own. Doing that here would mean trusting the browser clock and
     * deleting the user's data on read, so it waits for the server release,
     * where a scheduled job can retire the line against a clock nobody can
     * change. Until then the date is recorded and shown, and clearing an ended
     * payable is manual.
     */
    endsOn?: string;
    /**
     * Marks this payable as paying off a debt. Purely a category: the row already
     * holds the name, the monthly payment and the end date, which is everything a
     * debt is. Nothing extra is asked for when this is set.
     */
    isDebt?: boolean;
    /**
     * When a debt's payments began, as `YYYY-MM-DD`. Optional, and only asked for
     * on a debt — it buys the two figures the end date alone cannot give: what was
     * borrowed to begin with, and how far through you are. Absent is a valid state
     * for a debt whose start was never recorded.
     */
    startedOn?: string;
};

export type ExpenseGroup = {
    id: string;
    name: string;
    items: ExpenseItem[];
};

export type EmergencyFund = {
    /** How many months of essentials the fund should cover. */
    monthsOfCover: number;
    /**
     * What is set aside today.
     *
     * TODO(backend): typed in by hand and only as current as the last time the
     * user touched it. The plan is forward-looking and holds no balances, so
     * there is nothing here to derive this from. The server release should take
     * it from real account history instead.
     */
    balance: number;
};

export type SavingsPot = {
    /**
     * Savings that are not the emergency fund. Hand-entered for the same reason
     * the fund's balance is — see the note there.
     */
    balance: number;
};

export type BudgetPlan = {
    /** Bumped when the shape changes, so stored plans can be migrated. */
    version: 6;
    cadence: PayCadence;
    paychecks: Paycheck[];
    groups: ExpenseGroup[];
    emergencyFund: EmergencyFund;
    savingsPot: SavingsPot;
};

export type PlanTotals = {
    income: number;
    allocated: number;
    unallocated: number;
};

export const PLAN_VERSION = 6;

export const monthlyPaycheckId = 'monthly';
export const midMonthPaycheckId = 'mid-month';
export const endMonthPaycheckId = 'end-month';

export const payablesGroupId = 'payables';
export const allowanceGroupId = 'allowance';
export const savingsGroupId = 'savings';

export const cadenceOptions: { value: PayCadence; label: string }[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'semi-monthly', label: 'Semi-monthly' },
];

/** Three months is the usual floor, six the usual ceiling. */
export const coverOptions: number[] = [3, 6];

export const createEmergencyFund = (): EmergencyFund => {
    return { monthsOfCover: coverOptions[0], balance: 0 };
};

export const createSavingsPot = (): SavingsPot => {
    return { balance: 0 };
};

/**
 * Fixed ids because these three ship with every new plan — only user-added rows
 * need generated ids, which keeps plan creation free of side effects.
 */
const defaultGroupNames: { id: string; name: string }[] = [
    { id: payablesGroupId, name: 'Payables' },
    { id: allowanceGroupId, name: 'Allowance' },
    { id: savingsGroupId, name: 'Savings' },
];

/**
 * Groups that hold one figure per paycheck rather than a list of named lines.
 * Their heading already says what the number is, so a name beside it would only
 * repeat it. Payables stays itemised — rent and electricity are separate bills
 * and each wants its own row.
 */
const singleAmountGroupIds: string[] = [allowanceGroupId, savingsGroupId];

export const isSingleAmountGroup = (group: ExpenseGroup): boolean => {
    return singleAmountGroupIds.includes(group.id);
};

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
        emergencyFund: createEmergencyFund(),
        savingsPot: createSavingsPot(),
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

export const remainderItemName = 'Remaining balance';

export const remainderItemId = (paycheckId: string): string => {
    return `remainder-${paycheckId}`;
};

/** The swept savings line, as opposed to one the user typed in. */
export const isRemainderItem = (item: ExpenseItem): boolean => {
    return item.id === remainderItemId(item.paycheckId);
};

/** A group's total for one paycheck, ignoring any swept remainder line. */
export const enteredTotalFor = (
    group: ExpenseGroup,
    paycheckId: string,
): number => {
    return itemsFor(group, paycheckId)
        .filter((item) => !isRemainderItem(item))
        .reduce((sum, item) => sum + item.amount, 0);
};

export const singleAmountItemId = (
    groupId: string,
    paycheckId: string,
): string => {
    return `${groupId}-${paycheckId}`;
};

/**
 * Sets what a single-amount group holds for one paycheck, replacing whatever
 * was there before.
 *
 * A plan migrated from v1 can arrive with several lines under Allowance, so the
 * field shows their sum and the first edit collapses them into the one figure
 * on screen. A swept remainder is left where it is — `withSweptRemainders` owns
 * that line. Zero clears the group rather than storing an empty row.
 */
export const withGroupAmount = (
    plan: BudgetPlan,
    groupId: string,
    paycheckId: string,
    amount: number,
): BudgetPlan => {
    return {
        ...plan,
        groups: plan.groups.map((group) => {
            if (group.id !== groupId) {
                return group;
            }

            const untouched = group.items.filter(
                (item) =>
                    item.paycheckId !== paycheckId || isRemainderItem(item),
            );

            if (amount <= 0) {
                return { ...group, items: untouched };
            }

            return {
                ...group,
                items: [
                    ...untouched,
                    {
                        id: singleAmountItemId(groupId, paycheckId),
                        name: group.name,
                        amount,
                        paycheckId,
                    },
                ],
            };
        }),
    };
};

/** What a paycheck has left once every hand-entered line is funded. */
const unsweptRemainder = (plan: BudgetPlan, paycheck: Paycheck): number => {
    const claimed = plan.groups.reduce((sum, group) => {
        return (
            sum +
            group.items.reduce((total, item) => {
                if (item.paycheckId !== paycheck.id || isRemainderItem(item)) {
                    return total;
                }

                return total + item.amount;
            }, 0)
        );
    }, 0);

    return paycheck.amount - claimed;
};

/**
 * Rewrites the swept savings line on every paycheck set to save its remainder,
 * and drops the line from those that are not.
 *
 * Running this after each edit is what makes the sweep automatic. The line is
 * stored like any other expense, so the summary, the dashboard and the totals
 * pick it up without knowing it exists. An over-allocated paycheck sweeps
 * nothing rather than saving a negative amount.
 */
export const withSweptRemainders = (plan: BudgetPlan): BudgetPlan => {
    return {
        ...plan,
        groups: plan.groups.map((group) => {
            if (group.id !== savingsGroupId) {
                return group;
            }

            const entered = group.items.filter(
                (item) => !isRemainderItem(item),
            );
            const swept = plan.paychecks
                .filter((paycheck) => paycheck.savesRemainder)
                .map((paycheck) => ({
                    id: remainderItemId(paycheck.id),
                    name: remainderItemName,
                    amount: Math.max(0, unsweptRemainder(plan, paycheck)),
                    paycheckId: paycheck.id,
                }));

            return { ...group, items: [...entered, ...swept] };
        }),
    };
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
 * What running the plan costs each month: everything that is not savings.
 *
 * Summed across the whole month rather than per paycheck, so the figure is the
 * same whether pay arrives once or twice — splitting when money lands does not
 * change how much a month costs.
 */
export const essentialsPerMonth = (plan: BudgetPlan): number => {
    return plan.groups
        .filter((group) => group.id !== savingsGroupId)
        .reduce((sum, group) => sum + groupTotal(group), 0);
};

/** Everything headed for savings this month, swept remainders included. */
export const savingsPerMonth = (plan: BudgetPlan): number => {
    const savings = plan.groups.find((group) => group.id === savingsGroupId);

    return savings ? groupTotal(savings) : 0;
};

export const emergencyTarget = (plan: BudgetPlan): number => {
    return essentialsPerMonth(plan) * plan.emergencyFund.monthsOfCover;
};

/** Both balances together — everything put by, wherever it sits. */
export const totalSaved = (plan: BudgetPlan): number => {
    return plan.emergencyFund.balance + plan.savingsPot.balance;
};

export type SavingsSplit = {
    essentials: number;
    target: number;
    balance: number;
    /** Still to be found before the fund is full. */
    gap: number;
    /** This month's savings, before the split. */
    saved: number;
    toEmergency: number;
    toPot: number;
    /** `null` when the fund is full, or when nothing is being saved. */
    monthsToFill: number | null;
    /** 0–1, capped, for the progress bar. */
    fundedShare: number;
};

/**
 * Pours this month's savings into the emergency fund first and lets the rest
 * overflow into the pot.
 *
 * The target moves with the plan, so a month that adds a payable can reopen a
 * gap on a fund that was full — which is the point of sizing it on what you
 * actually spend rather than on a number picked once.
 */
export const savingsSplit = (plan: BudgetPlan): SavingsSplit => {
    const essentials = essentialsPerMonth(plan);
    const target = essentials * plan.emergencyFund.monthsOfCover;
    const balance = plan.emergencyFund.balance;
    const gap = Math.max(0, target - balance);
    const saved = savingsPerMonth(plan);
    const toEmergency = Math.min(saved, gap);

    return {
        essentials,
        target,
        balance,
        gap,
        saved,
        toEmergency,
        toPot: saved - toEmergency,
        monthsToFill: gap > 0 && saved > 0 ? Math.ceil(gap / saved) : null,
        fundedShare: target > 0 ? Math.min(balance / target, 1) : 0,
    };
};

/**
 * Payments still to make on a payable that ends, counting the month it ends in.
 * A payable finishing this month still has this month's payment left.
 *
 * `today` is passed in rather than read here, both to keep this file free of
 * ambient state and because the caller should be the one deciding what "now"
 * means. Reading a clock to *show* a projection is fine; note that the TODO on
 * `endsOn` is about never *deleting* a payable on the strength of one.
 */
const parseDate = (value: string): Date | null => {
    const parsed = new Date(`${value}T00:00:00`);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Calendar months from one date to another, ignoring the day of the month. */
const wholeMonthsBetween = (from: Date, to: Date): number => {
    return (
        (to.getFullYear() - from.getFullYear()) * 12 +
        (to.getMonth() - from.getMonth())
    );
};

export const monthsRemaining = (endsOn: string, today: Date): number => {
    const end = parseDate(endsOn);

    return end ? Math.max(0, wholeMonthsBetween(today, end) + 1) : 0;
};

export type DebtHistory = {
    /** Payments across the whole term, counting the first and last months. */
    totalMonths: number;
    monthsPaid: number;
    /** What the debt was to begin with. */
    original: number;
    paid: number;
    /** 0–1, capped, for a progress bar. */
    paidShare: number;
};

/**
 * How far through a debt you are, for one that records when it started.
 *
 * The arithmetic is pinned to `monthsRemaining` so the page cannot contradict
 * itself: months paid plus months remaining is the whole term, which makes
 * `original - paid` exactly the amount the debt page already reports as owed.
 *
 * `null` when either date is missing or the term makes no sense, rather than a
 * zeroed shape that would read as "no progress yet".
 */
export const debtHistoryFor = (
    item: ExpenseItem,
    today: Date,
): DebtHistory | null => {
    if (!item.startedOn || !item.endsOn) {
        return null;
    }

    const start = parseDate(item.startedOn);
    const end = parseDate(item.endsOn);

    if (!start || !end) {
        return null;
    }

    const totalMonths = wholeMonthsBetween(start, end) + 1;

    if (totalMonths <= 0) {
        return null;
    }

    const monthsPaid = Math.min(
        totalMonths,
        Math.max(0, wholeMonthsBetween(start, today)),
    );

    return {
        totalMonths,
        monthsPaid,
        original: item.amount * totalMonths,
        paid: item.amount * monthsPaid,
        paidShare: monthsPaid / totalMonths,
    };
};

export type FreeingUp = {
    /** Monthly amount that stops being spent inside the window. */
    amount: number;
    /** The payables ending, soonest first. */
    ending: ExpenseItem[];
};

/**
 * What the budget is about to get back: the payables that finish inside the next
 * `monthsAhead` months, and what they add up to a month.
 *
 * A date already past is left out. That payable has finished but is still in the
 * plan — retiring it is manual for now (see the note on `endsOn`) — and calling
 * it "about to free up" would be the wrong tense.
 */
export const freeingUpWithin = (
    plan: BudgetPlan,
    monthsAhead: number,
    today: Date,
): FreeingUp => {
    const ending = plan.groups
        .flatMap((group) => group.items)
        .flatMap((item) =>
            item.endsOn
                ? [{ item, months: monthsRemaining(item.endsOn, today) }]
                : [],
        )
        .filter((entry) => entry.months > 0 && entry.months <= monthsAhead)
        .sort((a, b) => a.months - b.months);

    return {
        amount: ending.reduce((sum, entry) => sum + entry.item.amount, 0),
        ending: ending.map((entry) => entry.item),
    };
};

export type DebtProgress = {
    item: ExpenseItem;
    /** This payable's monthly figure. */
    payment: number;
    /** Payments left, or `Infinity` when there is no end date to count to. */
    months: number;
    /** Still owed: the payment times the payments remaining. */
    owed: number;
    /** True when no end date says when this finishes, so nothing can be known. */
    isOpenEnded: boolean;
};

/**
 * What one payable marked as debt still owes — its payment times the payments
 * left. Nothing is asked of the user beyond the row itself.
 *
 * Without an end date there is nothing to count to, and this says so rather than
 * reporting zero. Adding the date is the fix, and it is a field the row already
 * has.
 */
export const debtProgressFor = (
    item: ExpenseItem,
    today: Date,
): DebtProgress => {
    if (!item.endsOn) {
        return {
            item,
            payment: item.amount,
            months: Infinity,
            owed: 0,
            isOpenEnded: true,
        };
    }

    const months = monthsRemaining(item.endsOn, today);

    return {
        item,
        payment: item.amount,
        months,
        owed: item.amount * months,
        isOpenEnded: false,
    };
};

/** Every payable marked as debt, in the order the plan holds them. */
export const debtItems = (plan: BudgetPlan): ExpenseItem[] => {
    return plan.groups.flatMap((group) =>
        group.items.filter((item) => item.isDebt === true),
    );
};

export const debtProgress = (plan: BudgetPlan, today: Date): DebtProgress[] => {
    return debtItems(plan).map((item) => debtProgressFor(item, today));
};

/** Everything still owed across every debt. */
export const totalOwed = (plan: BudgetPlan, today: Date): number => {
    return debtProgress(plan, today).reduce(
        (sum, progress) => sum + progress.owed,
        0,
    );
};

/** Going out on debt each month, whatever is known about the balances. */
export const totalDebtPayment = (plan: BudgetPlan): number => {
    return debtItems(plan).reduce((sum, item) => sum + item.amount, 0);
};

/**
 * When the last debt clears — the longest single payoff, not the total divided
 * by the total payment. Nothing here rolls a cleared debt's payment onto the
 * next one, so the slowest debt decides when you are done.
 *
 * `Infinity` when any debt has no end date and no balance to work one out from.
 */
export const monthsToDebtFree = (plan: BudgetPlan, today: Date): number => {
    return debtProgress(plan, today)
        .filter((progress) => progress.owed > 0 || progress.isOpenEnded)
        .reduce((longest, progress) => Math.max(longest, progress.months), 0);
};

/**
 * Moves a plan onto a new cadence without losing anything the user typed.
 *
 * Going monthly to semi-monthly halves the income across the two dates and
 * parks every expense on the 15th to be redistributed; going back sums the
 * income and funds everything from the single paycheck. Expenses are never
 * dropped, and no item is left pointing at a paycheck that no longer exists.
 *
 * Saving the remainder carries over if any paycheck was doing it, so the
 * setting is not silently lost on a cadence the user is only trying out.
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

    const savesRemainder = plan.paychecks.some(
        (paycheck) => paycheck.savesRemainder,
    );
    const paychecks = paychecksFor(cadence, amounts).map((paycheck) => ({
        ...paycheck,
        savesRemainder,
    }));
    const targetId = paychecks[0].id;

    return withSweptRemainders({
        ...plan,
        cadence,
        paychecks,
        groups: plan.groups.map((group) => ({
            ...group,
            items: group.items
                .filter((item) => !isRemainderItem(item))
                .map((item) => ({
                    ...item,
                    paycheckId: targetId,
                })),
        })),
    });
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
        typeof item.paycheckId === 'string' &&
        (item.endsOn === undefined || typeof item.endsOn === 'string') &&
        (item.isDebt === undefined || typeof item.isDebt === 'boolean') &&
        (item.startedOn === undefined || typeof item.startedOn === 'string')
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
            typeof paycheck.dayOfMonth === 'number') &&
        (paycheck.savesRemainder === undefined ||
            typeof paycheck.savesRemainder === 'boolean')
    );
};

const isEmergencyFund = (value: unknown): value is EmergencyFund => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const fund = value as Partial<EmergencyFund>;

    return (
        typeof fund.monthsOfCover === 'number' &&
        fund.monthsOfCover > 0 &&
        typeof fund.balance === 'number'
    );
};

const isSavingsPot = (value: unknown): value is SavingsPot => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    return typeof (value as Partial<SavingsPot>).balance === 'number';
};

/** A plan of any version, as it comes back out of storage. */
type StoredPlan = Omit<
    BudgetPlan,
    'version' | 'emergencyFund' | 'savingsPot'
> & {
    version: number;
    emergencyFund?: unknown;
    savingsPot?: unknown;
    /** v5 only, where debts were their own records. Dropped on migration. */
    debts?: unknown;
};

/**
 * Validates the part of a stored plan every version shares, at the version
 * given. A half-written blob is rejected rather than reaching the calculations
 * as `undefined`.
 */
const hasPlanShape = (value: unknown, version: number): boolean => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const plan = value as Partial<StoredPlan>;

    return (
        plan.version === version &&
        (plan.cadence === 'monthly' || plan.cadence === 'semi-monthly') &&
        Array.isArray(plan.paychecks) &&
        plan.paychecks.length > 0 &&
        plan.paychecks.every(isPaycheck) &&
        Array.isArray(plan.groups) &&
        plan.groups.every(isExpenseGroup)
    );
};

export const isBudgetPlan = (value: unknown): value is BudgetPlan => {
    return (
        hasPlanShape(value, PLAN_VERSION) &&
        isEmergencyFund((value as StoredPlan).emergencyFund) &&
        isSavingsPot((value as StoredPlan).savingsPot)
    );
};

/**
 * Where each group a v1 plan shipped with lands in v2. Anything unrecognised
 * goes to Payables rather than taking the user's expenses down with it.
 */
const v1GroupMoves: Record<string, string> = {
    needs: 'payables',
    utilities: 'payables',
    wants: 'allowance',
    savings: savingsGroupId,
};

/**
 * A v5 payable pointed at a debt record by id. The flag says the same thing
 * without the second record, so the link becomes the flag and the id goes.
 */
const flaggedFromV5Debt = (item: ExpenseItem): ExpenseItem => {
    const { debtId, ...carried } = item as ExpenseItem & { debtId?: string };

    return debtId === undefined ? carried : { ...carried, isDebt: true };
};

/** Folds a v1 plan's four groups into the three that replaced them. */
const regroupedFromV1 = (previous: StoredPlan): ExpenseGroup[] => {
    return defaultGroupNames.map((group) => ({
        ...group,
        items: previous.groups.flatMap((old) =>
            (v1GroupMoves[old.id] ?? payablesGroupId) === group.id
                ? old.items
                : [],
        ),
    }));
};

/**
 * Brings a stored plan up to the current version, or returns `null` when it is
 * too far gone to trust.
 *
 * v1 had Needs, Utilities, Wants and Savings; the first two became Payables and
 * Wants became Allowance, so nothing entered is lost. v2 predates the emergency
 * fund and v3 the savings pot, so each gets a fresh one. v5 kept debts as their
 * own records, which v6 folds back into the payables that pay them; the records
 * themselves are dropped, since a debt with no payable was never funded anyway.
 * A current plan carrying a damaged balance keeps its expenses and has that
 * balance reset, rather than being thrown away whole.
 */
export const migratePlan = (value: unknown): BudgetPlan | null => {
    if (isBudgetPlan(value)) {
        return value;
    }

    const storedVersion = [1, 2, 3, 4, 5, PLAN_VERSION].find((version) =>
        hasPlanShape(value, version),
    );

    if (!storedVersion) {
        return null;
    }

    const previous = value as StoredPlan;

    // Built field by field rather than spread, so a retired key like v5's
    // `debts` cannot ride along into the migrated plan.
    return {
        version: PLAN_VERSION,
        cadence: previous.cadence,
        paychecks: previous.paychecks,
        groups: (storedVersion === 1
            ? regroupedFromV1(previous)
            : previous.groups
        ).map((group) => ({
            ...group,
            items: group.items.map(flaggedFromV5Debt),
        })),
        emergencyFund: isEmergencyFund(previous.emergencyFund)
            ? previous.emergencyFund
            : createEmergencyFund(),
        savingsPot: isSavingsPot(previous.savingsPot)
            ? previous.savingsPot
            : createSavingsPot(),
    };
};

/** True once the user has entered anything worth showing elsewhere. */
export const isPlanPopulated = (plan: BudgetPlan): boolean => {
    return monthlyIncome(plan) > 0 || planTotals(plan).allocated > 0;
};
