import { Head, Link } from '@inertiajs/react';
import { SavingsChart } from '@/components/dashboard/savings-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStoredBudgetPlan } from '@/hooks/use-budget-plan';
import type { BudgetPlan } from '@/lib/budget';
import { groupTotal, isPlanPopulated, planTotals } from '@/lib/budget';
import { formatPeso, formatSigned } from '@/lib/currency';
import { dashboard } from '@/routes';
import dashboardRoutes from '@/routes/dashboard';
import { edit as financeRoute } from '@/routes/finance';

/**
 * Figures the budget plan cannot supply yet — they need balances and history
 * rather than a forward-looking plan. These stay sample data until the backend
 * release gives them somewhere real to come from.
 */
const savingsGoal = 108_000;
const totalSaved = 82_400;
const sampleMonthlyGoal = 7_200;

const supportingStats = [
    { label: 'Average monthly save', value: 6_880 },
    { label: 'Emergency buffer', value: 18_200 },
];

const monthlySavings = [
    { month: 'Nov', amount: 5_200 },
    { month: 'Dec', amount: 6_100 },
    { month: 'Jan', amount: 6_450 },
    { month: 'Feb', amount: 5_980 },
    { month: 'Mar', amount: 6_120 },
];

const outstandingDebt = -16_780;

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

const savingsGroupId = 'savings';

type DerivedFigures = {
    monthlyGoal: number;
    monthlyExpenses: number;
    projectedCashflow: number;
    categories: { name: string; amount: number; color: string }[];
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
 * Reads the saved budget plan where it can, and falls back to the sample
 * figures so a first visit never renders an empty dashboard.
 */
const deriveFigures = (plan: BudgetPlan | null): DerivedFigures => {
    if (!plan || !isPlanPopulated(plan)) {
        return {
            monthlyGoal: sampleMonthlyGoal,
            monthlyExpenses: -4_125,
            projectedCashflow: 1_320,
            categories: withColors(sampleCategories),
        };
    }

    const { allocated, unallocated } = planTotals(plan);
    const savingsGroup = plan.groups.find(
        (group) => group.id === savingsGroupId,
    );
    const plannedSavings = savingsGroup ? groupTotal(savingsGroup) : 0;

    return {
        monthlyGoal: plannedSavings > 0 ? plannedSavings : sampleMonthlyGoal,
        monthlyExpenses: -(allocated - plannedSavings),
        projectedCashflow: unallocated,
        categories: withColors(
            plan.groups
                .map((group) => ({
                    name: group.name,
                    amount: groupTotal(group),
                }))
                .filter((group) => group.amount > 0),
        ),
    };
};

export default function Dashboard() {
    const plan = useStoredBudgetPlan();
    const hasPlan = plan !== null && isPlanPopulated(plan);
    const { monthlyGoal, monthlyExpenses, projectedCashflow, categories } =
        deriveFigures(plan);

    const fundedRatio = totalSaved / savingsGoal;
    const categoryTotal = categories.reduce(
        (sum, item) => sum + item.amount,
        0,
    );

    const metrics = [
        {
            label: 'Monthly expenses',
            value: monthlyExpenses,
            note: hasPlan ? 'Planned outgoing' : 'Outgoing this month',
        },
        {
            label: 'Outstanding debt',
            value: outstandingDebt,
            note: 'Remaining balance',
        },
        {
            label: 'Projected cashflow',
            value: projectedCashflow,
            note: hasPlan ? 'Unallocated this month' : 'Next 30 days',
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
                    <p className="text-sm text-muted-foreground">March 2026</p>
                </header>

                {!hasPlan && (
                    <Card>
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                            <p className="text-sm text-muted-foreground">
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
                            <p className="text-sm text-muted-foreground">
                                Total saved
                            </p>
                            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
                                {formatPeso(totalSaved)}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground tabular-nums">
                                {Math.round(fundedRatio * 100)}% of your{' '}
                                {formatPeso(savingsGoal)} goal
                            </p>

                            <div
                                role="progressbar"
                                aria-valuenow={Math.round(fundedRatio * 100)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Savings goal progress"
                                className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted lg:w-80"
                            >
                                <div
                                    className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 motion-reduce:transition-none dark:bg-emerald-400"
                                    style={{ width: `${fundedRatio * 100}%` }}
                                />
                            </div>
                        </div>

                        <dl className="flex shrink-0 gap-8">
                            {supportingStats.map((stat) => (
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

                <dl className="grid gap-4 sm:grid-cols-3">
                    {metrics.map((metric) => (
                        <Card key={metric.label}>
                            <CardContent className="p-5">
                                <dt className="text-sm text-muted-foreground">
                                    {metric.label}
                                </dt>
                                <dd
                                    className={`mt-1 text-2xl font-semibold tabular-nums ${
                                        metric.value > 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-foreground'
                                    }`}
                                >
                                    {metric.value > 0
                                        ? formatSigned(metric.value)
                                        : formatPeso(metric.value)}
                                </dd>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {metric.note}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </dl>

                <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-4">
                            <CardTitle className="text-base">
                                Monthly savings
                            </CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={dashboardRoutes.months()}>
                                    View all months
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <SavingsChart
                                data={monthlySavings}
                                goal={monthlyGoal}
                                formatAmount={formatPeso}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-4">
                            <CardTitle className="text-base">
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
                        <CardTitle className="text-base">
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
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                        {item.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.when}
                                    </p>
                                </div>
                                <p
                                    className={`shrink-0 text-sm font-medium tabular-nums ${
                                        item.amount > 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
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
