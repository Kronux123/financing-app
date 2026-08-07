<?php

namespace App\Enums;

enum IncomeSource: string
{
    /** The paycheck the plan expected. Every payout has exactly one. */
    case Paycheck = 'paycheck';
    case Bonus = 'bonus';
    case ThirteenthMonth = 'thirteenth_month';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Paycheck => 'Paycheck',
            self::Bonus => 'Bonus',
            self::ThirteenthMonth => '13th month',
            self::Other => 'Other',
        };
    }

    /**
     * Whether the plan forecasts this. Only the paycheck is planned — a bonus
     * arrives or it does not, and lands on the payout with nothing expected.
     */
    public function isPlanned(): bool
    {
        return $this === self::Paycheck;
    }
}
