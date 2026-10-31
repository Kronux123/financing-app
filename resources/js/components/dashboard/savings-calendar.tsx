import {
    FileSpreadsheet,
    FileText,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const monthLabels = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

/** Spelled out for the download labels, where `Jul` reads as an abbreviation. */
const monthNames = [
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

type Tier = {
    label: string;
    range: string;
    /** Solid fill: the legend key, the card's dot, and the goal bar. */
    mark: string;
    /** Corner wash behind the figures — the tint that grades the card. */
    wash: string;
    /** Hairline in the tier's own hue, so the grade outlines the card too. */
    edge: string;
    /** Lift shadow on hover, tinted to match the wash. */
    glow: string;
};

/**
 * Three hues rather than three steps of one, so the tiers survive both
 * colour-blind vision and a quick glance. See `--goal-*` in `app.css` for the
 * validated steps behind each token.
 *
 * Every tier spells its classes out in full. Tailwind reads this file as text,
 * so a name assembled from `bg-goal-${key}` would never reach the stylesheet.
 */
const tiers: Tier[] = [
    {
        label: 'Behind',
        range: 'under 70%',
        mark: 'bg-goal-behind',
        wash: 'from-goal-behind/15',
        edge: 'border-goal-behind/30',
        glow: 'hover:shadow-goal-behind/25',
    },
    {
        label: 'Close',
        range: '70–99%',
        mark: 'bg-goal-close',
        wash: 'from-goal-close/15',
        edge: 'border-goal-close/30',
        glow: 'hover:shadow-goal-close/25',
    },
    {
        label: 'Goal met',
        range: '100%+',
        mark: 'bg-goal-met',
        wash: 'from-goal-met/18',
        edge: 'border-goal-met/35',
        glow: 'hover:shadow-goal-met/25',
    },
];

const tierFor = (share: number): Tier => {
    if (share >= 1) {
        return tiers[2];
    }

    if (share >= 0.7) {
        return tiers[1];
    }

    return tiers[0];
};

type MonthExports = {
    sheet: string;
    pdf: string;
};

type ExportLinkProps = {
    href: string;
    /** Both the tooltip and the accessible name, so the two cannot drift. */
    label: string;
    testId: string;
    icon: LucideIcon;
};

/**
 * One download control.
 *
 * An icon on its own says very little, so the label is the whole explanation:
 * shown on hover and focus, and read out as the accessible name. `cursor-pointer`
 * is spelled out because these are buttons in every way but the tag, and a
 * pointer is what tells you the icon is not decoration.
 */
function ExportLink({ href, label, testId, icon: Icon }: ExportLinkProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="size-7 cursor-pointer text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                >
                    {/*
                     * A plain anchor, not an Inertia link: a download is the
                     * browser's job, and a visit would ask the page to render a
                     * csv as a component.
                     */}
                    <a href={href} data-test={testId} aria-label={label}>
                        <Icon className="size-3.5" />
                    </a>
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

/**
 * The month name, and the badge that marks the month in progress.
 *
 * "Now" is written out rather than left to the ring around the card: a ring is
 * colour alone, which is nothing at all to a screen reader and very little at a
 * glance on a page already carrying three tinted states.
 */
function MonthHeading({
    label,
    isCurrent,
    dot,
}: {
    label: string;
    isCurrent: boolean;
    dot?: string;
}) {
    return (
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
            {dot && (
                <span
                    aria-hidden
                    className={cn('size-2 shrink-0 rounded-full', dot)}
                />
            )}
            {label}
            {isCurrent && (
                <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-medium tracking-normal text-primary-foreground normal-case">
                    Now
                </span>
            )}
        </p>
    );
}

type SavingsCalendarProps = {
    /** Twelve entries, January first. `null` means no data recorded yet. */
    months: (number | null)[];
    goal: number;
    formatAmount: (value: number) => string;
    /** Zero-based month index to mark as the month in progress. */
    currentMonth?: number;
    /**
     * Where a month's breakdown can be downloaded from, by zero-based index.
     * Only recorded months are asked for — a month with no settled payday has
     * nothing to write into a file.
     */
    exportsFor?: (monthIndex: number) => MonthExports;
};

export function SavingsCalendar({
    months,
    goal,
    formatAmount,
    currentMonth,
    exportsFor,
}: SavingsCalendarProps) {
    /**
     * Without a goal there is nothing to grade against, so the cards drop the
     * tint, the percentage and the bar rather than reporting every month as 0%
     * of nothing and shading the whole year as "behind".
     */
    const hasGoal = goal > 0;

    return (
        <div className="space-y-5">
            <ul
                aria-hidden
                className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
            >
                {tiers.map((tier) => (
                    <li
                        key={tier.label}
                        className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1"
                    >
                        <span
                            className={cn('size-2 rounded-full', tier.mark)}
                        />
                        <span className="font-medium text-foreground">
                            {tier.label}
                        </span>
                        {/*
                         * Full muted-foreground, not a fraction of it. At 12px
                         * the /70 step came out at 2.71:1 on the card and 4.17:1
                         * in dark — both under the floor.
                         */}
                        <span className="text-muted-foreground">
                            {tier.range}
                        </span>
                    </li>
                ))}
                <li className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1">
                    <span className="size-2 rounded-full border border-dashed border-border" />
                    No data
                </li>
            </ul>

            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {months.map((amount, index) => {
                    const label = monthLabels[index];
                    const isCurrent = index === currentMonth;

                    if (amount === null) {
                        return (
                            <li
                                key={`${label}-empty`}
                                className={cn(
                                    'flex flex-col rounded-xl border border-dashed border-border bg-muted/30 p-4',
                                    isCurrent && 'ring-2 ring-ring/40',
                                )}
                            >
                                <div className="text-muted-foreground">
                                    <MonthHeading
                                        label={label}
                                        isCurrent={isCurrent}
                                    />
                                </div>
                                <p className="mt-3 text-sm text-muted-foreground">
                                    No data
                                </p>
                                <div className="mt-auto pt-6">
                                    <div className="h-1.5 rounded-full border border-dashed border-border" />
                                </div>
                            </li>
                        );
                    }

                    const share = hasGoal ? amount / goal : 0;
                    const tier = tierFor(share);
                    const delta = amount - goal;
                    const percent = Math.round(share * 100);

                    return (
                        /*
                         * Keyed on the figure as well as the month so stepping
                         * to another year remounts the cards, and the goal bars
                         * draw themselves in again rather than sitting there
                         * already full.
                         */
                        <li
                            key={`${label}-${amount}`}
                            className={cn(
                                'group relative isolate flex flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg',
                                hasGoal
                                    ? [tier.edge, tier.glow]
                                    : 'border-border/70',
                                isCurrent && 'ring-2 ring-ring/40',
                            )}
                        >
                            {hasGoal && (
                                <>
                                    {/* The grade, as light falling across the card. */}
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'pointer-events-none absolute inset-0 -z-10 bg-linear-to-br via-transparent to-transparent',
                                            tier.wash,
                                        )}
                                    />
                                    {/*
                                     * A lit top edge, the same trick that gives
                                     * `glass-panel` its thickness.
                                     */}
                                    <span
                                        aria-hidden
                                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-foreground/20 to-transparent"
                                    />
                                </>
                            )}

                            <div className="flex items-center justify-between gap-2">
                                <MonthHeading
                                    label={label}
                                    isCurrent={isCurrent}
                                    dot={hasGoal ? tier.mark : undefined}
                                />
                                {hasGoal && (
                                    /*
                                     * The cell carries a goal tint, and
                                     * muted-foreground on it lands at 4.25:1. The
                                     * payouts page settled on foreground/70 over the
                                     * same tints, and this pill sits on its own
                                     * background step, so it takes the full token.
                                     */
                                    <span className="shrink-0 rounded-full border border-foreground/10 bg-background/70 px-2 py-0.5 text-xs font-semibold tabular-nums">
                                        {percent}%
                                    </span>
                                )}
                            </div>

                            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                                {formatAmount(amount)}
                            </p>

                            {hasGoal ? (
                                <p className="mt-1 flex items-center gap-1 text-xs text-foreground/70 tabular-nums">
                                    {delta >= 0 ? (
                                        <TrendingUp
                                            aria-hidden
                                            className="size-3.5 shrink-0"
                                        />
                                    ) : (
                                        <TrendingDown
                                            aria-hidden
                                            className="size-3.5 shrink-0"
                                        />
                                    )}
                                    {formatAmount(delta)}
                                    <span className="font-normal">
                                        {delta === 0
                                            ? 'on goal'
                                            : delta > 0
                                              ? 'over goal'
                                              : 'under goal'}
                                    </span>
                                </p>
                            ) : (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    No goal set
                                </p>
                            )}

                            {hasGoal && (
                                <div
                                    role="progressbar"
                                    aria-valuenow={percent}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`${label}: ${formatAmount(amount)}, ${percent} percent of the ${formatAmount(goal)} monthly goal — ${tier.label}`}
                                    className="mt-4 h-2 overflow-hidden rounded-full bg-foreground/10"
                                >
                                    <div
                                        className={cn(
                                            'h-full goal-bar rounded-full',
                                            tier.mark,
                                        )}
                                        style={{
                                            width: `${Math.min(share, 1) * 100}%`,
                                        }}
                                    />
                                </div>
                            )}

                            {exportsFor && (
                                <div className="mt-auto flex items-center gap-1 border-t border-foreground/10 pt-3">
                                    <ExportLink
                                        href={exportsFor(index).sheet}
                                        label={`Download ${monthNames[index]} spreadsheet`}
                                        testId={`export-sheet-${index + 1}`}
                                        icon={FileSpreadsheet}
                                    />
                                    <ExportLink
                                        href={exportsFor(index).pdf}
                                        label={`Download ${monthNames[index]} PDF`}
                                        testId={`export-pdf-${index + 1}`}
                                        icon={FileText}
                                    />
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
