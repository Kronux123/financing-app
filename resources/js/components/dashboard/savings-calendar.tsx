import { FileSpreadsheet, FileText } from 'lucide-react';
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
    cell: string;
    mark: string;
};

/**
 * Three hues rather than three steps of one, so the tiers survive both
 * colour-blind vision and a quick glance. See `--goal-*` in `app.css` for the
 * validated steps behind each token.
 */
const tiers: Tier[] = [
    {
        label: 'Behind',
        range: 'under 70%',
        cell: 'bg-goal-behind/10',
        mark: 'bg-goal-behind',
    },
    {
        label: 'Close',
        range: '70–99%',
        cell: 'bg-goal-close/10',
        mark: 'bg-goal-close',
    },
    {
        label: 'Goal met',
        range: '100%+',
        cell: 'bg-goal-met/10',
        mark: 'bg-goal-met',
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
                    className="size-7 cursor-pointer"
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
    return (
        <div className="space-y-4">
            <ul
                aria-hidden
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground"
            >
                {tiers.map((tier) => (
                    <li key={tier.label} className="flex items-center gap-1.5">
                        <span
                            className={cn('size-2.5 rounded-full', tier.mark)}
                        />
                        {tier.label}
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
                <li className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full border border-dashed border-border" />
                    No data
                </li>
            </ul>

            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {months.map((amount, index) => {
                    const label = monthLabels[index];
                    const isCurrent = index === currentMonth;

                    if (amount === null) {
                        return (
                            <li
                                key={label}
                                className={cn(
                                    'rounded-lg border border-dashed border-border p-3',
                                    isCurrent && 'ring-2 ring-ring/40',
                                )}
                            >
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    {label}
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    No data
                                </p>
                                <div className="mt-4 h-1.5 rounded-full bg-muted" />
                            </li>
                        );
                    }

                    const share = goal > 0 ? amount / goal : 0;
                    const tier = tierFor(share);
                    const delta = amount - goal;

                    return (
                        <li
                            key={label}
                            className={cn(
                                'rounded-lg border border-border/60 p-3',
                                tier.cell,
                                isCurrent && 'ring-2 ring-ring/40',
                            )}
                        >
                            <div className="flex items-baseline justify-between gap-2">
                                <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'size-2 shrink-0 rounded-full',
                                            tier.mark,
                                        )}
                                    />
                                    {label}
                                </p>
                                {/*
                                 * The cell carries a goal tint, and
                                 * muted-foreground on it lands at 4.25:1. The
                                 * payouts page settled on foreground/70 over the
                                 * same tints.
                                 */}
                                <p className="text-xs text-foreground/70 tabular-nums">
                                    {Math.round(share * 100)}%
                                </p>
                            </div>

                            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
                                {formatAmount(amount)}
                            </p>

                            <p className="mt-0.5 text-xs text-foreground/70 tabular-nums">
                                {delta >= 0 ? '+' : '−'}
                                {formatAmount(delta)} vs goal
                            </p>

                            <div
                                role="progressbar"
                                aria-valuenow={Math.round(share * 100)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${label}: ${formatAmount(amount)}, ${Math.round(share * 100)} percent of the ${formatAmount(goal)} monthly goal — ${tier.label}`}
                                className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10"
                            >
                                <div
                                    className={cn(
                                        'h-full rounded-full',
                                        tier.mark,
                                    )}
                                    style={{
                                        width: `${Math.min(share, 1) * 100}%`,
                                    }}
                                />
                            </div>

                            {exportsFor && (
                                <div className="mt-2.5 flex items-center gap-1">
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
