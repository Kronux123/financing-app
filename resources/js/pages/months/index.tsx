import { Head, Link } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { SavingsCalendar } from '@/components/dashboard/savings-calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useStoredBudgetPlan } from '@/hooks/use-budget-plan';
import { useSavingsHistory } from '@/hooks/use-savings';
import { savingsPerMonth } from '@/lib/budget';
import { formatPeso } from '@/lib/currency';
import { monthsForYear, summariseYear, yearsIn } from '@/lib/savings';
import { dashboard } from '@/routes';
import {
    pdf as monthPdf,
    sheet as monthSheet,
} from '@/routes/dashboard/months';
import { sheet as yearSheet } from '@/routes/dashboard/years';
import { index as payoutsRoute } from '@/routes/payouts';

export default function DashboardMonths() {
    const history = useSavingsHistory();
    const plan = useStoredBudgetPlan();

    /**
     * The goal is what the plan intends to save each month, swept remainder
     * included — the same figure the months are measured against on the
     * dashboard. Zero without a plan, which the calendar reads as "no goal" and
     * shades nothing against.
     */
    const goal = plan ? savingsPerMonth(plan) : 0;

    const today = new Date();
    const years = yearsIn(history);
    /**
     * Opens on the most recent year that has anything in it. A year with no
     * finalized payday is not offered, so the arrows only ever walk between
     * years that hold something.
     */
    const latestYear = years[years.length - 1] ?? today.getFullYear();
    const earliestYear = years[0] ?? today.getFullYear();
    const [year, setYear] = useState(latestYear);

    const months = monthsForYear(history, year);
    const { recorded, total, average, best, worst, goalsMet } = summariseYear(
        months,
        goal,
    );

    /**
     * `2026-07`, which is what both download routes bind on. Built here rather
     * than in the calendar, because the calendar counts months from zero and
     * knows nothing about which year it is drawing.
     */
    const monthParam = (index: number): string =>
        `${year}-${String(index + 1).padStart(2, '0')}`;

    const summary = [
        {
            label: 'Best month',
            value: best ? formatPeso(best.amount) : '—',
            note: best ? best.label : 'Nothing settled yet',
        },
        {
            label: 'Lowest month',
            value: worst ? formatPeso(worst.amount) : '—',
            note: worst ? worst.label : 'Nothing settled yet',
        },
        {
            label: 'Monthly average',
            value: recorded > 0 ? formatPeso(Math.round(average)) : '—',
            note:
                goal > 0 && recorded > 0
                    ? `${Math.round((average / goal) * 100)}% of the ${formatPeso(goal)} goal`
                    : 'No goal set on the plan',
        },
        {
            label: 'Months at goal',
            value: `${goalsMet} of ${recorded}`,
            note: 'Hit the full monthly target',
        },
    ];

    return (
        <>
            <Head title="Savings calendar" />

            <div className="flex w-full flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Savings calendar
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            {goal > 0
                                ? `Every month of the year side by side, shaded by how close it came to the ${formatPeso(goal)} monthly goal.`
                                : 'Every month of the year side by side. Set a savings figure on your plan to shade them against a goal.'}
                        </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href={dashboard()}>Back to dashboard</Link>
                    </Button>
                </header>

                {history.length === 0 ? (
                    <Card>
                        <CardContent>
                            <EmptyPanel
                                data-test="calendar-empty"
                                icon={CalendarDays}
                                title="No month has been settled yet"
                                action={{
                                    label: 'Go to paydays',
                                    href: payoutsRoute(),
                                }}
                            >
                                Finalize a payday and the month it belongs to
                                fills in here.
                            </EmptyPanel>
                        </CardContent>
                    </Card>
                ) : (
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
                                    data-test="calendar-year"
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

                            <div className="flex flex-wrap items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">
                                        Saved in {year}
                                    </p>
                                    <p
                                        data-test="calendar-total"
                                        className="text-xl font-semibold tabular-nums"
                                    >
                                        {formatPeso(total)}
                                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                                            across {recorded}{' '}
                                            {recorded === 1
                                                ? 'month'
                                                : 'months'}
                                        </span>
                                    </p>
                                </div>

                                {/* Every settled month of the year in one sheet. */}
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer"
                                >
                                    <a
                                        href={yearSheet.url(year)}
                                        data-test="export-year-sheet"
                                    >
                                        <FileSpreadsheet />
                                        Export {year}
                                    </a>
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                            <SavingsCalendar
                                months={months}
                                goal={goal}
                                formatAmount={formatPeso}
                                currentMonth={
                                    year === today.getFullYear()
                                        ? today.getMonth()
                                        : undefined
                                }
                                exportsFor={(index) => ({
                                    sheet: monthSheet.url(monthParam(index)),
                                    pdf: monthPdf.url(monthParam(index)),
                                })}
                            />
                        </CardContent>
                    </Card>
                )}

                {/*
                 * Each tile owns its own <dl>, as on the dashboard. One list
                 * wrapping the cards put two divs between the list and its
                 * terms, which is not a shape a description list may take.
                 */}
                {history.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {summary.map((item) => (
                            <Card key={item.label}>
                                <CardContent className="p-5">
                                    <dl>
                                        <dt className="text-sm text-muted-foreground">
                                            {item.label}
                                        </dt>
                                        <dd className="mt-1 text-2xl font-semibold tabular-nums">
                                            {item.value}
                                        </dd>
                                    </dl>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {item.note}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
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
