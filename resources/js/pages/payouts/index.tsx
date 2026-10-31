import { Head, Link } from '@inertiajs/react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { EmptyPanel } from '@/components/dashboard/empty-panel';
import { AmountInput } from '@/components/finance/amount-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useStoredBudgetPlan } from '@/hooks/use-budget-plan';
import {
    setPayoutStatus,
    usePayoutDraft,
    useStoredPayouts,
} from '@/hooks/use-payouts';
import { allowanceGroupId } from '@/lib/budget';
import { formatPeso, formatSigned } from '@/lib/currency';
import type { Payout } from '@/lib/payout';
import {
    incomeVariance,
    isFinalized,
    leftOver,
    lineGroups,
    withActualIncome,
    withActualLine,
    withExtraLine,
    withoutLine,
} from '@/lib/payout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { edit as financeRoute } from '@/routes/finance';
import { index as payoutsRoute } from '@/routes/payouts';

const paydayLabel = (paidOn: string): string => {
    return new Date(`${paidOn}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

/** Lines that came out at a different figure from the plan. */
const differingLines = (payout: Payout): number => {
    return payout.lines.filter((line) => line.actual !== line.planned).length;
};

/**
 * What a payday has to say for itself. A payday that matched the plan says the
 * shortest possible thing, because there is nothing to look into.
 */
const summary = (payout: Payout): string => {
    const differing = differingLines(payout);
    const income = incomeVariance(payout);

    if (differing === 0 && income === 0) {
        return 'Went to plan';
    }

    const parts = [];

    if (income !== 0) {
        parts.push(`${formatSigned(income)} take-home`);
    }

    if (differing > 0) {
        parts.push(
            `${differing} ${differing === 1 ? 'line differs' : 'lines differ'}`,
        );
    }

    return parts.join(' · ');
};

/**
 * The signature of this page: a figure that matched the plan is shown without
 * comment, so the eye lands only where something moved. Colour repeats the sign
 * rather than carrying the meaning alone.
 */
function Delta({
    amount,
    favourable,
}: {
    amount: number;
    favourable: boolean;
}) {
    if (amount === 0) {
        return null;
    }

    return (
        <span
            className={cn(
                'rounded px-1.5 py-0.5 text-xs font-medium tabular-nums',
                favourable ? 'bg-goal-met/15' : 'bg-goal-behind/15',
            )}
        >
            {formatSigned(amount)}
        </span>
    );
}

function StatusDot({ payout }: { payout: Payout }) {
    return (
        <span
            data-test={`payout-status-${payout.key}`}
            className="flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground"
        >
            <span
                aria-hidden
                className={cn(
                    'size-1.5 rounded-full',
                    isFinalized(payout) ? 'bg-goal-met' : 'bg-goal-close',
                )}
            />
            {isFinalized(payout) ? 'Finalized' : 'Pending'}
        </span>
    );
}

function PayoutRow({ payout, onOpen }: { payout: Payout; onOpen: () => void }) {
    return (
        <button
            type="button"
            data-test={`payout-row-${payout.key}`}
            onClick={onOpen}
            className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
            <span className="w-24 shrink-0 text-sm font-medium tabular-nums">
                {paydayLabel(payout.paidOn)}
            </span>
            <span className="w-24 shrink-0 truncate text-sm text-muted-foreground">
                {payout.paycheckLabel}
            </span>
            <span className="flex-1 truncate text-sm text-muted-foreground">
                {summary(payout)}
            </span>
            <span className="shrink-0 text-sm font-medium tabular-nums">
                {formatPeso(leftOver(payout))}
            </span>
            <StatusDot payout={payout} />
            <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
            />
        </button>
    );
}

/**
 * Something that went out which the plan never forecast, put on the payday it
 * came out of.
 *
 * This is for the one-off that moved the month — a monitor, a hospital visit —
 * and deliberately not a running record of what gets bought day to day. The
 * allowance already carries the coffee and the groceries as one figure per
 * paycheck, so itemising them here would count the same money twice and pull the
 * month's saving down with it.
 *
 * Folded away until asked for. A payday that went to plan should say the
 * shortest possible thing, which is the rest of this card's argument too.
 */
function AddLine({
    payout,
    onAdd,
}: {
    payout: Payout;
    onAdd: (line: { groupId: string; name: string; actual: number }) => void;
}) {
    const [open, setOpen] = useState(false);
    const [groupId, setGroupId] = useState(allowanceGroupId);
    const [name, setName] = useState('');
    const [actual, setActual] = useState(0);

    if (!open) {
        return (
            <Button
                variant="ghost"
                size="sm"
                data-test={`payout-add-line-${payout.key}`}
                onClick={() => setOpen(true)}
                className="mt-3 -ml-2 text-muted-foreground"
            >
                <Plus aria-hidden />
                Add a line
            </Button>
        );
    }

    return (
        <div className="mt-3 rounded-lg border border-dashed border-border p-3">
            <div className="flex flex-wrap items-end gap-3">
                <div className="grid min-w-48 flex-1 gap-1.5">
                    <Label htmlFor={`new-line-name-${payout.key}`}>
                        What went out
                    </Label>
                    <Input
                        id={`new-line-name-${payout.key}`}
                        data-test={`payout-new-name-${payout.key}`}
                        value={name}
                        placeholder="Monitor"
                        onChange={(event) => setName(event.target.value)}
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor={`new-line-amount-${payout.key}`}>
                        Amount
                    </Label>
                    <AmountInput
                        id={`new-line-amount-${payout.key}`}
                        data-test={`payout-new-amount-${payout.key}`}
                        value={actual}
                        onValueChange={setActual}
                        className="w-32"
                    />
                </div>
            </div>

            <div className="mt-3 grid gap-1.5">
                <Label htmlFor={`new-line-group-${payout.key}`}>
                    Where it came from
                </Label>
                <ToggleGroup
                    id={`new-line-group-${payout.key}`}
                    type="single"
                    variant="outline"
                    value={groupId}
                    onValueChange={(value) => {
                        if (value) {
                            setGroupId(value);
                        }
                    }}
                    className="w-full sm:w-auto"
                >
                    {lineGroups.map((group) => (
                        <ToggleGroupItem
                            key={group.id}
                            value={group.id}
                            data-test={`payout-new-group-${group.id}`}
                            className="px-4"
                        >
                            {group.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>

            <div className="mt-3 flex items-center gap-2">
                <Button
                    size="sm"
                    data-test={`payout-confirm-line-${payout.key}`}
                    /* A line with no name reads as nothing at all on the record. */
                    disabled={name.trim() === ''}
                    onClick={() => {
                        onAdd({ groupId, name: name.trim(), actual });
                        setName('');
                        setActual(0);
                        setGroupId(allowanceGroupId);
                        setOpen(false);
                    }}
                >
                    Add
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    data-test={`payout-cancel-line-${payout.key}`}
                    onClick={() => setOpen(false)}
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}

/**
 * One payday, open for review.
 *
 * Corrections are held in a draft rather than sent as they are typed: a payday
 * is reviewed as one document, and every keystroke in an amount field would
 * otherwise be a write. Finalizing a card with corrections still in it saves
 * them first, so the button never quietly throws work away.
 */
function PayoutDetail({ payout: stored }: { payout: Payout }) {
    const { payout, isDirty, update, save } = usePayoutDraft(stored);
    const finalized = isFinalized(payout);
    const left = leftOver(payout);
    const over = left < 0;

    const toggleStatus = () => {
        const next = finalized ? 'pending' : 'finalized';

        if (isDirty) {
            save(() => setPayoutStatus(payout, next));

            return;
        }

        setPayoutStatus(payout, next);
    };

    return (
        <Card data-test="payout-card" className="gap-0 overflow-hidden py-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-5 py-4">
                <div className="flex items-baseline gap-3">
                    <h2
                        data-test="payout-date"
                        className="text-lg font-semibold tracking-tight tabular-nums"
                    >
                        {paydayLabel(payout.paidOn)}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {payout.paycheckLabel}
                    </p>
                </div>
                <StatusDot payout={payout} />
            </div>

            <div className="px-5 py-4">
                {/*
                 * The paycheck is the only income the plan forecasts. Anything
                 * beside it — a bonus, 13th month pay — arrived unplanned and
                 * gets its own row rather than being folded into the take-home.
                 */}
                {payout.incomes.map((income, index) => {
                    const delta = income.actual - income.planned;

                    return (
                        <div
                            key={income.id ?? index}
                            className="flex flex-wrap items-center justify-between gap-3 pb-3"
                        >
                            <Label
                                htmlFor={`income-${payout.key}-${index}`}
                                className="text-sm font-medium text-muted-foreground"
                            >
                                {income.source === 'paycheck'
                                    ? 'Take-home'
                                    : income.label}
                            </Label>
                            <div className="flex items-center gap-2">
                                <Delta amount={delta} favourable={delta >= 0} />
                                <AmountInput
                                    id={`income-${payout.key}-${index}`}
                                    data-test={`payout-income-${payout.key}-${index}`}
                                    value={income.actual}
                                    disabled={finalized}
                                    onValueChange={(actual) =>
                                        update(
                                            withActualIncome(
                                                payout,
                                                index,
                                                actual,
                                            ),
                                        )
                                    }
                                    className="w-32"
                                />
                            </div>
                        </div>
                    );
                })}

                <dl className="divide-y divide-border border-t border-border">
                    {payout.lines.map((line, index) => {
                        const delta = line.actual - line.planned;

                        return (
                            <div
                                key={line.id ?? index}
                                className="flex flex-wrap items-center justify-between gap-3 py-2"
                            >
                                <dt className="min-w-0">
                                    <span className="block truncate text-sm">
                                        {line.name}
                                    </span>
                                    {line.isUnplanned ? (
                                        <span className="mt-0.5 inline-flex rounded-full bg-amber/10 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber">
                                            Unplanned
                                        </span>
                                    ) : (
                                        <span className="block text-sm text-muted-foreground tabular-nums">
                                            {formatPeso(line.planned)} planned
                                        </span>
                                    )}
                                </dt>
                                <dd className="flex shrink-0 items-center gap-2">
                                    <Delta
                                        amount={delta}
                                        favourable={delta <= 0}
                                    />
                                    <AmountInput
                                        label={`${line.name} actual`}
                                        data-test={`payout-line-${payout.key}-${index}`}
                                        value={line.actual}
                                        disabled={finalized}
                                        onValueChange={(actual) =>
                                            update(
                                                withActualLine(
                                                    payout,
                                                    index,
                                                    actual,
                                                ),
                                            )
                                        }
                                        className="w-32"
                                    />
                                    {/*
                                     * Only an unplanned line may go. A planned
                                     * one is the forecast this payday opened
                                     * with, and dropping it would leave the
                                     * actual beside it with nothing to answer to.
                                     */}
                                    {line.isUnplanned && !finalized && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            data-test={`payout-remove-line-${payout.key}-${index}`}
                                            aria-label={`Remove ${line.name}`}
                                            onClick={() =>
                                                update(
                                                    withoutLine(payout, index),
                                                )
                                            }
                                            className="text-muted-foreground"
                                        >
                                            <X aria-hidden />
                                        </Button>
                                    )}
                                </dd>
                            </div>
                        );
                    })}
                </dl>

                {payout.lines.length === 0 && (
                    <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                        Nothing was planned against this paycheck.
                    </p>
                )}

                {!finalized && (
                    <AddLine
                        payout={payout}
                        onAdd={(line) => update(withExtraLine(payout, line))}
                    />
                )}
            </div>

            <div
                className={cn(
                    'flex flex-wrap items-center justify-between gap-4 px-5 py-4',
                    over ? 'bg-goal-behind/10' : 'bg-goal-met/10',
                )}
            >
                <div>
                    <p
                        data-test={`payout-left-${payout.key}`}
                        className="text-2xl font-semibold tracking-tight tabular-nums"
                    >
                        {over ? '−' : ''}
                        {formatPeso(left)}
                    </p>
                    <p
                        data-test={`payout-variance-${payout.key}`}
                        className="text-sm text-foreground/70 tabular-nums"
                    >
                        {over ? 'over' : 'left'} · {summary(payout)}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {isDirty && (
                        <Button
                            variant="secondary"
                            size="sm"
                            data-test={`payout-save-${payout.key}`}
                            onClick={() => save()}
                        >
                            Save
                        </Button>
                    )}

                    <Button
                        variant={finalized ? 'outline' : 'default'}
                        size="sm"
                        data-test={`payout-toggle-${payout.key}`}
                        onClick={toggleStatus}
                    >
                        {finalized ? (
                            'Reopen'
                        ) : (
                            <>
                                <Check aria-hidden />
                                Finalize
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export default function Payouts() {
    const plan = useStoredBudgetPlan();
    /**
     * Newest first, and only paydays that have actually been: the daily
     * `payouts:open` command opens them against the server's clock, which is the
     * one a browser cannot move. Nothing is worked out here.
     */
    const payouts = useStoredPayouts();
    const [openId, setOpenId] = useState<number | null>(null);

    const pending = payouts.filter((payout) => !isFinalized(payout)).length;

    /**
     * The newest payday is open to begin with, since that is the one you came to
     * settle. Anchored to the newest rather than the newest *pending* so that
     * finalizing it does not pull the card out from under you.
     */
    const activeId = openId ?? payouts[0]?.id ?? null;

    return (
        <>
            <Head title="Payouts" />

            <div className="flex w-full flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Payouts
                        </h1>
                        <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            Each payday, filled in from your plan. Fix what came
                            out differently, then finalize it.
                        </p>
                    </div>

                    {payouts.length > 0 && (
                        <p
                            data-test="payouts-pending"
                            className="text-sm tabular-nums"
                        >
                            {pending === 0 ? (
                                <span className="text-muted-foreground">
                                    All reviewed
                                </span>
                            ) : (
                                <>
                                    <span className="font-semibold">
                                        {pending}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {' '}
                                        awaiting review
                                    </span>
                                </>
                            )}
                        </p>
                    )}
                </header>

                {payouts.length === 0 ? (
                    <Card>
                        <CardContent>
                            <EmptyPanel
                                data-test="payouts-empty"
                                art="wallet"
                                title={
                                    plan === null
                                        ? 'No budget plan saved yet'
                                        : 'No payday has come round yet'
                                }
                                action={
                                    plan === null
                                        ? {
                                              label: 'Build your plan',
                                              href: financeRoute(),
                                          }
                                        : undefined
                                }
                            >
                                {plan === null
                                    ? 'Build one and each payday shows up here to review.'
                                    : 'Each payday on your plan opens here once its date arrives.'}
                            </EmptyPanel>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-2">
                        {payouts.map((payout) =>
                            payout.id === activeId ? (
                                <PayoutDetail key={payout.id} payout={payout} />
                            ) : (
                                <PayoutRow
                                    key={payout.id}
                                    payout={payout}
                                    onOpen={() => setOpenId(payout.id)}
                                />
                            ),
                        )}
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" asChild size="sm">
                        <Link href={financeRoute()}>Edit the plan</Link>
                    </Button>
                    <Button variant="ghost" asChild size="sm">
                        <Link href={dashboard()}>Back to dashboard</Link>
                    </Button>
                </div>
            </div>
        </>
    );
}

Payouts.layout = {
    breadcrumbs: [
        {
            title: 'Payouts',
            href: payoutsRoute(),
        },
    ],
};
