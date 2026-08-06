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

type SavingsCalendarProps = {
    /** Twelve entries, January first. `null` means no data recorded yet. */
    months: (number | null)[];
    goal: number;
    formatAmount: (value: number) => string;
    /** Zero-based month index to mark as the month in progress. */
    currentMonth?: number;
};

export function SavingsCalendar({
    months,
    goal,
    formatAmount,
    currentMonth,
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
                        <span className="text-muted-foreground/70">
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
                                <p className="text-xs text-muted-foreground tabular-nums">
                                    {Math.round(share * 100)}%
                                </p>
                            </div>

                            <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
                                {formatAmount(amount)}
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
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
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
