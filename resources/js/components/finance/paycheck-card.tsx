import { ArrowLeftRight, Plus, X } from 'lucide-react';
import { AmountInput } from '@/components/finance/amount-input';
import { StatusMeter } from '@/components/finance/status-meter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BudgetPlan, ExpenseItem, Paycheck } from '@/lib/budget';
import {
    allocatedFor,
    allocationShare,
    debtHistoryFor,
    debtProgressFor,
    enteredTotalFor,
    groupTotal,
    isRemainderItem,
    isSingleAmountGroup,
    itemsFor,
    savingsGroupId,
    unallocatedFor,
} from '@/lib/budget';
import { formatPeso } from '@/lib/currency';

type AllocationTier = {
    label: string;
    /** Solid fill for the bar and dot. */
    mark: string;
};

/**
 * Same validated `--goal-*` tokens as `savings-calendar.tsx` (see the note at
 * its `tiers` array), but the thresholds invert: passing a savings goal is
 * good, whereas planning to spend more than a paycheck holds is not. Orange
 * still marks the problem state, so the two pages stay readable together.
 */
const tiers: Record<'over' | 'tight' | 'clear' | 'swept', AllocationTier> = {
    over: {
        label: 'Over-allocated',
        mark: 'bg-goal-behind',
    },
    tight: {
        label: 'Tight',
        mark: 'bg-goal-close',
    },
    clear: {
        label: 'Comfortable',
        mark: 'bg-goal-met',
    },
    swept: {
        label: 'Fully allocated',
        mark: 'bg-goal-met',
    },
};

const allocationTierFor = (
    share: number,
    savesRemainder: boolean,
): AllocationTier => {
    if (share > 1) {
        return tiers.over;
    }

    /**
     * Nothing is sitting idle once the remainder is swept, so the usual warning
     * for spending close to the whole paycheck would be reading it backwards.
     */
    if (savesRemainder) {
        return tiers.swept;
    }

    if (share >= 0.9) {
        return tiers.tight;
    }

    return tiers.clear;
};

/**
 * What a debt still owes: the payment times the payments left. Derived, so the
 * row reports it rather than asking for it. A start date adds what was borrowed
 * and how far through you are.
 */
const debtNote = (item: ExpenseItem, today: Date): string => {
    const { owed, months, isOpenEnded } = debtProgressFor(item, today);

    if (isOpenEnded) {
        return 'add an end date';
    }

    if (months <= 0) {
        return 'ended';
    }

    const left = `${formatPeso(owed)} left · ${months} ${months === 1 ? 'month' : 'months'}`;
    const history = debtHistoryFor(item, today);

    if (!history) {
        return left;
    }

    return `${left} · ${history.monthsPaid} of ${history.totalMonths} paid`;
};

/** Today as `YYYY-MM-DD` in local time — `toISOString` would shift the day. */
const todayValue = (today: Date): string => {
    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
    ].join('-');
};

/**
 * The schedule in words. The weekend rule is spelled out because it decides
 * which date a payday actually lands on, and the payouts page shows that date
 * rather than the one the paycheck is set to.
 */
const paydayDescription = (paycheck: Paycheck): string => {
    const day =
        paycheck.dayOfMonth === 'last'
            ? 'the last day of the month'
            : `the ${paycheck.dayOfMonth}th`;

    return `Paid on ${day}, or the Friday before if that is a weekend`;
};

/** The swept savings line, which is derived and so cannot be edited here. */
function RemainderRow({
    paycheckId,
    item,
}: {
    paycheckId: string;
    item: ExpenseItem;
}) {
    return (
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
            <p className="text-sm">{item.name}</p>
            <p
                data-test={`remainder-${paycheckId}`}
                className="text-sm font-medium tabular-nums"
            >
                {formatPeso(item.amount)}
            </p>
        </div>
    );
}

function SweepToggle({
    paycheckId,
    savesRemainder,
    onChange,
}: {
    paycheckId: string;
    savesRemainder: boolean;
    onChange: (savesRemainder: boolean) => void;
}) {
    return (
        <div className="flex items-center gap-2 pt-0.5">
            <Checkbox
                id={`sweep-${paycheckId}`}
                data-test={`sweep-${paycheckId}`}
                checked={savesRemainder}
                onCheckedChange={(state) => onChange(state === true)}
            />
            <Label
                htmlFor={`sweep-${paycheckId}`}
                className="text-sm font-normal text-muted-foreground"
            >
                Save whatever is left over
            </Label>
        </div>
    );
}

type PaycheckCardProps = {
    plan: BudgetPlan;
    paycheck: Paycheck;
    /** The paycheck an expense can be moved to; omitted when pay is monthly. */
    otherPaycheck?: Paycheck;
    /** Take-home is worked out from the gross, so it reads rather than edits. */
    isFromGross?: boolean;
    onIncomeChange: (amount: number) => void;
    onSavesRemainderChange: (savesRemainder: boolean) => void;
    onGroupAmountChange: (
        groupId: string,
        paycheckId: string,
        amount: number,
    ) => void;
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
    isFromGross = false,
    onIncomeChange,
    onSavesRemainderChange,
    onGroupAmountChange,
    onItemAdd,
    onItemChange,
    onItemRemove,
}: PaycheckCardProps) {
    /**
     * Read once per render for the "months left" figures. Only ever displayed —
     * nothing is stored or retired off the back of it.
     */
    const today = new Date();
    const savesRemainder = paycheck.savesRemainder === true;
    const allocated = allocatedFor(plan, paycheck.id);
    const leftover = unallocatedFor(plan, paycheck.id);
    const share = allocationShare(plan, paycheck.id);
    const tier = allocationTierFor(share, savesRemainder);
    const percent = Math.round(share * 100);

    return (
        /*
         * A subgrid of the paycheck grid on the plan page: one row for the
         * header, then one per group. Both paychecks share those rows, so
         * Allowance and Savings sit level across the two cards however many
         * payables — or debt details — either one carries.
         */
        <Card
            data-test={`paycheck-${paycheck.id}`}
            className="grid grid-rows-subgrid gap-6"
            style={{ gridRow: `span ${plan.groups.length + 1}` }}
        >
            <CardHeader className="gap-4">
                <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold">
                            {paycheck.label}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {paydayDescription(paycheck)}
                        </p>
                    </div>
                    <div className="grid w-40 shrink-0 gap-1.5">
                        <Label
                            htmlFor={`income-${paycheck.id}`}
                            className="justify-end text-muted-foreground"
                        >
                            Take-home
                        </Label>
                        <AmountInput
                            id={`income-${paycheck.id}`}
                            data-test={`income-${paycheck.id}`}
                            value={paycheck.amount}
                            onValueChange={onIncomeChange}
                            disabled={isFromGross}
                        />
                    </div>
                </div>
                {isFromGross && (
                    <p className="-mt-2 text-right text-sm text-muted-foreground">
                        Worked out from your gross pay
                    </p>
                )}

                <StatusMeter
                    status={tier.label}
                    tone={tier.mark}
                    aside={`${percent}% allocated`}
                    figure={
                        <p
                            data-test={`leftover-${paycheck.id}`}
                            className="text-2xl font-semibold tracking-tight tabular-nums"
                        >
                            {leftover < 0 ? '−' : ''}
                            {formatPeso(leftover)}
                        </p>
                    }
                    note={
                        <>
                            {leftover < 0 ? 'over' : 'left'} of{' '}
                            {formatPeso(paycheck.amount)}, with{' '}
                            <span data-test={`allocated-${paycheck.id}`}>
                                {formatPeso(allocated)}
                            </span>{' '}
                            planned
                        </>
                    }
                    percent={Math.min(share, 1) * 100}
                    label={`${paycheck.label}: ${formatPeso(allocated)} of ${formatPeso(paycheck.amount)} allocated, ${percent} percent — ${tier.label}`}
                />
            </CardHeader>

            <CardContent
                className="grid grid-rows-subgrid border-t border-border pt-5"
                style={{ gridRow: `span ${plan.groups.length}` }}
            >
                {plan.groups.map((group) => {
                    const funded = itemsFor(group, paycheck.id);
                    const items = funded.filter(
                        (item) => !isRemainderItem(item),
                    );
                    const remainder = funded.find(isRemainderItem);

                    if (isSingleAmountGroup(group)) {
                        return (
                            <div key={group.id} className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label
                                        htmlFor={`amount-${group.id}-${paycheck.id}`}
                                        className="text-sm font-medium"
                                    >
                                        {group.name}
                                    </Label>
                                    <AmountInput
                                        id={`amount-${group.id}-${paycheck.id}`}
                                        data-test={`amount-${group.id}-${paycheck.id}`}
                                        value={enteredTotalFor(
                                            group,
                                            paycheck.id,
                                        )}
                                        onValueChange={(amount) =>
                                            onGroupAmountChange(
                                                group.id,
                                                paycheck.id,
                                                amount,
                                            )
                                        }
                                        className="w-32 shrink-0"
                                    />
                                </div>

                                {remainder && (
                                    <RemainderRow
                                        paycheckId={paycheck.id}
                                        item={remainder}
                                    />
                                )}

                                {group.id === savingsGroupId && (
                                    <SweepToggle
                                        paycheckId={paycheck.id}
                                        savesRemainder={savesRemainder}
                                        onChange={onSavesRemainderChange}
                                    />
                                )}
                            </div>
                        );
                    }

                    return (
                        <div key={group.id} className="space-y-3">
                            <div className="flex items-baseline justify-between gap-2">
                                <h3 className="text-sm font-semibold">
                                    {group.name}
                                </h3>
                                <p className="text-sm font-semibold tabular-nums">
                                    {formatPeso(groupTotal(group, paycheck.id))}
                                </p>
                            </div>

                            {/*
                             * Two tiers per payable. What it is and what it
                             * costs lead, on a line of their own so the
                             * amounts align down the list; the end date, the
                             * debt tick and where it is funded from are
                             * details, and read as such. Six controls on one
                             * line was unreadable in a half-width card.
                             */}
                            {items.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="space-y-1.5 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                                >
                                    <div className="flex items-center gap-2">
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

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                        {/*
                                         * Start before end, in the order the
                                         * debt ran. The start is optional and
                                         * only useful on a debt — it is what
                                         * turns "what is left" into "how far
                                         * through you are" — so it stays off
                                         * every other payable's row.
                                         */}
                                        {item.isDebt && (
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    aria-hidden
                                                    className="text-sm text-muted-foreground"
                                                >
                                                    Started
                                                </span>
                                                <Input
                                                    type="date"
                                                    aria-label={`${item.name || 'Expense'} started on, optional`}
                                                    data-test={`item-started-${group.id}-${paycheck.id}-${index}`}
                                                    value={item.startedOn ?? ''}
                                                    onChange={(event) =>
                                                        onItemChange(
                                                            group.id,
                                                            item.id,
                                                            {
                                                                startedOn:
                                                                    event.target
                                                                        .value ||
                                                                    undefined,
                                                            },
                                                        )
                                                    }
                                                    className="h-8 w-40 text-sm [color-scheme:light] dark:[color-scheme:dark]"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    data-test={`item-started-today-${group.id}-${paycheck.id}-${index}`}
                                                    className="h-7 px-2 text-sm text-foreground/70"
                                                    onClick={() =>
                                                        onItemChange(
                                                            group.id,
                                                            item.id,
                                                            {
                                                                startedOn:
                                                                    todayValue(
                                                                        today,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                >
                                                    Today
                                                </Button>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1.5">
                                            {/*
                                             * Hidden from assistive tech so
                                             * the input keeps its fuller
                                             * name — "Rent ends on" reads
                                             * better out of context than
                                             * "Ends" repeated per row. The
                                             * asterisk goes with it; the
                                             * input carries aria-required.
                                             */}
                                            <span
                                                aria-hidden
                                                className="text-sm text-muted-foreground"
                                            >
                                                Ends
                                                {item.isDebt && (
                                                    <span className="text-destructive">
                                                        {' '}
                                                        *
                                                    </span>
                                                )}
                                            </span>
                                            <Input
                                                type="date"
                                                aria-label={
                                                    item.isDebt
                                                        ? `${item.name || 'Expense'} ends on, required for a debt`
                                                        : `${item.name || 'Expense'} ends on, optional`
                                                }
                                                aria-required={
                                                    item.isDebt === true
                                                }
                                                data-test={`item-ends-${group.id}-${paycheck.id}-${index}`}
                                                value={item.endsOn ?? ''}
                                                onChange={(event) =>
                                                    onItemChange(
                                                        group.id,
                                                        item.id,
                                                        {
                                                            endsOn:
                                                                event.target
                                                                    .value ||
                                                                undefined,
                                                        },
                                                    )
                                                }
                                                className="h-8 w-40 text-sm [color-scheme:light] dark:[color-scheme:dark]"
                                            />
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <Checkbox
                                                id={`is-debt-${group.id}-${paycheck.id}-${index}`}
                                                data-test={`item-is-debt-${group.id}-${paycheck.id}-${index}`}
                                                checked={item.isDebt === true}
                                                onCheckedChange={(state) =>
                                                    onItemChange(
                                                        group.id,
                                                        item.id,
                                                        {
                                                            isDebt:
                                                                state === true
                                                                    ? true
                                                                    : undefined,
                                                        },
                                                    )
                                                }
                                            />
                                            <Label
                                                htmlFor={`is-debt-${group.id}-${paycheck.id}-${index}`}
                                                className="text-sm font-normal text-muted-foreground"
                                            >
                                                Debt
                                            </Label>
                                        </div>

                                        {otherPaycheck && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="ml-auto size-7 shrink-0"
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
                                                    className="size-3.5"
                                                />
                                            </Button>
                                        )}
                                    </div>

                                    {item.isDebt && (
                                        <p
                                            data-test={`item-owed-${group.id}-${paycheck.id}-${index}`}
                                            className="text-sm text-muted-foreground tabular-nums"
                                        >
                                            {debtNote(item, today)}
                                        </p>
                                    )}
                                </div>
                            ))}

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                data-test={`add-${group.id}-${paycheck.id}`}
                                // Muted text drops to 4.34:1 once the ghost
                                // hover background lands under it.
                                className="h-8 w-full justify-start text-foreground/70"
                                onClick={() => onItemAdd(group.id, paycheck.id)}
                            >
                                <Plus aria-hidden className="size-3.5" />
                                Add to {group.name}
                            </Button>

                            <p className="text-sm text-muted-foreground">
                                Give a payable that stops, like an installment,
                                its end date. Tick Debt and it counts toward
                                what you owe.
                            </p>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
