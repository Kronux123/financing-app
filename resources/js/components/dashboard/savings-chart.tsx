type SavingsPoint = {
    month: string;
    amount: number;
};

type SavingsChartProps = {
    data: SavingsPoint[];
    goal: number;
    formatAmount: (value: number) => string;
};

/** Callers render an empty state instead; this draws at least one bar. */
export function SavingsChart({ data, goal, formatAmount }: SavingsChartProps) {
    const peak = Math.max(...data.map((point) => point.amount));
    const best = data.reduce((a, b) => (b.amount > a.amount ? b : a));
    /** Never zero, or every bar divides by it — a flat month still draws. */
    const scaleMax = Math.max(goal, peak, 1) * 1.08;

    return (
        <figure className="space-y-2">
            <div className="relative h-44">
                {/* A plan saving nothing has no goal worth drawing a line at. */}
                {goal > 0 && (
                    <div
                        aria-hidden
                        className="absolute inset-x-0 border-t border-dashed border-border"
                        style={{ bottom: `${(goal / scaleMax) * 100}%` }}
                    >
                        <span className="absolute -top-2.5 right-0 bg-card pl-2 text-xs text-muted-foreground tabular-nums">
                            Goal {formatAmount(goal)}
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
                    className="flex h-full items-end gap-1"
                >
                    {data.map((point) => {
                        const height = (point.amount / scaleMax) * 100;
                        const share =
                            goal > 0 ? (point.amount / goal) * 100 : 0;

                        return (
                            <div
                                key={point.month}
                                className="group relative flex h-full flex-1 flex-col justify-end"
                            >
                                <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-x-0 bottom-full z-10 mb-2 flex justify-center opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
                                >
                                    <span className="rounded-md border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground tabular-nums shadow-sm">
                                        {formatAmount(point.amount)}
                                        {goal > 0 && (
                                            <span className="text-muted-foreground">
                                                {' · '}
                                                {Math.round(share)}% of goal
                                            </span>
                                        )}
                                    </span>
                                </div>

                                {point.month === best.month && (
                                    <p className="mb-1.5 text-center text-xs font-medium text-foreground tabular-nums">
                                        {formatAmount(point.amount)}
                                    </p>
                                )}

                                {/*
                                 * `role="img"` earns the bar its aria-label —
                                 * a bare div cannot carry one, and the label is
                                 * the only way the figure reads out.
                                 */}
                                <div
                                    role="img"
                                    tabIndex={0}
                                    aria-label={
                                        goal > 0
                                            ? `${point.month}: ${formatAmount(point.amount)}, ${Math.round(share)} percent of monthly goal`
                                            : `${point.month}: ${formatAmount(point.amount)}`
                                    }
                                    style={{
                                        height: `${Math.max(height, 2)}%`,
                                    }}
                                    className="mx-auto w-full max-w-10 rounded-t-[4px] bg-emerald-600/80 transition-colors duration-150 outline-none group-hover:bg-emerald-600 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none dark:bg-emerald-400/70 dark:group-hover:bg-emerald-400"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex gap-1">
                {data.map((point) => (
                    <div
                        key={point.month}
                        className="flex-1 text-center text-xs text-muted-foreground"
                    >
                        {point.month}
                    </div>
                ))}
            </div>
        </figure>
    );
}
