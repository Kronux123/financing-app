import { AmountInput } from '@/components/finance/amount-input';
import { Label } from '@/components/ui/label';
import type { PayCadence } from '@/lib/budget';
import { formatPesoExact } from '@/lib/currency';
import type { Deductions } from '@/lib/deductions';
import { cn } from '@/lib/utils';

type GrossPayCardProps = {
    gross: number;
    cadence: PayCadence;
    deductions: Deductions | null;
    /** False while a newer gross is still being worked out. */
    isCurrent: boolean;
    onGrossChange: (gross: number) => void;
};

/**
 * Pay before deductions, and what comes off it on the way to take-home.
 *
 * Sits inside the pay card rather than in a card of its own: it is a detail of
 * how you get paid, not a separate thing to plan. The input and the breakdown
 * share a row on wider screens so the figures stay next to the field they come
 * from instead of being pushed to the far edge.
 *
 * The figures are the server's — this only lays them out. While a fresh
 * breakdown is on its way the last one stays up, so nothing blanks out between
 * keystrokes.
 */
export function GrossPayCard({
    gross,
    cadence,
    deductions,
    isCurrent,
    onGrossChange,
}: GrossPayCardProps) {
    const rows = deductions
        ? [
              { key: 'sss', label: 'SSS', value: deductions.sss },
              {
                  key: 'philhealth',
                  label: 'PhilHealth',
                  value: deductions.philhealth,
              },
              { key: 'pagibig', label: 'Pag-IBIG', value: deductions.pagibig },
              { key: 'tax', label: 'Withholding tax', value: deductions.tax },
          ]
        : [];

    return (
        <div
            data-test="gross-pay"
            className="grid gap-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]"
        >
            <div className="grid content-start gap-1.5">
                <Label htmlFor="gross-monthly">Gross monthly pay</Label>
                <AmountInput
                    id="gross-monthly"
                    data-test="gross-monthly"
                    value={gross}
                    onValueChange={onGrossChange}
                />
                <p className="text-sm text-muted-foreground">
                    Basic pay for a regular month, before anything comes off.
                </p>
            </div>

            {deductions && (
                <div aria-busy={!isCurrent} className="max-w-md space-y-3">
                    {/*
                     * Dimmed with a colour step rather than opacity: a part-faded
                     * block drops muted text under the contrast floor — see the
                     * note in .ai/rules/js.md.
                     */}
                    <dl
                        className={cn(
                            'rounded-lg bg-muted/60 px-4 py-1 text-sm transition-colors',
                            !isCurrent && 'bg-muted',
                        )}
                    >
                        {rows.map((row) => (
                            <div
                                key={row.key}
                                className="flex items-baseline justify-between gap-4 py-1.5"
                            >
                                <dt className="text-muted-foreground">
                                    {row.label}
                                </dt>
                                <dd
                                    data-test={`deduction-${row.key}`}
                                    className="tabular-nums"
                                >
                                    −{formatPesoExact(row.value)}
                                </dd>
                            </div>
                        ))}
                        <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border py-2.5">
                            <dt className="font-semibold">Take-home</dt>
                            <dd
                                data-test="gross-take-home"
                                className="text-base font-semibold text-jade tabular-nums"
                            >
                                {formatPesoExact(deductions.takeHome)}
                            </dd>
                        </div>
                    </dl>

                    <p className="text-sm text-muted-foreground">
                        Estimated on the {deductions.effectiveYear} rates.
                        {cadence === 'semi-monthly' &&
                            ' Tax is split across both paychecks; SSS, PhilHealth and Pag-IBIG come off the end of the month.'}{' '}
                        If a payday comes out different, correct it on the
                        payouts page.
                    </p>
                </div>
            )}
        </div>
    );
}
