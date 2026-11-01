import { StatusMeter } from '@/components/finance/status-meter';
import { PixelArt } from '@/components/pixel-art';
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

type PlanSummaryProps = {
    plan: BudgetPlan;
};

export function PlanSummary({ plan }: PlanSummaryProps) {
    const { income, allocated, unallocated } = planTotals(plan);
    const isOverAllocated = unallocated < 0;
    const planned = income > 0 ? (allocated / income) * 100 : 0;

    return (
        <Card className="gap-5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-base">
                    <PixelArt sprite="envelope" size={32} />
                    This month
                </CardTitle>
                <CardDescription>Every paycheck combined.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                <dl className="grid grid-cols-2 gap-4">
                    <div>
                        <dt className="text-sm text-muted-foreground">
                            Income
                        </dt>
                        <dd
                            data-test="plan-income"
                            className="text-lg font-semibold tabular-nums"
                        >
                            {formatPeso(income)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-sm text-muted-foreground">
                            Planned
                        </dt>
                        <dd
                            data-test="plan-allocated"
                            className="text-lg font-semibold tabular-nums"
                        >
                            {formatPeso(allocated)}
                        </dd>
                    </div>
                </dl>

                <StatusMeter
                    status={isOverAllocated ? 'Over budget' : 'Unallocated'}
                    tone={isOverAllocated ? 'bg-goal-behind' : 'bg-goal-met'}
                    aside={`${Math.round(planned)}% planned`}
                    figure={
                        <p
                            data-test="plan-unallocated"
                            className="text-2xl font-semibold tracking-tight tabular-nums"
                        >
                            {isOverAllocated ? '−' : ''}
                            {formatPeso(unallocated)}
                        </p>
                    }
                    note={
                        isOverAllocated
                            ? 'Your plan spends more than you take home.'
                            : 'Not yet given a job.'
                    }
                    percent={planned}
                    label={`${formatPeso(allocated)} of ${formatPeso(income)} planned`}
                />

                <div className="space-y-3 border-t border-border pt-5">
                    <h3 className="text-sm font-semibold">By group</h3>

                    {plan.groups.map((group) => {
                        const total = groupTotal(group);
                        const share = income > 0 ? total / income : 0;

                        return (
                            <div key={group.id} className="space-y-1.5">
                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                    <p className="truncate">{group.name}</p>
                                    <p className="shrink-0 tabular-nums">
                                        <span className="font-medium">
                                            {formatPeso(total)}
                                        </span>
                                        <span className="ml-2 inline-block w-9 text-right text-muted-foreground">
                                            {Math.round(share * 100)}%
                                        </span>
                                    </p>
                                </div>
                                <div
                                    aria-hidden
                                    className="h-1 overflow-hidden rounded-full bg-muted"
                                >
                                    <div
                                        className="h-full rounded-full bg-foreground/35 transition-[width] duration-300 motion-reduce:transition-none"
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
