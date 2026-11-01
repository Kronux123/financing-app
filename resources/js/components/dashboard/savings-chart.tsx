import { PixelArt } from '@/components/pixel-art';
import type { GoalTier } from '@/lib/savings';
import { goalTierFor } from '@/lib/savings';
import { cn } from '@/lib/utils';

type SavingsPoint = {
    month: string;
    amount: number;
};

type SavingsChartProps = {
    data: SavingsPoint[];
    goal: number;
    formatAmount: (value: number) => string;
};

/**
 * Each bar is graded on the same three-hue goal scale as the savings calendar,
 * so a month reads the same colour in both places. Classes are spelled out in
 * full — Tailwind reads this file as text, and a name built from
 * `bg-goal-${tier}` would never reach the stylesheet.
 *
 * The hue is only ever a fill. Every figure beside a bar is plain foreground
 * text, because tinted text would need its own contrast step.
 */
const tierBar: Record<GoalTier, string> = {
    met: 'from-goal-met/55 to-goal-met',
    close: 'from-goal-close/55 to-goal-close',
    behind: 'from-goal-behind/55 to-goal-behind',
};

const tierDot: Record<GoalTier, string> = {
    met: 'bg-goal-met',
    close: 'bg-goal-close',
    behind: 'bg-goal-behind',
};

const legend: { tier: GoalTier; label: string }[] = [
    { tier: 'behind', label: 'Under 70%' },
    { tier: 'close', label: '70–99%' },
    { tier: 'met', label: 'Goal met' },
];

/** Without a goal there is nothing to grade against, so every bar is jade. */
const ungradedBar = 'from-jade/55 to-jade';

/**
 * What the bars add up to, said in words above them — the totals a reader would
 * otherwise have to work out by eye.
 */
function ChartStats({ data, goal, formatAmount }: SavingsChartProps) {
    const total = data.reduce((sum, point) => sum + point.amount, 0);
    const average = total / data.length;
    const onGoal = data.filter((point) => point.amount >= goal).length;
    const span = `${data.length} ${data.length === 1 ? 'month' : 'months'}`;

    const stats = [
        { label: `Saved in ${span}`, value: formatAmount(total) },
        { label: 'Average a month', value: formatAmount(Math.round(average)) },
        goal > 0
            ? { label: 'Months on goal', value: `${onGoal} of ${data.length}` }
            : null,
    ].filter((stat) => stat !== null);

    return (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {stats.map((stat) => (
                <div key={stat.label}>
                    <dt className="text-xs text-muted-foreground">
                        {stat.label}
                    </dt>
                    <dd className="mt-0.5 text-lg font-semibold tracking-tight tabular-nums">
                        {stat.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/** Callers render an empty state instead; this draws at least one bar. */
export function SavingsChart({ data, goal, formatAmount }: SavingsChartProps) {
    const peak = Math.max(...data.map((point) => point.amount));
    const best = data.reduce((a, b) => (b.amount > a.amount ? b : a));
    /**
     * Never zero, or every bar divides by it — a flat month still draws. The
     * headroom leaves space above the tallest bar for its figure and the star.
     */
    const scaleMax = Math.max(goal, peak, 1) * 1.3;
    const signed = (value: number): string =>
        `${value < 0 ? '−' : ''}${formatAmount(value)}`;

    return (
        <figure className="flex h-full flex-col gap-6">
            <ChartStats data={data} goal={goal} formatAmount={formatAmount} />

            <div className="flex flex-1 flex-col">
                <div className="relative min-h-52 flex-1">
                    {/* A plan saving nothing has no goal worth drawing a line at. */}
                    {goal > 0 && (
                        <div
                            aria-hidden
                            className="absolute inset-x-0 z-10 border-t border-dashed border-foreground/30"
                            style={{ bottom: `${(goal / scaleMax) * 100}%` }}
                        >
                            <span className="absolute -top-2 right-0 w-16 text-right text-xs leading-none text-muted-foreground tabular-nums">
                                Goal
                                <br />
                                {formatAmount(goal)}
                            </span>
                        </div>
                    )}

                    <div
                        role="group"
                        aria-label={
                            goal > 0
                                ? `Monthly savings over ${data.length} ${data.length === 1 ? 'month' : 'months'}, against a ${formatAmount(goal)} monthly goal`
                                : `Monthly savings over ${data.length} ${data.length === 1 ? 'month' : 'months'}`
                        }
                        className={cn(
                            'flex h-full items-end gap-2 sm:gap-4',
                            goal > 0 && 'pr-18',
                        )}
                    >
                        {data.map((point, index) => {
                            const height = (point.amount / scaleMax) * 100;
                            const share = goal > 0 ? point.amount / goal : 0;
                            const tier = goal > 0 ? goalTierFor(share) : null;
                            const gap = point.amount - goal;
                            const isBest =
                                point.month === best.month && data.length > 1;

                            return (
                                <div
                                    key={point.month}
                                    className="group relative flex h-full flex-1 flex-col items-center justify-end"
                                >
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute inset-x-0 bottom-full z-20 mb-2 flex justify-center opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
                                    >
                                        <span className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground tabular-nums shadow-md">
                                            <span className="font-medium">
                                                {point.month} ·{' '}
                                                {signed(point.amount)}
                                            </span>
                                            {goal > 0 && (
                                                <span className="block text-muted-foreground">
                                                    {gap >= 0
                                                        ? `${formatAmount(gap)} over goal`
                                                        : `${formatAmount(gap)} short of goal`}
                                                </span>
                                            )}
                                        </span>
                                    </div>

                                    {isBest && (
                                        <PixelArt
                                            sprite="star"
                                            size={24}
                                            className="mb-1"
                                        />
                                    )}
                                    <p
                                        className={cn(
                                            'mb-1.5 text-center text-xs tabular-nums',
                                            isBest
                                                ? 'font-semibold text-foreground'
                                                : 'font-medium text-foreground/85',
                                        )}
                                    >
                                        {signed(point.amount)}
                                    </p>

                                    {/*
                                     * `role="img"` earns the bar its
                                     * aria-label — a bare div cannot carry one,
                                     * and the label is the only way the figure
                                     * reads out.
                                     */}
                                    <div
                                        role="img"
                                        tabIndex={0}
                                        aria-label={
                                            goal > 0
                                                ? `${point.month}: ${signed(point.amount)}, ${Math.round(share * 100)} percent of monthly goal`
                                                : `${point.month}: ${signed(point.amount)}`
                                        }
                                        style={{
                                            height: `${Math.max(height, 2)}%`,
                                            animationDelay: `${index * 70}ms`,
                                        }}
                                        className={cn(
                                            'w-full max-w-14 chart-bar-rise rounded-t-md bg-gradient-to-t shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition-[filter] duration-150 outline-none group-hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                                            tier ? tierBar[tier] : ungradedBar,
                                        )}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="h-px bg-border" />

                <div
                    className={cn(
                        'mt-2 flex gap-2 sm:gap-4',
                        goal > 0 && 'pr-18',
                    )}
                >
                    {data.map((point) => (
                        <div
                            key={point.month}
                            className="flex-1 text-center text-xs text-muted-foreground"
                        >
                            {point.month}
                        </div>
                    ))}
                </div>
            </div>

            {goal > 0 && (
                <ul
                    aria-label="Bar colours"
                    className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
                >
                    {legend.map((item) => (
                        <li
                            key={item.tier}
                            className="flex items-center gap-1.5"
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'size-2.5 rounded-sm',
                                    tierDot[item.tier],
                                )}
                            />
                            {item.label}
                        </li>
                    ))}
                </ul>
            )}
        </figure>
    );
}
