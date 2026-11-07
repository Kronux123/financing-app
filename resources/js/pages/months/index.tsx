import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { SavingsCalendar } from '@/components/dashboard/savings-calendar';
import type { SpriteName } from '@/components/pixel-art';
import { PixelArt, SpriteTile } from '@/components/pixel-art';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Walkthrough, WalkthroughButton } from '@/components/walkthrough';
import { useStoredBudgetPlan } from '@/hooks/use-budget-plan';
import { useSavingsHistory } from '@/hooks/use-savings';
import { useWalkthrough } from '@/hooks/use-walkthrough';
import { savingsPerMonth } from '@/lib/budget';
import { formatPeso } from '@/lib/currency';
import { monthsForYear, summariseYear, yearsIn } from '@/lib/savings';
import { cn } from '@/lib/utils';
import { walkthroughs, walkthroughTarget } from '@/lib/walkthroughs';
import { dashboard } from '@/routes';
import {
    pdf as monthPdf,
    sheet as monthSheet,
} from '@/routes/dashboard/months';
import { sheet as yearSheet } from '@/routes/dashboard/years';
import { index as payoutsRoute } from '@/routes/payouts';

type SummaryTile = {
    label: string;
    value: string;
    note: string;
    art: SpriteName;
};

type YearTrackProps = {
    year: number;
    total: number;
    goal: number;
    recorded: number;
};

/**
 * The year against its goal: twelve months of the monthly goal as the whole
 * bar, what has been saved as the fill, and a marker where the recorded months
 * should have brought you.
 *
 * The marker counts recorded months only. A month nobody settled is unknown,
 * not a month of saving nothing (see lib/savings.ts), so holding it against the
 * pace would report a shortfall that may not exist.
 */
function YearTrack({ year, total, goal, recorded }: YearTrackProps) {
    const yearGoal = goal * 12;
    const pace = goal * recorded;
    const filled = Math.min(Math.max(total / yearGoal, 0), 1) * 100;
    const marker = Math.min(pace / yearGoal, 1) * 100;
    const ahead = total - pace;

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground tabular-nums">
                        {Math.round((total / yearGoal) * 100)}%
                    </span>{' '}
                    of the {formatPeso(yearGoal)} goal for {year}
                </p>
                <p data-test="calendar-pace" className="tabular-nums">
                    {ahead >= 0 ? (
                        <>
                            <span className="font-semibold">
                                {formatPeso(ahead)}
                            </span>{' '}
                            <span className="text-muted-foreground">
                                ahead of pace
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="font-semibold">
                                {formatPeso(ahead)}
                            </span>{' '}
                            <span className="text-muted-foreground">
                                behind pace
                            </span>
                        </>
                    )}
                </p>
            </div>

            <div
                role="progressbar"
                aria-valuenow={Math.round(filled)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${formatPeso(total)} saved of a ${formatPeso(yearGoal)} goal for ${year}. ${ahead >= 0 ? `${formatPeso(ahead)} ahead of` : `${formatPeso(ahead)} behind`} the pace for ${recorded} recorded ${recorded === 1 ? 'month' : 'months'}.`}
                className="relative h-3 rounded-full bg-foreground/10"
            >
                <div
                    className={cn(
                        'h-full goal-bar rounded-full bg-linear-to-r',
                        ahead >= 0
                            ? 'from-goal-met/60 to-goal-met'
                            : 'from-goal-close/60 to-goal-close',
                    )}
                    style={{ width: `${filled}%` }}
                />
                {/* Where the recorded months should have got you. */}
                <span
                    aria-hidden
                    className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-foreground"
                    style={{ left: `${marker}%` }}
                />
            </div>

            <p className="text-xs text-muted-foreground">
                The marker is the pace for the {recorded} recorded{' '}
                {recorded === 1 ? 'month' : 'months'}: {formatPeso(goal)} each.
            </p>
        </div>
    );
}

export default function DashboardMonths() {
    const walkthrough = useWalkthrough('months');
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

    /**
     * Each with the sprite the app already uses for the idea: the star for a
     * best, the rainy-day umbrella for the leanest month, the chart for the
     * average, the piggy bank for months that hit the goal.
     */
    const summary: SummaryTile[] = [
        {
            label: 'Best month',
            value: best ? formatPeso(best.amount) : '—',
            note: best ? best.label : 'Nothing settled yet',
            art: 'star',
        },
        {
            label: 'Lowest month',
            value: worst ? formatPeso(worst.amount) : '—',
            note: worst ? worst.label : 'Nothing settled yet',
            art: 'umbrella',
        },
        {
            label: 'Monthly average',
            value: recorded > 0 ? formatPeso(Math.round(average)) : '—',
            note:
                goal > 0 && recorded > 0
                    ? `${Math.round((average / goal) * 100)}% of the ${formatPeso(goal)} goal`
                    : 'No goal set on the plan',
            art: 'chart',
        },
        {
            label: 'Months at goal',
            value: `${goalsMet} of ${recorded}`,
            note: 'Hit the full monthly target',
            art: 'piggy-bank',
        },
    ];

    return (
        <>
            <Head title="Savings calendar" />

            <div className="flex w-full flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <SpriteTile sprite="calendar" />
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
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <WalkthroughButton onClick={walkthrough.start} />
                        <Button asChild variant="outline" size="sm">
                            <Link href={dashboard()}>Back to dashboard</Link>
                        </Button>
                    </div>
                </header>

                {history.length === 0 ? (
                    <Card>
                        <CardContent>
                            <EmptyPanel
                                data-test="calendar-empty"
                                art="calendar"
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
                    <>
                        {/*
                         * The year at a glance, before the months that make it
                         * up: its total, where it stands against the goal, and
                         * the four figures worth knowing about it.
                         */}
                        <Card className="gap-0 py-0">
                            <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-10">
                                <div
                                    className="flex flex-col gap-5"
                                    {...walkthroughTarget('calendar-year')}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="-ml-2 flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Show ${year - 1}`}
                                                disabled={year <= earliestYear}
                                                onClick={() =>
                                                    setYear(year - 1)
                                                }
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
                                                onClick={() =>
                                                    setYear(year + 1)
                                                }
                                            >
                                                <ChevronRight />
                                            </Button>
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

                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            Saved in {year}
                                        </p>
                                        <p
                                            data-test="calendar-total"
                                            className="mt-1 text-4xl font-semibold tracking-tight tabular-nums"
                                        >
                                            {formatPeso(total)}
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            across {recorded} settled{' '}
                                            {recorded === 1
                                                ? 'month'
                                                : 'months'}
                                        </p>
                                    </div>

                                    {goal > 0 && (
                                        <YearTrack
                                            year={year}
                                            total={total}
                                            goal={goal}
                                            recorded={recorded}
                                        />
                                    )}
                                </div>

                                {/*
                                 * Each tile owns its own <dl>. One list
                                 * wrapping the tiles put two divs between the
                                 * list and its terms, which is not a shape a
                                 * description list may take.
                                 */}
                                <div
                                    className="grid grid-cols-2 gap-3 self-center"
                                    {...walkthroughTarget('calendar-summary')}
                                >
                                    {summary.map((item) => (
                                        <div
                                            key={item.label}
                                            className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4"
                                        >
                                            <PixelArt
                                                sprite={item.art}
                                                size={32}
                                                className="mt-0.5"
                                            />
                                            <div className="min-w-0">
                                                <dl>
                                                    <dt className="text-xs text-muted-foreground">
                                                        {item.label}
                                                    </dt>
                                                    <dd className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums">
                                                        {item.value}
                                                    </dd>
                                                </dl>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {item.note}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card {...walkthroughTarget('calendar-months')}>
                            <CardContent>
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
                                        sheet: monthSheet.url(
                                            monthParam(index),
                                        ),
                                        pdf: monthPdf.url(monthParam(index)),
                                    })}
                                />
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {walkthrough.isOpen && (
                <Walkthrough
                    steps={walkthroughs.months}
                    isSample={walkthrough.isSample}
                    onFinish={walkthrough.finish}
                />
            )}
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
