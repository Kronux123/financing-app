import { formatPeso } from '@/lib/currency';
import { cn } from '@/lib/utils';

export type PayFlowSegment = {
    id: string;
    name: string;
    amount: number;
    /** A `bg-*` class for the bar and the legend dot. */
    color: string;
};

type PayFlowProps = {
    /** "November", for the heading. */
    month: string;
    income: number;
    /** What the month's expenses come to, for the stat beside income. */
    expenses: number;
    segments: PayFlowSegment[];
    /** Income not yet given a job. Negative when the plan spends more. */
    unassigned: number;
};

/**
 * The month's pay as one bar, split into the jobs the plan gives it.
 *
 * This is the dashboard's centrepiece because it is the app's whole idea in a
 * single picture: every peso that comes in, and where it is sent. Each part of
 * the bar is as wide as its share of income, and the unassigned remainder shows
 * as an empty stretch at the end — a gap you can see is a gap you fix.
 *
 * The bar is decoration for the legend beneath it, which carries every figure
 * in text, so it is hidden from assistive tech rather than described twice.
 */
export function PayFlow({
    month,
    income,
    expenses,
    segments,
    unassigned,
}: PayFlowProps) {
    const isOver = unassigned < 0;
    /** Over budget, the bar is scaled to what is planned so it still fits. */
    const scale = Math.max(
        income,
        segments.reduce((sum, segment) => sum + segment.amount, 0),
        1,
    );
    const shareOf = (amount: number) => Math.round((amount / scale) * 100);

    return (
        <section aria-labelledby="pay-flow-heading" className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
                <div>
                    <h2
                        id="pay-flow-heading"
                        className="text-sm font-medium text-muted-foreground"
                    >
                        Where {month}&rsquo;s pay goes
                    </h2>
                    <p
                        data-test="pay-flow-income"
                        className="mt-1 text-4xl font-semibold tracking-tight tabular-nums"
                    >
                        {formatPeso(income)}
                    </p>
                </div>

                <dl className="flex flex-wrap gap-x-10 gap-y-3 text-sm">
                    <div>
                        <dt className="text-muted-foreground">
                            Monthly expenses
                        </dt>
                        <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                            {formatPeso(expenses)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground">
                            {isOver ? 'Over budget' : 'Not yet given a job'}
                        </dt>
                        <dd
                            data-test="pay-flow-unassigned"
                            className={cn(
                                'mt-0.5 text-lg font-semibold tabular-nums',
                                isOver && 'text-destructive',
                            )}
                        >
                            {isOver ? '−' : ''}
                            {formatPeso(unassigned)}
                        </dd>
                    </div>
                </dl>
            </div>

            <div
                aria-hidden
                className="flex h-4 w-full gap-1 overflow-hidden rounded-full bg-muted"
            >
                {segments
                    .filter((segment) => segment.amount > 0)
                    .map((segment) => (
                        <div
                            key={segment.id}
                            className={cn(
                                'h-full first:rounded-l-full last:rounded-r-full',
                                segment.color,
                            )}
                            style={{
                                width: `${(segment.amount / scale) * 100}%`,
                            }}
                        />
                    ))}
            </div>

            <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-3">
                {segments.map((segment) => (
                    <li
                        key={segment.id}
                        className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-sm sm:block"
                    >
                        <span className="flex items-center gap-2">
                            <span
                                aria-hidden
                                className={cn(
                                    'size-2.5 shrink-0 rounded-full',
                                    segment.color,
                                )}
                            />
                            {segment.name}
                        </span>
                        <span className="tabular-nums sm:mt-1 sm:block">
                            <span className="font-semibold">
                                {formatPeso(segment.amount)}
                            </span>
                            <span className="ml-2 text-muted-foreground">
                                {shareOf(segment.amount)}%
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
