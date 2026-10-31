import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    ArrowDownRight,
    ArrowUpRight,
    ChartColumn,
    ChartPie,
    CreditCard,
    Landmark,
    PiggyBank,
    ShieldCheck,
    TrendingUp,
} from 'lucide-react';
import { DashboardOnboarding } from '@/components/dashboard/dashboard-onboarding';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { SavingsChart } from '@/components/dashboard/savings-chart';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStoredBudgetPlan } from '@/hooks/use-budget-plan';
import { useSavingsHistory } from '@/hooks/use-savings';
import type { Activity as ActivityRow } from '@/lib/activities';
import { formatActivityDate } from '@/lib/activities';
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
import { index as payoutsRoute } from '@/routes/payouts';

/** How far ahead the cashflow tile looks for payables that finish. */
const cashflowWindowMonths = 12;

/** How much history the chart shows. Enough to read a trend, few enough to fit. */
const chartMonths = 6;

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
    /** Both balances together. */
    totalSaved: number;
    savedPerMonth: number;
    savingsBreakdown: { label: string; value: number }[];
    fund: FundFigures;
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
 * Everything the overview shows, read off the saved plan. Only called once a
 * plan exists — before that the page shows the onboarding state instead.
 */
const deriveFigures = (plan: BudgetPlan, today: Date): DerivedFigures => {
    const { allocated } = planTotals(plan);
    const savingsGroup = plan.groups.find(
        (group) => group.id === savingsGroupId,
    );
    const plannedSavings = savingsGroup ? groupTotal(savingsGroup) : 0;
    const split = savingsSplit(plan);
    const freeingUp = freeingUpWithin(plan, cashflowWindowMonths, today);

    return {
        /** What the plan intends to put by each month, swept remainder included. */
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

/** Heights of the ghost bars, as a share of their frame. */
const ghostBars = [40, 64, 52, 80, 68, 92];

/** The chart's outline with nothing in it, so the empty card keeps its shape. */
function ChartGhost() {
    return (
        <div
            aria-hidden
            className="mb-2 flex h-16 w-full max-w-xs items-end gap-2 border-b border-border px-2"
        >
            {ghostBars.map((height, index) => (
                <div
                    key={index}
                    className="flex-1 rounded-t-sm border border-b-0 border-dashed border-muted-foreground/30 bg-muted/40"
                    style={{ height: `${height}%` }}
                />
            ))}
        </div>
    );
}

function OverviewHeader() {
    return (
        <PageHeader
            title="Savings overview"
            description={new Date().toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
            })}
        />
    );
}

export default function Dashboard({
    recentActivity,
}: {
    /** The newest rows of the activity log, newest first. */
    recentActivity: ActivityRow[];
}) {
    const plan = useStoredBudgetPlan();
    const history = useSavingsHistory();

    if (plan === null || !isPlanPopulated(plan)) {
        return (
            <>
                <Head title="Dashboard" />

                <div className="flex w-full flex-col gap-6 p-4 md:p-6">
                    <OverviewHeader />
                    <DashboardOnboarding />
                </div>
            </>
        );
    }

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
            note: 'Planned outgoing',
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

            <div className="flex w-full flex-col gap-6 p-4 md:p-6">
                <OverviewHeader />

                {/*
                 * What you have and what is protecting it, side by side. They
                 * were two full-width cards, which pushed each figure's label
                 * to the opposite edge of the screen from the figure itself.
                 */}
                <Card className="py-0">
                    <CardContent className="grid gap-0 px-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
                        <div className="space-y-6 p-6">
                            <div>
                                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <PiggyBank
                                        aria-hidden
                                        className="size-4 text-jade"
                                    />
                                    Total saved
                                </p>
                                <p
                                    data-test="dashboard-saved"
                                    className="mt-1 text-4xl font-semibold tracking-tight tabular-nums"
                                >
                                    {formatPeso(totalSaved)}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                                    {formatPeso(savedPerMonth)} a month going in
                                </p>
                            </div>

                            <dl className="flex flex-wrap gap-x-10 gap-y-4">
                                {savingsBreakdown.map((stat) => (
                                    <div key={stat.label}>
                                        <dt className="text-sm text-muted-foreground">
                                            {stat.label}
                                        </dt>
                                        <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                                            {formatPeso(stat.value)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>

                        <div className="space-y-3 border-t border-border p-6 lg:border-t-0 lg:border-l">
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="flex items-center gap-2 text-sm font-semibold">
                                    <ShieldCheck
                                        aria-hidden
                                        className="size-4 text-muted-foreground"
                                    />
                                    Emergency fund
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="-mr-2"
                                    asChild
                                >
                                    <Link href={financeRoute()}>Adjust</Link>
                                </Button>
                            </div>

                            <div>
                                <p
                                    data-test="dashboard-fund"
                                    className="text-2xl font-semibold tracking-tight tabular-nums"
                                >
                                    {formatPeso(fund.balance)}
                                </p>
                                <p className="text-sm text-muted-foreground tabular-nums">
                                    {fund.target > 0
                                        ? `of ${formatPeso(fund.target)} target, ${fund.percent}% funded`
                                        : 'not sized yet'}
                                </p>
                            </div>

                            <div
                                role="progressbar"
                                aria-valuenow={fund.percent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Emergency fund progress"
                                className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                            >
                                <div
                                    className="h-full rounded-full bg-jade transition-[width] duration-500 motion-reduce:transition-none"
                                    style={{ width: `${fund.percent}%` }}
                                />
                            </div>

                            <p
                                data-test="dashboard-fund-note"
                                className="text-sm text-muted-foreground"
                            >
                                {fundNote(fund)}
                            </p>
                        </div>
                    </CardContent>
                </Card>

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
                                                ? 'text-jade'
                                                : 'text-foreground'
                                        }`}
                                    >
                                        {metric.value > 0
                                            ? formatSigned(metric.value)
                                            : formatPeso(metric.value)}
                                    </dd>
                                </dl>
                                <p className="mt-1 text-sm text-muted-foreground">
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
                                <EmptyPanel
                                    data-test="savings-empty"
                                    icon={ChartColumn}
                                    title="No month has been settled yet"
                                    action={{
                                        label: 'Go to paydays',
                                        href: payoutsRoute(),
                                    }}
                                    preview={<ChartGhost />}
                                >
                                    Finalize a payday and what it actually put
                                    by lands here, one bar per month.
                                </EmptyPanel>
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
                                Planned by group
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
                                            <span className="w-9 text-right text-sm text-muted-foreground tabular-nums">
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
                        {recentActivity.length === 0 && (
                            <EmptyPanel
                                data-test="activity-empty"
                                icon={Activity}
                                title="No activity yet"
                                action={{
                                    label: 'Go to paydays',
                                    href: payoutsRoute(),
                                }}
                            >
                                Every row here comes from a payday. Once one
                                opens, what it brings in and sends out shows up
                                here.
                            </EmptyPanel>
                        )}
                        {recentActivity.map((item) => (
                            <div
                                key={item.key}
                                data-test="activity-row"
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
                                                ? 'bg-jade/10 text-jade-ink'
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
                                        <p className="text-sm text-muted-foreground">
                                            {formatActivityDate(item.date)}
                                            {item.status === 'pending' &&
                                                ' · Pending'}
                                        </p>
                                    </div>
                                </div>
                                <p
                                    className={`shrink-0 text-sm font-medium tabular-nums ${
                                        item.amount > 0
                                            ? 'text-jade'
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
