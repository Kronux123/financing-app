import { formatPeso } from '@/lib/currency';

/**
 * Miniatures of the real screens, for the landing page.
 *
 * Every figure here is invented, and each preview is small enough and stylised
 * enough to read as an illustration rather than a reading of anybody's account.
 * The sections that use them say so in words too.
 *
 * They are built from the same tokens as the app — `border-border`, `bg-card`,
 * the goal scale as fills only. Tinted *text* would need a -700 light step to
 * clear 4.5:1, so colour appears here as bars, dots and tints, never as ink.
 */

type Row = { label: string; amount: number; tag?: string };

const planRows: Row[] = [
    { label: 'Rent', amount: 7_500, tag: 'Payables' },
    { label: 'Internet', amount: 1_699 },
    { label: 'Groceries and fares', amount: 4_500, tag: 'Allowance' },
];

/** Stage one: the plan being written. */
export function PlanPreview() {
    return (
        <div className="flex flex-col gap-2 text-xs">
            {planRows.map((row) => (
                <div key={row.label}>
                    {row.tag && (
                        <p className="mb-1.5 text-[0.6rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                            {row.tag}
                        </p>
                    )}
                    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-2.5 py-2">
                        <span className="truncate text-muted-foreground">
                            {row.label}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                            {formatPeso(row.amount)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

type PayoutPreviewProps = {
    /** A finalized record shows what really came out beside what was planned. */
    isFinalized?: boolean;
};

const payoutRows = [
    { label: 'Rent', planned: 7_500, actual: 7_500 },
    { label: 'Electricity', planned: 2_340, actual: 2_610 },
    { label: 'Groceries', planned: 4_500, actual: 4_180 },
];

/** Stages two and three: the payday record, before and after settling. */
export function PayoutPreview({ isFinalized = false }: PayoutPreviewProps) {
    return (
        <div className="overflow-hidden rounded-lg border border-border bg-card text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                <span className="font-medium">15 Feb</span>
                <span
                    className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${
                        isFinalized ? 'bg-goal-met/15' : 'bg-muted'
                    }`}
                >
                    <span
                        aria-hidden
                        className={`size-1.5 rounded-full ${
                            isFinalized ? 'bg-goal-met' : 'bg-muted-foreground'
                        }`}
                    />
                    {isFinalized ? 'Finalized' : 'Pending'}
                </span>
            </div>

            <div className="flex flex-col gap-2 px-3 py-2.5">
                {payoutRows.map((row) => {
                    const variance = row.actual - row.planned;

                    return (
                        <div
                            key={row.label}
                            className="flex items-baseline justify-between gap-3"
                        >
                            <span className="truncate text-muted-foreground">
                                {row.label}
                            </span>
                            <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                                <span
                                    className={
                                        isFinalized && variance !== 0
                                            ? 'text-muted-foreground line-through'
                                            : 'font-medium'
                                    }
                                >
                                    {formatPeso(row.planned)}
                                </span>
                                {isFinalized && variance !== 0 && (
                                    <span className="font-medium">
                                        {formatPeso(row.actual)}
                                    </span>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const chartBars = [58, 72, 46, 88, 64, 96];

/** The dashboard's savings chart, reduced to its shape. */
export function ChartPreview() {
    return (
        <div className="flex h-24 items-end gap-1.5" aria-hidden>
            {chartBars.map((height, index) => (
                <div
                    key={index}
                    style={{ height: `${height}%` }}
                    className={`flex-1 rounded-t-sm ${
                        height >= 80 ? 'bg-goal-met' : 'bg-goal-met/35'
                    }`}
                />
            ))}
        </div>
    );
}

/** Percent of goal per month; null is a month never recorded. */
const calendarCells = [82, 96, 74, null, 91, 68, 100, 88, null, 79, 94, 61];

const cellTint = (percent: number | null): string => {
    if (percent === null) {
        return 'border border-dashed border-border';
    }

    if (percent >= 90) {
        return 'bg-goal-met/70';
    }

    return percent >= 75 ? 'bg-goal-close/60' : 'bg-goal-behind/55';
};

/** The savings calendar, at a twelfth of the size. */
export function CalendarPreview() {
    return (
        <div className="grid grid-cols-4 gap-1.5" aria-hidden>
            {calendarCells.map((percent, index) => (
                <div
                    key={index}
                    className={`h-5 rounded-sm ${cellTint(percent)}`}
                />
            ))}
        </div>
    );
}

const debts = [
    { label: 'Laptop', paid: 0.78 },
    { label: 'Motorbike', paid: 0.46 },
    { label: 'Card', paid: 0.24 },
];

/** How far through each debt you are. */
export function DebtPreview() {
    return (
        <div className="flex flex-col gap-2.5 text-xs">
            {debts.map((debt) => (
                <div key={debt.label} className="flex items-center gap-2.5">
                    <span className="w-16 shrink-0 truncate text-muted-foreground">
                        {debt.label}
                    </span>
                    <span
                        aria-hidden
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                    >
                        <span
                            style={{ width: `${debt.paid * 100}%` }}
                            className="block h-full rounded-full bg-goal-met"
                        />
                    </span>
                    <span className="w-8 shrink-0 text-right tabular-nums">
                        {Math.round(debt.paid * 100)}%
                    </span>
                </div>
            ))}
        </div>
    );
}
