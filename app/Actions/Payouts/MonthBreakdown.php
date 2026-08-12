<?php

namespace App\Actions\Payouts;

use App\Enums\ExpenseGroup;
use App\Models\Payout;
use App\Models\User;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * A month's saving taken apart, for the sheet and the pdf to be written from.
 *
 * The calendar shows one figure per month. This is the same figure with its
 * working shown: every settled payday in the period, the income rows that fed it
 * and the lines that spent it, in the order the ledger holds them.
 *
 * `saved` is asked of MonthlySavings rather than worked out again here. A
 * breakdown that disagreed with the tile it was downloaded from would be worse
 * than no breakdown at all, and income-less-living-costs has one home.
 *
 * Finalized paydays only, for the same reason MonthlySavings drops the pending
 * ones: a pending payday still carries the figures the plan gave it when it
 * opened, and an export is exactly the sort of document somebody later reads
 * back as fact.
 */
class MonthBreakdown
{
    public function __construct(private readonly MonthlySavings $monthlySavings) {}

    /**
     * One entry per month that has something in it, oldest first. Pass a month
     * for a single one, leave it out for the whole year.
     *
     * An empty collection means there is nothing to export rather than a month
     * of zeroes — the caller turns that into a 404.
     *
     * @return Collection<int, array{month: string, saved: int, income: int, spend: int, allocation: list<array{key: string, label: string, amount: int, share: float}>, overspent: bool, paydays: Collection<int, Payout>}>
     */
    public function handle(User $user, int $year, ?int $month = null): Collection
    {
        return $user->payouts()
            ->finalized()
            ->with(['incomes', 'lines'])
            ->whereYear('paid_on', $year)
            ->when(
                $month !== null,
                fn (Builder $query): Builder => $query->whereMonth('paid_on', $month),
            )
            // reorder(), not orderBy(): the relation is newest-first, and a
            // second clause would only ever break its ties.
            ->reorder('paid_on')
            ->get()
            ->groupBy(fn (Payout $payout): string => $payout->paid_on->format('Y-m'))
            ->map(function (Collection $paydays, string $month): array {
                /**
                 * Named and annotated rather than mapped inline: groupBy() widens
                 * its groups to mixed, and these models travel on into the
                 * resource, which needs to know what they are.
                 *
                 * @var Collection<int, Payout> $settled
                 */
                $settled = $paydays->values();

                $saved = $settled->sum($this->monthlySavings->savedOn(...));
                /** Both sides of the month, so the document can be checked. */
                $income = $settled->sum(fn (Payout $payday): int => $payday->actualIncome());

                return [
                    'month' => $month,
                    'saved' => $saved,
                    'income' => $income,
                    'spend' => $settled->sum(fn (Payout $payday): int => $payday->actualSpend()),
                    'allocation' => $this->allocation($settled, $income, $saved),
                    /** A month that outran its income cannot be drawn as a whole. */
                    'overspent' => $saved < 0,
                    'paydays' => $settled,
                ];
            })
            ->values();
    }

    /**
     * Where the month's income went: living costs, then what was left of it.
     *
     * Three parts that add up to the income exactly, because saving is defined as
     * what the living costs did not take. Money earmarked as savings is inside the
     * saved part rather than beside it — a fourth segment for it would count it
     * twice and the bar would overrun its own total.
     *
     * The shares are worked out here rather than in the document, so the one place
     * that decides what a month did also decides how it is drawn. A month that
     * spent more than it earned has no whole to divide: its shares come off the
     * outgoings instead and the saved part is dropped, which is what `overspent`
     * tells the template to say out loud.
     *
     * @param  Collection<int, Payout>  $paydays
     * @return list<array{key: string, label: string, amount: int, share: float}>
     */
    private function allocation(Collection $paydays, int $income, int $saved): array
    {
        $spentOn = fn (ExpenseGroup $group): int => $paydays
            ->flatMap(fn (Payout $payday): Collection => $payday->lines)
            ->where('group', $group)
            ->sum('actual');

        $parts = [
            ['key' => 'payables', 'label' => ExpenseGroup::Payables->label(), 'amount' => $spentOn(ExpenseGroup::Payables)],
            ['key' => 'allowance', 'label' => ExpenseGroup::Allowance->label(), 'amount' => $spentOn(ExpenseGroup::Allowance)],
        ];

        if ($saved >= 0) {
            $parts[] = ['key' => 'saved', 'label' => 'Saved', 'amount' => $saved];
        }

        $whole = max(1, (int) array_sum(array_column($parts, 'amount')));

        return array_map(
            fn (array $part): array => [...$part, 'share' => $part['amount'] / $whole],
            $parts,
        );
    }
}
