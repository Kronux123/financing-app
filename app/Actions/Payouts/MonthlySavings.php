<?php

namespace App\Actions\Payouts;

use App\Enums\ExpenseGroup;
use App\Models\Payout;
use App\Models\PayoutLine;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * What each month actually put by, read off the paydays that have been settled.
 *
 * Saved is income less what went out on living costs, rather than the savings
 * lines on their own. A paycheck set to save its remainder sweeps whatever is
 * left over, and that line is worked out rather than stored — it never reaches a
 * payout — so counting savings lines alone would report far less than was really
 * put by. Taking it from the other end catches both.
 *
 * Only finalized paydays count. A pending one still carries the figures the plan
 * gave it when it opened, and a forecast presented as history is worse than no
 * history at all.
 */
class MonthlySavings
{
    /**
     * Oldest month first. Months with no finalized payday are absent rather than
     * zero — nothing was recorded, which is not the same as nothing was saved.
     *
     * @return Collection<int, array{month: string, saved: int}>
     */
    public function handle(User $user): Collection
    {
        return $user->payouts()
            ->finalized()
            ->with(['incomes', 'lines'])
            // reorder(), not orderBy(): the relation is newest-first, and a
            // second clause would only ever break its ties.
            ->reorder('paid_on')
            ->get()
            ->groupBy(fn (Payout $payout): string => $payout->paid_on->format('Y-m'))
            ->map(fn (Collection $paydays, string $month): array => [
                'month' => $month,
                /** Every payday in the month, so semi-monthly pay adds up. */
                'saved' => $paydays->sum($this->saved(...)),
            ])
            ->values();
    }

    /** Centavos. Negative when a month spent more than it brought in. */
    private function saved(Payout $payout): int
    {
        $livingCosts = $payout->lines
            ->filter(fn (PayoutLine $line): bool => in_array(
                $line->group,
                ExpenseGroup::essentials(),
                strict: true,
            ))
            ->sum('actual');

        return $payout->actualIncome() - $livingCosts;
    }
}
