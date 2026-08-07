<?php

namespace App\Enums;

enum PayCadence: string
{
    case Monthly = 'monthly';
    case SemiMonthly = 'semi_monthly';

    /**
     * The paychecks this cadence implies, in the order they are paid.
     *
     * Semi-monthly is the 15th and the last day — 24 a year, not the 26 that
     * fortnightly would give.
     *
     * @return array<int, array{key: string, label: string, day_of_month: int|null}>
     */
    public function paychecks(): array
    {
        return match ($this) {
            self::Monthly => [
                ['key' => 'monthly', 'label' => 'Monthly pay', 'day_of_month' => null],
            ],
            self::SemiMonthly => [
                ['key' => 'mid_month', 'label' => '15th', 'day_of_month' => 15],
                ['key' => 'end_month', 'label' => 'End of month', 'day_of_month' => null],
            ],
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Monthly => 'Monthly',
            self::SemiMonthly => 'Semi-monthly',
        };
    }
}
