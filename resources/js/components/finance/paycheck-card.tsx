import { ArrowLeftRight, Plus, X } from 'lucide-react';
import { AmountInput } from '@/components/finance/amount-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BudgetPlan, ExpenseItem, Paycheck } from '@/lib/budget';
import {
    allocatedFor,
    allocationShare,
    groupTotal,
    itemsFor,
    unallocatedFor,
} from '@/lib/budget';
import { formatPeso } from '@/lib/currency';
import { cn } from '@/lib/utils';

type AllocationTier = {
    label: string;
    /** Solid fill for the bar and dot. */
    mark: string;
    /** 10% tint for the surface behind the figures. */
    surface: string;
};

/**
 * Same validated `--goal-*` tokens as `savings-calendar.tsx` (see the note at
 * its `tiers` array), but the thresholds invert: passing a savings goal is
 * good, whereas planning to spend more than a paycheck holds is not. Orange
 * still marks the problem state, so the two pages stay readable together.
 */
const tiers: Record<'over' | 'tight' | 'clear', AllocationTier> = {
    over: {
        label: 'Over-allocated',
        mark: 'bg-goal-behind',
        surface: 'bg-goal-behind/10',
    },
    tight: {
        label: 'Tight',
        mark: 'bg-goal-close',
        surface: 'bg-goal-close/10',
    },
    clear: {
        label: 'Comfortable',
        mark: 'bg-goal-met',
        surface: 'bg-goal-met/10',
    },
};

const allocationTierFor = (share: number): AllocationTier => {
    if (share > 1) {
        return tiers.over;
    }

    if (share >= 0.9) {
        return tiers.tight;
    }

    return tiers.clear;
};

const paydayDescription = (paycheck: Paycheck): string => {
    if (paycheck.dayOfMonth === 'last') {
        return 'Paid on the last day of the month';
    }

    return `Paid on the ${paycheck.dayOfMonth}th`;
};

type PaycheckCardProps = {
    plan: BudgetPlan;
    paycheck: Paycheck;
    /** The paycheck an expense can be moved to; omitted when pay is monthly. */
    otherPaycheck?: Paycheck;
    onIncomeChange: (amount: number) => void;
    onItemAdd: (groupId: string, paycheckId: string) => void;
    onItemChange: (
        groupId: string,
        itemId: string,
        patch: Partial<ExpenseItem>,
    ) => void;
    onItemRemove: (groupId: string, itemId: string) => void;
};

export function PaycheckCard({
    plan,
    paycheck,
    otherPaycheck,
    onIncomeChange,
    onItemAdd,
    onItemChange,
    onItemRemove,
}: PaycheckCardProps) {
    const allocated = allocatedFor(plan, paycheck.id);
    const leftover = unallocatedFor(plan, paycheck.id);
    const share = allocationShare(plan, paycheck.id);
    const tier = allocationTierFor(share);
    const percent = Math.round(share * 100);

    return (
        <Card data-test={`paycheck-${paycheck.id}`} className="gap-4">
            <CardHeader className="gap-3">
                <div className="flex items-baseline justify-between gap-3">
                    <div>
                        <p className="font-semibold">{paycheck.label}</p>
                        <p className="text-xs text-muted-foreground">
                            {paydayDescription(paycheck)}
                        </p>
                    </div>
                    <span
                        aria-hidden
                        className={cn(
                            'size-2.5 shrink-0 rounded-full',
                            tier.mark,
                        )}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor={`income-${paycheck.id}`}>Take-home</Label>
                    <AmountInput
                        id={`income-${paycheck.id}`}
                        data-test={`income-${paycheck.id}`}
                        value={paycheck.amount}
                        onValueChange={onIncomeChange}
                    />
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className={cn('rounded-lg p-3', tier.surface)}>
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-medium tracking-wide uppercase">
                            {tier.label}
                        </p>
                        <p className="text-xs text-foreground/70 tabular-nums">
                            {percent}% allocated
                        </p>
                    </div>

                    <p
                        data-test={`leftover-${paycheck.id}`}
                        className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums"
                    >
                        {leftover < 0 ? '−' : ''}
                        {formatPeso(leftover)}
                    </p>
                    <p className="text-xs text-foreground/70 tabular-nums">
                        {leftover < 0 ? 'over' : 'left'} of{' '}
                        {formatPeso(paycheck.amount)} ·{' '}
                        <span data-test={`allocated-${paycheck.id}`}>
                            {formatPeso(allocated)}
                        </span>{' '}
                        planned
                    </p>

                    <div
                        role="progressbar"
                        aria-valuenow={Math.min(percent, 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${paycheck.label}: ${formatPeso(allocated)} of ${formatPeso(paycheck.amount)} allocated, ${percent} percent — ${tier.label}`}
                        className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10"
                    >
                        <div
                            className={cn(
                                'h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none',
                                tier.mark,
                            )}
                            style={{
                                width: `${Math.min(share, 1) * 100}%`,
                            }}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {plan.groups.map((group) => {
                        const items = itemsFor(group, paycheck.id);

                        return (
                            <div key={group.id} className="space-y-2">
                                <div className="flex items-baseline justify-between gap-2 border-b border-border pb-1.5">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        {group.name}
                                    </p>
                                    <p className="text-xs font-medium tabular-nums">
                                        {formatPeso(
                                            groupTotal(group, paycheck.id),
                                        )}
                                    </p>
                                </div>

                                {items.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-2"
                                    >
                                        <Input
                                            aria-label={`${group.name} expense name`}
                                            data-test={`item-name-${group.id}-${paycheck.id}-${index}`}
                                            placeholder="Expense"
                                            value={item.name}
                                            onChange={(event) =>
                                                onItemChange(
                                                    group.id,
                                                    item.id,
                                                    {
                                                        name: event.target
                                                            .value,
                                                    },
                                                )
                                            }
                                            className="h-9 min-w-0 flex-1"
                                        />
                                        <AmountInput
                                            label={`${item.name || 'Expense'} amount`}
                                            data-test={`item-amount-${group.id}-${paycheck.id}-${index}`}
                                            value={item.amount}
                                            onValueChange={(amount) =>
                                                onItemChange(
                                                    group.id,
                                                    item.id,
                                                    {
                                                        amount,
                                                    },
                                                )
                                            }
                                            className="w-28 shrink-0"
                                        />
                                        {otherPaycheck && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="size-9 shrink-0"
                                                data-test={`move-${group.id}-${paycheck.id}-${index}`}
                                                aria-label={`Move ${item.name || 'this expense'} to ${otherPaycheck.label}`}
                                                onClick={() =>
                                                    onItemChange(
                                                        group.id,
                                                        item.id,
                                                        {
                                                            paycheckId:
                                                                otherPaycheck.id,
                                                        },
                                                    )
                                                }
                                            >
                                                <ArrowLeftRight
                                                    aria-hidden
                                                    className="size-4"
                                                />
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-9 shrink-0"
                                            data-test={`remove-${group.id}-${paycheck.id}-${index}`}
                                            aria-label={`Remove ${item.name || 'this expense'}`}
                                            onClick={() =>
                                                onItemRemove(group.id, item.id)
                                            }
                                        >
                                            <X aria-hidden className="size-4" />
                                        </Button>
                                    </div>
                                ))}

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    data-test={`add-${group.id}-${paycheck.id}`}
                                    className="h-8 w-full justify-start text-muted-foreground"
                                    onClick={() =>
                                        onItemAdd(group.id, paycheck.id)
                                    }
                                >
                                    <Plus aria-hidden className="size-3.5" />
                                    Add to {group.name}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
