import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { SavingsCalendar } from '@/components/dashboard/savings-calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { dashboard } from '@/routes';

const monthlyGoal = 7_200;

const currentYear = 2026;
const currentMonth = 2;

const monthLabels = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const savingsByYear: Record<number, (number | null)[]> = {
    2026: [6_450, 5_980, 6_120, ...Array<null>(9).fill(null)],
    2025: [
        5_890, 5_720, 6_050, 6_250, 5_980, 6_140, 6_380, 5_860, 7_350, 6_020,
        5_200, 6_100,
    ],
    2024: [
        4_820, 5_010, 4_760, 5_240, 5_130, 5_480, 5_320, 5_610, 5_490, 5_750,
        5_880, 6_300,
    ],
};

const years = Object.keys(savingsByYear)
    .map(Number)
    .sort((a, b) => a - b);

const earliestYear = years[0];
const latestYear = years[years.length - 1];

const formatPeso = (value: number) => {
    return `₱${Math.abs(value).toLocaleString('en-US')}`;
};

export default function DashboardMonths() {
    const [year, setYear] = useState(currentYear);

    const months = savingsByYear[year];
    const recorded = months
        .map((amount, index) => ({ amount, index }))
        .filter(
            (entry): entry is { amount: number; index: number } =>
                entry.amount !== null,
        );

    const total = recorded.reduce((sum, entry) => sum + entry.amount, 0);
    const average = recorded.length > 0 ? total / recorded.length : 0;
    const best = recorded.reduce(
        (a, b) => (b.amount > a.amount ? b : a),
        recorded[0],
    );
    const worst = recorded.reduce(
        (a, b) => (b.amount < a.amount ? b : a),
        recorded[0],
    );
    const goalsMet = recorded.filter(
        (entry) => entry.amount >= monthlyGoal,
    ).length;
    const averageShare = monthlyGoal > 0 ? average / monthlyGoal : 0;

    const summary = [
        {
            label: 'Best month',
            value: formatPeso(best.amount),
            note: monthLabels[best.index],
        },
        {
            label: 'Lowest month',
            value: formatPeso(worst.amount),
            note: monthLabels[worst.index],
        },
        {
            label: 'Monthly average',
            value: formatPeso(Math.round(average)),
            note: `${Math.round(averageShare * 100)}% of the ${formatPeso(monthlyGoal)} goal`,
        },
        {
            label: 'Months at goal',
            value: `${goalsMet} of ${recorded.length}`,
            note: 'Hit the full monthly target',
        },
    ];

    return (
        <>
            <Head title="Savings calendar" />

            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Savings calendar
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            Every month of the year side by side, shaded by how
                            close it came to the {formatPeso(monthlyGoal)}{' '}
                            monthly goal.
                        </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href={dashboard()}>Back to dashboard</Link>
                    </Button>
                </header>

                <Card>
                    <CardHeader className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Show ${year - 1}`}
                                disabled={year <= earliestYear}
                                onClick={() => setYear(year - 1)}
                            >
                                <ChevronLeft />
                            </Button>
                            <p
                                aria-live="polite"
                                className="min-w-16 text-center text-lg font-semibold tabular-nums"
                            >
                                {year}
                            </p>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Show ${year + 1}`}
                                disabled={year >= latestYear}
                                onClick={() => setYear(year + 1)}
                            >
                                <ChevronRight />
                            </Button>
                        </div>

                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                                Saved in {year}
                            </p>
                            <p className="text-xl font-semibold tabular-nums">
                                {formatPeso(total)}
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                    across {recorded.length}{' '}
                                    {recorded.length === 1 ? 'month' : 'months'}
                                </span>
                            </p>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                        <SavingsCalendar
                            months={months}
                            goal={monthlyGoal}
                            formatAmount={formatPeso}
                            currentMonth={
                                year === currentYear ? currentMonth : undefined
                            }
                        />
                    </CardContent>
                </Card>

                <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {summary.map((item) => (
                        <Card key={item.label}>
                            <CardContent className="p-5">
                                <dt className="text-sm text-muted-foreground">
                                    {item.label}
                                </dt>
                                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                                    {item.value}
                                </dd>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {item.note}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </dl>
            </div>
        </>
    );
}

DashboardMonths.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Savings calendar',
        },
    ],
};
