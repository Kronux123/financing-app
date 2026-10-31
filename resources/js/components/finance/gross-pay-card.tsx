import { AmountInput } from '@/components/finance/amount-input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
 * The figures are the server's — this card only lays them out. While a fresh
 * breakdown is on its way the last one stays up, dimmed, so the numbers never
 * blank out between keystrokes.
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
        <Card data-test="gross-pay" className="gap-4">
            <CardHeader className="gap-1.5">
                <Label htmlFor="gross-monthly">Gross monthly pay</Label>
                <AmountInput
                    id="gross-monthly"
                    data-test="gross-monthly"
                    value={gross}
                    onValueChange={onGrossChange}
                />
                <p className="text-xs text-muted-foreground">
                    Your basic pay for a regular month, before anything is taken
                    off.
                </p>
            </CardHeader>

            {deductions && (
                <CardContent aria-busy={!isCurrent} className="space-y-3">
                    {/*
                     * Dimmed with a colour step rather than opacity: a part-faded
                     * block drops muted text under the contrast floor — see the
                     * note in .ai/rules/js.md.
                     */}
                    <dl
                        className={cn(
                            'divide-y divide-border rounded-lg border border-border text-sm transition-colors',
                            !isCurrent && 'bg-muted/40',
                        )}
                    >
                        {rows.map((row) => (
                            <div
                                key={row.key}
                                className="flex items-baseline justify-between gap-4 px-3 py-2"
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
                        <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
                            <dt className="font-medium">Take-home</dt>
                            <dd
                                data-test="gross-take-home"
                                className="text-base font-semibold tabular-nums"
                            >
                                {formatPesoExact(deductions.takeHome)}
                            </dd>
                        </div>
                    </dl>

                    <p className="text-xs text-muted-foreground">
                        An estimate on the {deductions.effectiveYear} rates.
                        {cadence === 'semi-monthly' &&
                            ' Tax is split across both paychecks; SSS, PhilHealth and Pag-IBIG come off the end of the month.'}{' '}
                        Correct any payday that comes out different on the
                        payouts page.
                    </p>
                </CardContent>
            )}
        </Card>
    );
}
