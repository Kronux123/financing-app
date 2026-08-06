import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { BudgetPlan } from '@/lib/budget';
import { groupTotal, planTotals } from '@/lib/budget';
import { formatPeso } from '@/lib/currency';
import { cn } from '@/lib/utils';

type PlanSummaryProps = {
    plan: BudgetPlan;
};

export function PlanSummary({ plan }: PlanSummaryProps) {
    const { income, allocated, unallocated } = planTotals(plan);
    const isOverAllocated = unallocated < 0;

    return (
        <Card className="gap-4">
            <CardHeader>
                <CardTitle className="text-base">Monthly rollup</CardTitle>
                <CardDescription>
                    Every paycheck combined, across the whole month.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
                <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm text-muted-foreground">Income</p>
                        <p
                            data-test="plan-income"
                            className="text-lg font-semibold tabular-nums"
                        >
                            {formatPeso(income)}
                        </p>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm text-muted-foreground">Planned</p>
                        <p
                            data-test="plan-allocated"
                            className="text-lg font-semibold tabular-nums"
                        >
                            {formatPeso(allocated)}
                        </p>
                    </div>
                </div>

                <div
                    className={cn(
                        'rounded-lg p-3',
                        isOverAllocated
                            ? 'bg-goal-behind/10'
                            : 'bg-goal-met/10',
                    )}
                >
                    <p className="text-xs font-medium tracking-wide uppercase">
                        {isOverAllocated ? 'Over budget' : 'Unallocated'}
                    </p>
                    <p
                        data-test="plan-unallocated"
                        className="mt-1 text-2xl font-semibold tracking-tight tabular-nums"
                    >
                        {isOverAllocated ? '−' : ''}
                        {formatPeso(unallocated)}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/70">
                        {isOverAllocated
                            ? 'Your plan spends more than you take home.'
                            : 'Not yet assigned to any group.'}
                    </p>
                </div>

                <div className="space-y-2.5">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        By group
                    </p>

                    {plan.groups.map((group) => {
                        const total = groupTotal(group);
                        const share = income > 0 ? total / income : 0;

                        return (
                            <div key={group.id} className="space-y-1">
                                <div className="flex items-baseline justify-between gap-3">
                                    <p className="truncate text-sm">
                                        {group.name}
                                    </p>
                                    <div className="flex shrink-0 items-baseline gap-3">
                                        <p className="text-sm font-medium tabular-nums">
                                            {formatPeso(total)}
                                        </p>
                                        <p className="w-9 text-right text-xs text-muted-foreground tabular-nums">
                                            {Math.round(share * 100)}%
                                        </p>
                                    </div>
                                </div>
                                <div
                                    aria-hidden
                                    className="h-1 overflow-hidden rounded-full bg-foreground/10"
                                >
                                    <div
                                        className="h-full rounded-full bg-foreground/30 transition-[width] duration-300 motion-reduce:transition-none"
                                        style={{
                                            width: `${Math.min(share, 1) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
