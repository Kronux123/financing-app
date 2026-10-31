<?php

namespace App\Actions\Finance;

use App\Enums\PayCadence;

/**
 * What a Philippine monthly gross loses before it is take-home.
 *
 * SSS, PhilHealth and Pag-IBIG come off first, then withholding tax on what is
 * left. Rates live in config/payroll.php, because they move by law and should
 * move in one place. Everything here is centavos, rounded to the centavo at each
 * step the way a payslip shows it.
 *
 * This is the one copy of the maths. The budget plan saves through it, and the
 * finance page previews through it over HTTP rather than keeping a second copy
 * in TypeScript that would drift the first time a rate changed.
 */
class StatutoryDeductions
{
    /**
     * @return array{gross: int, sss: int, philhealth: int, pagibig: int, contributions: int, taxable: int, tax: int, total: int, takeHome: int}
     */
    public function handle(int $gross): array
    {
        $sss = $this->sss($gross);
        $philhealth = $this->philhealth($gross);
        $pagibig = $this->pagibig($gross);
        $contributions = $sss + $philhealth + $pagibig;

        /** Contributions are taken before tax, so they are never taxed. */
        $taxable = max(0, $gross - $contributions);
        $tax = $this->withholding($taxable);
        $total = $contributions + $tax;

        return [
            'gross' => $gross,
            'sss' => $sss,
            'philhealth' => $philhealth,
            'pagibig' => $pagibig,
            'contributions' => $contributions,
            'taxable' => $taxable,
            'tax' => $tax,
            'total' => $total,
            'takeHome' => max(0, $gross - $total),
        ];
    }

    /**
     * Take-home per paycheck, keyed as the cadence keys its paychecks.
     *
     * Semi-monthly pays half the gross on each. The month's tax is worked out on
     * the month's whole pay and withheld half from each paycheck, while SSS,
     * PhilHealth and Pag-IBIG all come off the end of the month. Any odd centavo
     * lands on the end of the month too.
     *
     * @return array<string, int>
     */
    public function paycheckAmounts(PayCadence $cadence, int $gross): array
    {
        $breakdown = $this->handle($gross);

        if ($cadence === PayCadence::Monthly) {
            return ['monthly' => $breakdown['takeHome']];
        }

        $midMonth = max(0, intdiv($gross, 2) - intdiv($breakdown['tax'], 2));

        return [
            'mid-month' => $midMonth,
            'end-month' => max(0, $breakdown['takeHome'] - $midMonth),
        ];
    }

    /**
     * Pay is placed in the nearest ₱500 bracket — ₱5,250 to ₱5,749.99 earns a
     * ₱5,500 credit — between the lowest credit and the highest.
     */
    private function sss(int $gross): int
    {
        $config = config('payroll.sss');
        $step = $this->centavos($config['credit_step']);

        $credit = intdiv($gross + intdiv($step, 2), $step) * $step;
        $credit = min(max($credit, $this->centavos($config['min_credit'])), $this->centavos($config['max_credit']));

        return (int) round($credit * $config['employee_rate']);
    }

    private function philhealth(int $gross): int
    {
        $config = config('payroll.philhealth');

        $base = min(max($gross, $this->centavos($config['floor'])), $this->centavos($config['ceiling']));

        return (int) round($base * $config['employee_rate']);
    }

    private function pagibig(int $gross): int
    {
        $config = config('payroll.pagibig');

        $rate = $gross <= $this->centavos($config['low_pay_line'])
            ? $config['low_pay_rate']
            : $config['employee_rate'];

        return (int) round(min($gross, $this->centavos($config['ceiling'])) * $rate);
    }

    private function withholding(int $taxable): int
    {
        $band = collect(config('payroll.withholding'))
            ->filter(fn (array $band): bool => $taxable > $this->centavos($band['over']))
            ->last();

        if ($band === null) {
            return 0;
        }

        $excess = $taxable - $this->centavos($band['over']);

        return (int) round($this->centavos($band['base']) + $excess * $band['rate']);
    }

    /** Config is written in pesos, the way the agencies publish it. */
    private function centavos(int|float $pesos): int
    {
        return (int) round($pesos * 100);
    }
}
