import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useStoredBudgetPlan } from '@/hooks/use-budget-plan';
import type { BudgetPlan, DebtProgress } from '@/lib/budget';
import {
    debtProgress,
    monthsToDebtFree,
    totalDebtPayment,
    totalOwed,
} from '@/lib/budget';
import { formatPeso } from '@/lib/currency';
import { dashboard } from '@/routes';
import { index as debtRoute } from '@/routes/debt';
import { edit as financeRoute } from '@/routes/finance';

type Order = 'plan' | 'smallest' | 'largest';

/**
 * Smallest first is the payoff order worth following — clearing one outright is
 * what keeps people going. Plan order is the default so the list reads in the
 * same sequence as the budget it comes from.
 */
const orderOptions: { value: Order; label: string }[] = [
    { value: 'plan', label: 'Plan order' },
    { value: 'smallest', label: 'Smallest first' },
    { value: 'largest', label: 'Biggest first' },
];

const inOrder = (progress: DebtProgress[], order: Order): DebtProgress[] => {
    if (order === 'plan') {
        return progress;
    }

    const direction = order === 'smallest' ? 1 : -1;

    return [...progress].sort((a, b) => (a.owed - b.owed) * direction);
};

const monthsLabel = (months: number): string => {
    return `${months} ${months === 1 ? 'month' : 'months'}`;
};

/** What one debt row says under its name. */
const rowNote = (progress: DebtProgress): string => {
    if (progress.isOpenEnded) {
        return 'Amount unknown — give it an end date on the plan';
    }

    if (progress.months <= 0) {
        return 'Ended';
    }

    return `${monthsLabel(progress.months)} left · ends ${progress.item.endsOn}`;
};

const trackerNote = (
    owed: number,
    payment: number,
    months: number,
    hasUnknown: boolean,
): string => {
    if (owed <= 0 && !hasUnknown) {
        return 'Nothing owed. Tick Debt on a payable to track it here.';
    }

    if (hasUnknown) {
        return `${formatPeso(payment)} a month going out · some debts have no end date yet`;
    }

    return `${formatPeso(payment)} a month going out · debt-free in ${monthsLabel(months)}`;
};

const emptyPlan = (plan: BudgetPlan | null): boolean => {
    return plan === null;
};

export default function Debt() {
    const plan = useStoredBudgetPlan();
    const [order, setOrder] = useState<Order>('plan');

    /**
     * Read once per render. Every figure below is a projection off it, and none
     * of them is written anywhere, so a wrong clock costs a wrong number and
     * nothing else.
     */
    const today = new Date();

    const progress = plan ? inOrder(debtProgress(plan, today), order) : [];
    const owed = plan ? totalOwed(plan, today) : 0;
    const payment = plan ? totalDebtPayment(plan) : 0;
    const months = plan ? monthsToDebtFree(plan, today) : 0;
    const hasUnknown = progress.some((entry) => entry.isOpenEnded);

    return (
        <>
            <Head title="Debt" />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Debt
                        </h1>
                        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                            Every payable you have ticked as debt, and what is
                            left on it. Nothing is entered here — a debt is a
                            payable, so the plan is where you edit one.
                        </p>
                    </div>

                    <Button variant="secondary" size="sm" asChild>
                        <Link href={financeRoute()} data-test="edit-on-plan">
                            Edit on the plan
                        </Link>
                    </Button>
                </header>

                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground">
                            Total owed
                        </p>
                        <p
                            data-test="debt-total"
                            className="mt-1 text-4xl font-semibold tracking-tight tabular-nums"
                        >
                            {formatPeso(owed)}
                        </p>
                        <p
                            data-test="debt-free"
                            className="mt-2 text-sm text-muted-foreground tabular-nums"
                        >
                            {trackerNote(owed, payment, months, hasUnknown)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <CardTitle className="text-base">
                                    What you owe
                                </CardTitle>
                                <CardDescription>
                                    A payable already says how much is left: its
                                    payment times the payments remaining.
                                    Projections ignore interest.
                                </CardDescription>
                            </div>

                            {progress.length > 1 && (
                                <div className="grid shrink-0 gap-1.5">
                                    <Label
                                        htmlFor="debt-order"
                                        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                                    >
                                        Order
                                    </Label>
                                    <ToggleGroup
                                        id="debt-order"
                                        type="single"
                                        variant="outline"
                                        size="sm"
                                        value={order}
                                        onValueChange={(value) => {
                                            if (value) {
                                                setOrder(value as Order);
                                            }
                                        }}
                                    >
                                        {orderOptions.map((option) => (
                                            <ToggleGroupItem
                                                key={option.value}
                                                value={option.value}
                                                data-test={`order-${option.value}`}
                                                className="px-3"
                                            >
                                                {option.label}
                                            </ToggleGroupItem>
                                        ))}
                                    </ToggleGroup>
                                </div>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                        {progress.length === 0 ? (
                            <p
                                data-test="debt-empty"
                                className="rounded-lg bg-muted p-4 text-sm text-muted-foreground"
                            >
                                {emptyPlan(plan)
                                    ? 'No budget plan saved yet. Build one and tick Debt on the payables that pay off what you owe.'
                                    : 'No payables are ticked as debt. Tick one on the plan and it shows up here.'}
                            </p>
                        ) : (
                            <dl className="divide-y divide-border">
                                {progress.map((entry) => (
                                    <div
                                        key={entry.item.id}
                                        data-test="debt-row"
                                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
                                    >
                                        {/*
                                         * dt and dd sit directly inside the
                                         * row: a description list allows one
                                         * div between itself and its terms,
                                         * not two.
                                         */}
                                        <dt className="min-w-0 text-sm font-medium">
                                            <span className="block truncate">
                                                {entry.item.name || 'Unnamed'}
                                            </span>
                                            <span className="block text-xs font-normal text-muted-foreground tabular-nums">
                                                {rowNote(entry)}
                                            </span>
                                        </dt>
                                        <dd className="shrink-0 text-right">
                                            <span className="text-sm font-semibold tabular-nums">
                                                {entry.isOpenEnded
                                                    ? '—'
                                                    : formatPeso(entry.owed)}
                                            </span>
                                            <span className="block text-xs text-muted-foreground tabular-nums">
                                                {formatPeso(entry.payment)} a
                                                month
                                            </span>
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                    </CardContent>
                </Card>

                <Button
                    variant="secondary"
                    asChild
                    size="sm"
                    className="self-start"
                >
                    <Link href={dashboard()}>Back to dashboard</Link>
                </Button>
            </div>
        </>
    );
}

Debt.layout = {
    breadcrumbs: [
        {
            title: 'Debt',
            href: debtRoute(),
        },
    ],
};
