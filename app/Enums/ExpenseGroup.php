<?php

namespace App\Enums;

enum ExpenseGroup: string
{
    case Payables = 'payables';
    case Allowance = 'allowance';
    case Savings = 'savings';

    public function label(): string
    {
        return match ($this) {
            self::Payables => 'Payables',
            self::Allowance => 'Allowance',
            self::Savings => 'Savings',
        };
    }

    /**
     * Whether the group holds one figure per paycheck rather than named rows.
     *
     * The heading already says what the number is, so a name beside it would
     * only repeat it. Payables stays itemised — rent and electricity are
     * separate bills and each wants its own row.
     */
    public function isSingleAmount(): bool
    {
        return $this !== self::Payables;
    }

    /**
     * Groups that count toward the emergency fund target.
     *
     * Savings are excluded: money you are putting by is not a cost you would
     * still have to cover if the income stopped.
     *
     * @return array<int, self>
     */
    public static function essentials(): array
    {
        return [self::Payables, self::Allowance];
    }
}
