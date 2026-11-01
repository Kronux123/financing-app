import { ArrowRight } from 'lucide-react';
import { AmountInput } from '@/components/finance/amount-input';
import { StatusMeter } from '@/components/finance/status-meter';
import { PixelArt } from '@/components/pixel-art';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { BudgetPlan, SavingsSplit } from '@/lib/budget';
import { coverOptions, savingsSplit } from '@/lib/budget';
import { formatPeso } from '@/lib/currency';

type SavingsCardProps = {
    plan: BudgetPlan;
    onMonthsOfCoverChange: (monthsOfCover: number) => void;
    onBalanceChange: (balance: number) => void;
    onPotBalanceChange: (balance: number) => void;
};

/**
 * States the fund can be in, in the order they are checked. Sizing comes before
 * funding: a target of zero is not a funded fund, it is a plan with nothing in
 * it yet, and saying "fully funded" there would be a lie.
 */
const statusFor = (
    target: number,
    gap: number,
): { label: string; mark: string } => {
    if (target <= 0) {
        return {
            label: 'Not sized yet',
            mark: 'bg-foreground/30',
        };
    }

    if (gap <= 0) {
        return {
            label: 'Fully funded',
            mark: 'bg-goal-met',
        };
    }

    return {
        label: 'Building',
        mark: 'bg-goal-close',
    };
};

const forecastFor = ({
    target,
    gap,
    saved,
    monthsToFill,
}: SavingsSplit): string => {
    if (target <= 0) {
        return 'Nothing to fill until the fund is sized.';
    }

    if (gap <= 0) {
        return 'Funded, so everything now lands in the pot.';
    }

    if (saved <= 0) {
        return 'Nothing is going to savings yet.';
    }

    return `Full in ${monthsToFill} ${monthsToFill === 1 ? 'month' : 'months'} at this rate.`;
};

export function SavingsCard({
    plan,
    onMonthsOfCoverChange,
    onBalanceChange,
    onPotBalanceChange,
}: SavingsCardProps) {
    const split = savingsSplit(plan);
    const { target, balance, gap, saved, toEmergency, toPot } = split;
    const status = statusFor(target, gap);
    const percent = Math.round(
        target > 0 ? Math.min(balance / target, 1) * 100 : 0,
    );

    const flow = [
        { label: 'Emergency fund', amount: toEmergency, test: 'to-emergency' },
        { label: 'Savings pot', amount: toPot, test: 'to-pot' },
    ];

    return (
        <Card className="gap-5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-base">
                    <PixelArt sprite="piggy-bank" size={32} />
                    Savings
                </CardTitle>
                <CardDescription>
                    The emergency fund fills first, then the rest goes to the
                    pot.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                <div className="grid gap-2">
                    <Label htmlFor="months-of-cover">Months of cover</Label>
                    <ToggleGroup
                        id="months-of-cover"
                        type="single"
                        variant="outline"
                        value={String(plan.emergencyFund.monthsOfCover)}
                        onValueChange={(value) => {
                            if (value) {
                                onMonthsOfCoverChange(Number(value));
                            }
                        }}
                        className="w-full sm:w-auto"
                    >
                        {coverOptions.map((months) => (
                            <ToggleGroupItem
                                key={months}
                                value={String(months)}
                                data-test={`cover-${months}`}
                                className="px-4"
                            >
                                {months} months
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="fund-balance">In the fund</Label>
                        <AmountInput
                            id="fund-balance"
                            data-test="fund-balance"
                            value={balance}
                            onValueChange={onBalanceChange}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="pot-balance">In the pot</Label>
                        <AmountInput
                            id="pot-balance"
                            data-test="pot-balance"
                            value={plan.savingsPot.balance}
                            onValueChange={onPotBalanceChange}
                        />
                    </div>
                </div>

                <p className="-mt-3 text-sm text-muted-foreground">
                    What your accounts hold today. Update these by hand.
                </p>

                {/*
                 * The balance leads and the target follows, matching the
                 * dashboard. Leading with the target read as though the figure
                 * you had just typed had been ignored.
                 */}
                <StatusMeter
                    status={status.label}
                    tone={status.mark}
                    aside={target > 0 ? `${percent}% funded` : undefined}
                    figure={
                        <p
                            data-test="fund-balance-shown"
                            className="text-2xl font-semibold tracking-tight tabular-nums"
                        >
                            {formatPeso(balance)}
                        </p>
                    }
                    note={
                        target <= 0 ? (
                            'Add payables and allowance to size the fund.'
                        ) : (
                            <>
                                of{' '}
                                <span data-test="fund-target">
                                    {formatPeso(target)}
                                </span>{' '}
                                for {plan.emergencyFund.monthsOfCover} months,{' '}
                                {formatPeso(gap)} to go
                            </>
                        )
                    }
                    percent={percent}
                    label={`Emergency fund: ${formatPeso(balance)} of ${formatPeso(target)}, ${percent} percent — ${status.label}`}
                />

                <div className="space-y-3 border-t border-border pt-5">
                    <h3 className="text-sm font-semibold">
                        Where this month&rsquo;s {formatPeso(saved)} goes
                    </h3>

                    {flow.map((step) => (
                        <div
                            key={step.label}
                            className="flex items-baseline justify-between gap-3"
                        >
                            <p className="flex items-center gap-1.5 text-sm">
                                <ArrowRight
                                    aria-hidden
                                    className="size-3.5 text-muted-foreground"
                                />
                                {step.label}
                            </p>
                            <p
                                data-test={`fund-${step.test}`}
                                className="text-sm font-medium tabular-nums"
                            >
                                {formatPeso(step.amount)}
                            </p>
                        </div>
                    ))}

                    <p
                        data-test="fund-forecast"
                        className="text-sm text-muted-foreground"
                    >
                        {forecastFor(split)}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
