import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowDownRight,
    ArrowUpRight,
    ChartColumn,
    ChartPie,
    CreditCard,
    Info,
    Landmark,
    PiggyBank,
    ShieldCheck,
    TrendingUp,
} from 'lucide-react';
import { SavingsChart } from '@/components/dashboard/savings-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStoredBudgetPlan } from '@/hooks/use-budget-plan';
import { useSavingsHistory } from '@/hooks/use-savings';
import type { BudgetPlan, FreeingUp } from '@/lib/budget';
import {
    freeingUpWithin,
    groupTotal,
    isPlanPopulated,
    planTotals,
    savingsGroupId,
    savingsSplit,
    totalOwed,
    totalSaved as planTotalSaved,
} from '@/lib/budget';
import { formatPeso, formatSigned } from '@/lib/currency';
import { lastMonths, monthShortLabel } from '@/lib/savings';
import { dashboard } from '@/routes';
import dashboardRoutes from '@/routes/dashboard';
import { edit as financeRoute } from '@/routes/finance';

/**
 * Figures the budget plan cannot supply yet — they need balances and history
 * rather than a forward-looking plan. These stay sample data until the backend
 * release gives them somewhere real to come from.
 */
const sampleTotalSaved = 82_400;
const sampleMonthlyGoal = 7_200;
const sampleFreesUp = 2_500;

/** How far ahead the cashflow tile looks for payables that finish. */
const cashflowWindowMonths = 12;

const sampleSupportingStats = [
    { label: 'Average monthly save', value: 6_880 },
    { label: 'Emergency buffer', value: 18_200 },
];

/** How much history the chart shows. Enough to read a trend, few enough to fit. */
const chartMonths = 6;

const sampleOutstandingDebt = -16_780;

const recentActivity = [
    { title: 'Mortgage payment', amount: -1_250, when: 'Today' },
    { title: 'Spotify subscription', amount: -15, when: 'Yesterday' },
    { title: 'Salary deposit', amount: 5_800, when: '2 days ago' },
    { title: 'Credit card payment', amount: -420, when: '4 days ago' },
];

const sampleCategories = [
    { name: 'Housing', amount: 1_450 },
    { name: 'Utilities', amount: 630 },
    { name: 'Groceries', amount: 540 },
    { name: 'Transport', amount: 305 },
];

const categoryColors = [
    'bg-cyan-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-sky-500',
    'bg-fuchsia-500',
    'bg-teal-500',
];

type FundFigures = {
    balance: number;
    target: number;
    gap: number;
    monthsToFill: number | null;
    percent: number;
};

type DerivedFigures = {
    monthlyGoal: number;
    monthlyExpenses: number;
    /** Monthly amount coming back as payables finish, and what to say about it. */
    projectedCashflow: number;
    cashflowNote: string;
    /** Negative, like the other outgoing figures. Zero once nothing is owed. */
    outstandingDebt: number;
    categories: { name: string; amount: number; color: string }[];
    /** Both balances together once a plan exists, sample data before that. */
    totalSaved: number;
    savedPerMonth: number;
    savingsBreakdown: { label: string; value: number }[];
    /** Null without a plan — there is nothing to size a fund against. */
    fund: FundFigures | null;
};

const withColors = (
    categories: { name: string; amount: number }[],
): DerivedFigures['categories'] => {
    return categories.map((category, index) => ({
        ...category,
        color: categoryColors[index % categoryColors.length],
    }));
};

/**
 * "Jul 2027" from a stored `YYYY-MM-DD`. Parsed rather than read off the clock,
 * so the label is whatever the user typed.
 */
const monthLabel = (endsOn: string): string => {
    return new Date(`${endsOn}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
    });
};

/**
 * Names what is about to free up. One payable gets named outright, because that
 * is the useful version — "the laptop finishes in July" is actionable in a way
 * that a bare total is not.
 */
const cashflowNoteFor = ({ ending }: FreeingUp): string => {
    if (ending.length === 0) {
        return `Nothing ends in the next ${cashflowWindowMonths} months`;
    }

    const last = ending[ending.length - 1];

    if (ending.length === 1) {
        return `when ${last.name || 'a payable'} ends in ${monthLabel(last.endsOn ?? '')}`;
    }

    return `across ${ending.length} payables by ${monthLabel(last.endsOn ?? '')}`;
};

/**
 * Reads the saved budget plan where it can, and falls back to the sample
 * figures so a first visit never renders an empty dashboard.
 */
const deriveFigures = (
    plan: BudgetPlan | null,
    today: Date,
): DerivedFigures => {
    if (!plan || !isPlanPopulated(plan)) {
        return {
            monthlyGoal: sampleMonthlyGoal,
            monthlyExpenses: -4_125,
            projectedCashflow: sampleFreesUp,
            cashflowNote: 'when an installment ends',
            outstandingDebt: sampleOutstandingDebt,
            categories: withColors(sampleCategories),
            totalSaved: sampleTotalSaved,
            savedPerMonth: sampleMonthlyGoal,
            savingsBreakdown: sampleSupportingStats,
            fund: null,
        };
    }

    const { allocated } = planTotals(plan);
    const savingsGroup = plan.groups.find(
        (group) => group.id === savingsGroupId,
    );
    const plannedSavings = savingsGroup ? groupTotal(savingsGroup) : 0;
    const split = savingsSplit(plan);
    const freeingUp = freeingUpWithin(plan, cashflowWindowMonths, today);

    return {
        /**
         * What the plan intends to put by each month, swept remainder included.
         * No sample fallback once there is a plan: the goal line sits against
         * real history now, and a made-up target would misread every bar.
         */
        monthlyGoal: plannedSavings,
        monthlyExpenses: -(allocated - plannedSavings),
        projectedCashflow: freeingUp.amount,
        cashflowNote: cashflowNoteFor(freeingUp),
        outstandingDebt: -totalOwed(plan, today),
        categories: withColors(
            plan.groups
                .map((group) => ({
                    name: group.name,
                    amount: groupTotal(group),
                }))
                .filter((group) => group.amount > 0),
        ),
        totalSaved: planTotalSaved(plan),
        savedPerMonth: split.saved,
        savingsBreakdown: [
            { label: 'Emergency fund', value: plan.emergencyFund.balance },
            { label: 'Savings pot', value: plan.savingsPot.balance },
        ],
        fund: {
            balance: split.balance,
            target: split.target,
            gap: split.gap,
            monthsToFill: split.monthsToFill,
            percent:
                split.target > 0
                    ? Math.round(
                          Math.min(split.balance / split.target, 1) * 100,
                      )
                    : 0,
        },
    };
};

/** Same order of checks as the planner: sized before funded. */
const fundNote = ({ target, gap, monthsToFill }: FundFigures): string => {
    if (target <= 0) {
        return 'Add your payables and allowance on the plan to size this.';
    }

    if (gap <= 0) {
        return 'Funded. Savings now go to the pot.';
    }

    return monthsToFill !== null
        ? `${formatPeso(gap)} to go · full in ${monthsToFill} ${monthsToFill === 1 ? 'month' : 'months'} at this rate.`
        : `${formatPeso(gap)} to go · nothing going to savings yet.`;
};

export default function Dashboard() {
    const plan = useStoredBudgetPlan();
    const history = useSavingsHistory();
    const hasPlan = plan !== null && isPlanPopulated(plan);
    /** Real months, however few — a finalized payday is the only source. */
    const chartData = lastMonths(history, chartMonths).map((entry) => ({
        month: monthShortLabel(entry.month),
        amount: entry.saved,
    }));
    const {
        monthlyGoal,
        monthlyExpenses,
        projectedCashflow,
        cashflowNote,
        outstandingDebt,
        categories,
        totalSaved,
        savedPerMonth,
        savingsBreakdown,
        fund,
    } = deriveFigures(plan, new Date());
    const categoryTotal = categories.reduce(
        (sum, item) => sum + item.amount,
        0,
    );

    const metrics = [
        {
            label: 'Monthly expenses',
            value: monthlyExpenses,
            note: hasPlan ? 'Planned outgoing' : 'Outgoing this month',
            icon: CreditCard,
        },
        {
            label: 'Outstanding debt',
            value: outstandingDebt,
            note: outstandingDebt === 0 ? 'Nothing owed' : 'Remaining balance',
            icon: Landmark,
        },
        {
            label: 'Projected cashflow',
            value: projectedCashflow,
            note: cashflowNote,
            icon: TrendingUp,
        },
    ];

    return (
        <>
            <Head title="Dashboard" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-wrap items-baseline justify-between gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Savings overview
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                        })}
                    </p>
                </header>

                {!hasPlan && (
                    <Card>
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                            <p className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Info
                                    aria-hidden
                                    className="mt-0.5 size-4 shrink-0"
                                />
                                These are sample figures. Set up your budget
                                plan to see your own numbers here.
                            </p>
                            <Button variant="secondary" size="sm" asChild>
                                <Link href={financeRoute()}>
                                    Build your plan
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                    <PiggyBank aria-hidden className="size-4" />
                                </span>
                                Total saved
                            </p>
                            <p
                                data-test="dashboard-saved"
                                className="mt-1 text-4xl font-semibold tracking-tight tabular-nums"
                            >
                                {formatPeso(totalSaved)}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground tabular-nums">
                                {formatPeso(savedPerMonth)} a month going in
                            </p>
                        </div>

                        <dl className="flex shrink-0 gap-8">
                            {savingsBreakdown.map((stat) => (
                                <div key={stat.label}>
                                    <dt className="text-sm text-muted-foreground">
                                        {stat.label}
                                    </dt>
                                    <dd className="mt-1 text-xl font-semibold tabular-nums">
                                        {formatPeso(stat.value)}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </CardContent>
                </Card>

                {fund && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ShieldCheck
                                    aria-hidden
                                    className="size-4 text-muted-foreground"
                                />
                                Emergency fund
                            </CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={financeRoute()}>Adjust</Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <p
                                    data-test="dashboard-fund"
                                    className="text-2xl font-semibold tracking-tight tabular-nums"
                                >
                                    {formatPeso(fund.balance)}
                                </p>
                                <p className="text-sm text-muted-foreground tabular-nums">
                                    {fund.target > 0
                                        ? `of ${formatPeso(fund.target)} target · ${fund.percent}% funded`
                                        : 'not sized yet'}
                                </p>
                            </div>

                            <div
                                role="progressbar"
                                aria-valuenow={fund.percent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Emergency fund progress"
                                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
                            >
                                <div
                                    className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 motion-reduce:transition-none dark:bg-emerald-400"
                                    style={{ width: `${fund.percent}%` }}
                                />
                            </div>

                            <p
                                data-test="dashboard-fund-note"
                                className="mt-2 text-xs text-muted-foreground"
                            >
                                {fundNote(fund)}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/*
                 * Each tile owns its own <dl>. A single list wrapping the cards
                 * put two divs between the list and its terms, which is not a
                 * shape a description list is allowed to take.
                 */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {metrics.map((metric) => (
                        <Card key={metric.label}>
                            <CardContent className="p-5">
                                <dl>
                                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <metric.icon
                                            aria-hidden
                                            className="size-4"
                                        />
                                        {metric.label}
                                    </dt>
                                    <dd
                                        className={`mt-1 text-2xl font-semibold tabular-nums ${
                                            metric.value > 0
                                                ? 'text-emerald-700 dark:text-emerald-400'
                                                : 'text-foreground'
                                        }`}
                                    >
                                        {metric.value > 0
                                            ? formatSigned(metric.value)
                                            : formatPeso(metric.value)}
                                    </dd>
                                </dl>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {metric.note}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ChartColumn
                                    aria-hidden
                                    className="size-4 text-muted-foreground"
                                />
                                Monthly savings
                            </CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={dashboardRoutes.months()}>
                                    View all months
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {chartData.length > 0 ? (
                                <SavingsChart
                                    data={chartData}
                                    goal={monthlyGoal}
                                    formatAmount={formatPeso}
                                />
                            ) : (
                                <p
                                    data-test="savings-empty"
                                    className="py-10 text-sm text-muted-foreground"
                                >
                                    No month has been settled yet. Finalize a
                                    payday on the payouts page and it lands here.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ChartPie
                                    aria-hidden
                                    className="size-4 text-muted-foreground"
                                />
                                {hasPlan
                                    ? 'Planned by group'
                                    : 'Spending categories'}
                            </CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link
                                    href={financeRoute()}
                                    data-test="manage-categories"
                                >
                                    Manage
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="divide-y divide-border pt-0">
                            {categories.slice(0, 6).map((item) => {
                                const share =
                                    categoryTotal > 0
                                        ? Math.round(
                                              (item.amount / categoryTotal) *
                                                  100,
                                          )
                                        : 0;

                                return (
                                    <div
                                        key={item.name}
                                        className="flex items-center justify-between gap-4 py-3"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span
                                                className={`size-2.5 shrink-0 rounded-full ${item.color}`}
                                            />
                                            <span className="truncate text-sm">
                                                {item.name}
                                            </span>
                                        </div>
                                        <div className="flex shrink-0 items-baseline gap-3">
                                            <span className="text-sm font-medium tabular-nums">
                                                {formatPeso(item.amount)}
                                            </span>
                                            <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
                                                {share}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity
                                aria-hidden
                                className="size-4 text-muted-foreground"
                            />
                            Recent activity
                        </CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={dashboardRoutes.activities()}>
                                Show all
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="divide-y divide-border pt-0">
                        {recentActivity.map((item) => (
                            <div
                                key={item.title}
                                className="flex items-center justify-between gap-4 py-3"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    {/*
                                     * The sign is already in the amount, so the
                                     * arrow is decoration — it just gives the
                                     * eye something to scan the column by.
                                     */}
                                    <span
                                        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                                            item.amount > 0
                                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {item.amount > 0 ? (
                                            <ArrowUpRight
                                                aria-hidden
                                                className="size-4"
                                            />
                                        ) : (
                                            <ArrowDownRight
                                                aria-hidden
                                                className="size-4"
                                            />
                                        )}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.when}
                                        </p>
                                    </div>
                                </div>
                                <p
                                    className={`shrink-0 text-sm font-medium tabular-nums ${
                                        item.amount > 0
                                            ? 'text-emerald-700 dark:text-emerald-400'
                                            : 'text-foreground'
                                    }`}
                                >
                                    {formatSigned(item.amount)}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
