<?php

/*
|--------------------------------------------------------------------------
| Philippine statutory deductions
|--------------------------------------------------------------------------
|
| What comes off a monthly gross before it reaches the employee: the three
| mandatory contributions, then withholding tax on what is left. Only the
| employee's share is here — the employer's never touches the paycheck.
|
| These move by law, not by month: SSS stepped up yearly to 2025, PhilHealth
| reached 5% in 2024, and Pag-IBIG doubled its cap the same year. When one
| changes, change it here and bump `effective_year`. Amounts are pesos, the
| way the agencies publish them; StatutoryDeductions works in centavos.
|
| Figures are as published for 2026. Check them against the agencies' own
| tables before relying on them — employers also differ in what they count
| as pay, so the result is an estimate of a regular month.
|
*/

return [

    'effective_year' => 2026,

    /*
     * 5% of the Monthly Salary Credit. Pay is placed in a ₱500 bracket, and
     * the bracket's credit is what the rate applies to — not the pay itself.
     */
    'sss' => [
        'employee_rate' => 0.05,
        'min_credit' => 5_000,
        'max_credit' => 35_000,
        'credit_step' => 500,
    ],

    /** Half of the 5% premium, on pay held between the floor and the ceiling. */
    'philhealth' => [
        'employee_rate' => 0.025,
        'floor' => 10_000,
        'ceiling' => 100_000,
    ],

    /** 1% at or below the low-pay line, 2% above it, on pay capped at the ceiling. */
    'pagibig' => [
        'low_pay_line' => 1_500,
        'low_pay_rate' => 0.01,
        'employee_rate' => 0.02,
        'ceiling' => 10_000,
    ],

    /*
     * BIR monthly withholding on compensation (TRAIN law, RR 11-2018 Annex E),
     * in effect since 2023. Each band taxes what is over `over` at `rate`, on
     * top of a fixed `base`. Listed lowest first; the highest band that taxable
     * pay exceeds is the one that applies.
     */
    'withholding' => [
        ['over' => 0, 'base' => 0, 'rate' => 0.0],
        ['over' => 20_833, 'base' => 0, 'rate' => 0.15],
        ['over' => 33_333, 'base' => 1_875, 'rate' => 0.20],
        ['over' => 66_667, 'base' => 8_541.80, 'rate' => 0.25],
        ['over' => 166_667, 'base' => 33_541.80, 'rate' => 0.30],
        ['over' => 666_667, 'base' => 183_541.80, 'rate' => 0.35],
    ],

];
