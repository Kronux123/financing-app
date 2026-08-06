import { Head, Link } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { SavingsChart } from '@/components/dashboard/savings-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { dashboard } from '@/routes';
import dashboardRoutes from '@/routes/dashboard';

const savingsGoal = 108_000;
const totalSaved = 82_400;
const monthlyGoal = 7_200;

const supportingStats = [
    { label: 'Average monthly save', value: 6_880 },
    { label: 'Emergency buffer', value: 18_200 },
];

const metrics = [
    { label: 'Monthly expenses', value: -4_125, note: 'Outgoing this month' },
    { label: 'Outstanding debt', value: -16_780, note: 'Remaining balance' },
    { label: 'Projected cashflow', value: 1_320, note: 'Next 30 days' },
];

const monthlySavings = [
    { month: 'Nov', amount: 5_200 },
    { month: 'Dec', amount: 6_100 },
    { month: 'Jan', amount: 6_450 },
    { month: 'Feb', amount: 5_980 },
    { month: 'Mar', amount: 6_120 },
];

const spendingCategories = [
    { name: 'Housing', amount: 1_450, color: 'bg-cyan-500' },
    { name: 'Utilities', amount: 630, color: 'bg-violet-500' },
    { name: 'Groceries', amount: 540, color: 'bg-amber-500' },
    { name: 'Transport', amount: 305, color: 'bg-sky-500' },
];

const categoryColors = [
    'bg-cyan-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-sky-500',
    'bg-fuchsia-500',
    'bg-teal-500',
];

const recentActivity = [
    { title: 'Mortgage payment', amount: -1_250, when: 'Today' },
    { title: 'Spotify subscription', amount: -15, when: 'Yesterday' },
    { title: 'Salary deposit', amount: 5_800, when: '2 days ago' },
    { title: 'Credit card payment', amount: -420, when: '4 days ago' },
];

const formatPeso = (value: number) => {
    return `₱${Math.abs(value).toLocaleString('en-US')}`;
};

const formatSigned = (value: number) => {
    return `${value < 0 ? '-' : '+'}${formatPeso(value)}`;
};

export default function Dashboard() {
    const [categoryList, setCategoryList] = useState(spendingCategories);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [showCreateCategory, setShowCreateCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryAmount, setNewCategoryAmount] = useState('');

    const fundedRatio = totalSaved / savingsGoal;
    const categoryTotal = categoryList.reduce(
        (sum, item) => sum + item.amount,
        0,
    );

    const handleDrawerOpenChange = (open: boolean) => {
        setDrawerOpen(open);

        if (!open) {
            setShowCreateCategory(false);
            setNewCategoryName('');
            setNewCategoryAmount('');
        }
    };

    const handleAddCategory = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!newCategoryName.trim()) {
            return;
        }

        setCategoryList([
            ...categoryList,
            {
                name: newCategoryName.trim(),
                amount: Number(newCategoryAmount.replace(/[^0-9.]/g, '')) || 0,
                color: categoryColors[
                    categoryList.length % categoryColors.length
                ],
            },
        ]);

        setShowCreateCategory(false);
        setNewCategoryName('');
        setNewCategoryAmount('');
    };

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
                                Spending categories
                            </CardTitle>
                            <Sheet
                                open={drawerOpen}
                                onOpenChange={handleDrawerOpenChange}
                            >
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        Manage
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="flex flex-col gap-0">
                                    <SheetHeader>
                                        <SheetTitle>
                                            Spending categories
                                        </SheetTitle>
                                        <SheetDescription>
                                            Add a category or review what you
                                            already track.
                                        </SheetDescription>
                                    </SheetHeader>

                                    <div className="flex-1 divide-y divide-border overflow-y-auto px-4">
                                        {categoryList.map((item) => (
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
                                                <span className="text-sm font-medium tabular-nums">
                                                    {formatPeso(item.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <SheetFooter>
                                        {showCreateCategory ? (
                                            <form
                                                onSubmit={handleAddCategory}
                                                className="space-y-3"
                                            >
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="category-name">
                                                        Name
                                                    </Label>
                                                    <Input
                                                        id="category-name"
                                                        value={newCategoryName}
                                                        onChange={(event) =>
                                                            setNewCategoryName(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Dining out"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="category-amount">
                                                        Monthly amount
                                                    </Label>
                                                    <Input
                                                        id="category-amount"
                                                        value={
                                                            newCategoryAmount
                                                        }
                                                        onChange={(event) =>
                                                            setNewCategoryAmount(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="450"
                                                        inputMode="decimal"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button type="submit">
                                                        Add category
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            setShowCreateCategory(
                                                                false,
                                                            )
                                                        }
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </form>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                onClick={() =>
                                                    setShowCreateCategory(true)
                                                }
                                            >
                                                Add category
                                            </Button>
                                        )}
                                    </SheetFooter>
                                </SheetContent>
                            </Sheet>
                        </CardHeader>
                        <CardContent className="divide-y divide-border pt-0">
                            {categoryList.slice(0, 4).map((item) => {
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
