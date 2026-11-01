import { Head, Link } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowUpRight,
    Landmark,
    PiggyBank,
    ShieldCheck,
    TrendingUp,
} from 'lucide-react';
import { DashboardOnboarding } from '@/components/dashboard/dashboard-onboarding';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { FundRing } from '@/components/dashboard/fund-ring';
import { PayFlow } from '@/components/dashboard/pay-flow';
import { SavingsChart } from '@/components/dashboard/savings-chart';
import { PageHeader } from '@/components/page-header';
import { PixelArt } from '@/components/pixel-art';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStoredBudgetPlan } from '@/hooks/use-budget-plan';
import { useSavingsHistory } from '@/hooks/use-savings';
import type { Activity as ActivityRow } from '@/lib/activities';
import { formatActivityDate } from '@/lib/activities';
import type { BudgetPlan, FreeingUp } from '@/lib/budget';
import {
    allowanceGroupId,
    freeingUpWithin,
    groupTotal,
    isPlanPopulated,
    payablesGroupId,
    planTotals,
    savingsGroupId,
    savingsSplit,
    totalOwed,
    totalSaved as planTotalSaved,
} from '@/lib/budget';
import { formatPeso, formatSigned } from '@/lib/currency';
import { lastMonths, monthShortLabel } from '@/lib/savings';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import dashboardRoutes from '@/routes/dashboard';
import { edit as financeRoute } from '@/routes/finance';
import { index as payoutsRoute } from '@/routes/payouts';

/** How far ahead the cashflow tile looks for payables that finish. */
const cashflowWindowMonths = 12;

/** How much history the chart shows. Enough to read a trend, few enough to fit. */
const chartMonths = 6;

/**
 * Each group keeps one colour everywhere it is drawn. Savings is jade, the
 * app's colour for money that is safe; the two kinds of spending take the
 * chart's blue and amber so they read as different from it and each other.
 */
const groupColors: Record<string, string> = {
    [payablesGroupId]: 'bg-chart-2',
    [allowanceGroupId]: 'bg-chart-3',
    [savingsGroupId]: 'bg-jade',
};

/** For any group the plan adds beyond the three it ships with. */
const categoryColors = ['bg-chart-4', 'bg-chart-5', 'bg-chart-1'];

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

function OverviewHeader() {
    return (
        <PageHeader
            art="wallet"
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
    const today = new Date();
    const {
        monthlyGoal,
        monthlyExpenses,
        projectedCashflow,
        cashflowNote,
        outstandingDebt,
        totalSaved,
        savedPerMonth,
        savingsBreakdown,
        fund,
    } = deriveFigures(plan, today);
    const { income, unallocated } = planTotals(plan);
    const payFlow = plan.groups.map((group, index) => ({
        id: group.id,
        name: group.name,
        amount: groupTotal(group),
        color:
            groupColors[group.id] ??
            categoryColors[index % categoryColors.length],
    }));

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex w-full flex-col gap-6 p-4 md:p-6">
                <OverviewHeader />

                <Card className="py-0">
                    <CardContent className="p-6 md:p-8">
                        <PayFlow
                            month={today.toLocaleDateString('en-US', {
                                month: 'long',
                            })}
                            income={income}
                            expenses={Math.abs(monthlyExpenses)}
                            segments={payFlow}
                            unassigned={unallocated}
                        />
                    </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="gap-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <PiggyBank
                                    aria-hidden
                                    className="size-4 text-jade"
                                />
                                Total saved
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p
                                        data-test="dashboard-saved"
                                        className="text-3xl font-semibold tracking-tight tabular-nums"
                                    >
                                        {formatPeso(totalSaved)}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                                        {formatPeso(savedPerMonth)} a month
                                        going in
                                    </p>
                                </div>
                                <PixelArt
                                    sprite="piggy-bank"
                                    size={80}
                                    className="-my-6"
                                />
                            </div>
                            <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                                {savingsBreakdown.map((stat) => (
                                    <div key={stat.label}>
                                        <dt className="text-sm text-muted-foreground">
                                            {stat.label}
                                        </dt>
                                        <dd className="mt-0.5 font-semibold tabular-nums">
                                            {formatPeso(stat.value)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </CardContent>
                    </Card>

                    <Card className="gap-4">
                        <CardHeader className="flex flex-row items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <ShieldCheck aria-hidden className="size-4" />
                                Emergency fund
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="-my-1 -mr-2"
                                asChild
                            >
                                <Link href={financeRoute()}>Adjust</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-5">
                                <FundRing
                                    percent={fund.percent}
                                    label="Emergency fund progress"
                                />
                                <div className="min-w-0 flex-1">
                                    <p
                                        data-test="dashboard-fund"
                                        className="text-2xl font-semibold tracking-tight tabular-nums"
                                    >
                                        {formatPeso(fund.balance)}
                                    </p>
                                    <p className="text-sm text-muted-foreground tabular-nums">
                                        {fund.target > 0
                                            ? `of ${formatPeso(fund.target)} target`
                                            : 'not sized yet'}
                                    </p>
                                </div>
                                <PixelArt sprite="umbrella" size={80} />
                            </div>
                            <p
                                data-test="dashboard-fund-note"
                                className="border-t border-border pt-4 text-sm text-muted-foreground"
                            >
                                {fundNote(fund)}
                            </p>
                        </CardContent>
                    </Card>

                    {/*
                     * What you owe, and what it frees up as it ends — the same
                     * payables seen from both directions, so they share a card.
                     */}
                    <Card className="gap-4">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Landmark aria-hidden className="size-4" />
                                Outstanding debt
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-3xl font-semibold tracking-tight tabular-nums">
                                        {formatPeso(outstandingDebt)}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {outstandingDebt === 0
                                            ? 'Nothing owed'
                                            : 'Remaining balance'}
                                    </p>
                                </div>
                                <PixelArt
                                    sprite="mountain"
                                    size={80}
                                    className="-my-6"
                                />
                            </div>
                            <div className="border-t border-border pt-4">
                                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <TrendingUp
                                        aria-hidden
                                        className="size-4"
                                    />
                                    Projected cashflow
                                </p>
                                <p
                                    className={cn(
                                        'mt-0.5 font-semibold tabular-nums',
                                        projectedCashflow > 0 && 'text-jade',
                                    )}
                                >
                                    {projectedCashflow > 0
                                        ? formatSigned(projectedCashflow)
                                        : formatPeso(projectedCashflow)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {cashflowNote}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/*
                 * Both cards stretch to the taller one, and the chart grows to
                 * fill whatever height that leaves — no ragged bottom edge.
                 */}
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <PixelArt sprite="chart" size={24} />
                                Monthly savings
                            </CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={dashboardRoutes.months()}>
                                    View all months
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1">
                            {chartData.length > 0 ? (
                                <SavingsChart
                                    data={chartData}
                                    goal={monthlyGoal}
                                    formatAmount={formatPeso}
                                />
                            ) : (
                                <EmptyPanel
                                    data-test="savings-empty"
                                    art="chart"
                                    title="No month has been settled yet"
                                    action={{
                                        label: 'Go to paydays',
                                        href: payoutsRoute(),
                                    }}
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
                                <PixelArt sprite="receipt" size={24} />
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
                                    art="receipt"
                                    title="No activity yet"
                                    action={{
                                        label: 'Go to paydays',
                                        href: payoutsRoute(),
                                    }}
                                >
                                    Every row here comes from a payday. Once one
                                    opens, what it brings in and sends out shows
                                    up here.
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
                                         * The sign is already in the amount,
                                         * so the arrow is decoration — it just
                                         * gives the eye something to scan the
                                         * column by.
                                         */}
                                        <span
                                            className={cn(
                                                'flex size-8 shrink-0 items-center justify-center rounded-full',
                                                item.amount > 0
                                                    ? 'bg-jade/10 text-jade-ink'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
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
                                        className={cn(
                                            'shrink-0 text-sm font-medium tabular-nums',
                                            item.amount > 0 && 'text-jade',
                                        )}
                                    >
                                        {formatSigned(item.amount)}
                                    </p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
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
