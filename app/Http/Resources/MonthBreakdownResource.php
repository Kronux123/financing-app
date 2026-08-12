<?php

namespace App\Http\Resources;

use App\Concerns\ConvertsMoney;
use App\Enums\ExpenseGroup;
use App\Models\Payout;
use App\Models\PayoutIncome;
use App\Models\PayoutLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * One month of the ledger in the shape the exports are written from.
 *
 * Wraps a row from MonthBreakdown rather than a model, because a month is
 * something the ledger adds up. The peso crossing belongs here as it does on
 * every other way out — see ConvertsMoney. The sheet and the pdf both read this,
 * so the two documents cannot drift apart.
 *
 * Unlike MonthlySavingsResource, this one also names the month. The pages name
 * their own months, but nothing client-side is involved in a download: the
 * server renders the document, so the server writes the heading.
 *
 * @property-read array{month: string, saved: int, income: int, spend: int, allocation: list<array{key: string, label: string, amount: int, share: float}>, overspent: bool, paydays: Collection<int, Payout>} $resource
 */
class MonthBreakdownResource extends JsonResource
{
    use ConvertsMoney;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            /** `2026-07`, as the calendar and the filenames use it. */
            'month' => $this->resource['month'],
            'label' => Carbon::createFromFormat('Y-m', $this->resource['month'])->format('F Y'),
            'saved' => $this->toPesos($this->resource['saved']),
            'income' => $this->toPesos($this->resource['income']),
            'spend' => $this->toPesos($this->resource['spend']),
            'overspent' => $this->resource['overspent'],
            /** Where the income went, for the bar the pdf draws it as. */
            'allocation' => array_map(fn (array $part): array => [
                ...$part,
                'amount' => $this->toPesos($part['amount']),
                /** Whole percent, because that is what the label prints. */
                'percent' => (int) round($part['share'] * 100),
            ], $this->resource['allocation']),
            'paydays' => $this->resource['paydays']->map($this->payday(...))->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function payday(Payout $payout): array
    {
        return [
            'label' => $payout->paycheck_label,
            'paidOn' => $payout->paid_on->toDateString(),
            'incomes' => $payout->incomes->map($this->income(...))->all(),
            'spending' => $this->spending($payout),
            'income' => $this->toPesos($payout->actualIncome()),
            'spend' => $this->toPesos($payout->actualSpend()),
            'leftOver' => $this->toPesos($payout->leftOver()),
        ];
    }

    /**
     * The payday's lines under their groups, each group carrying its own total.
     *
     * Grouped here rather than in either document, because both of them want it
     * this way and a template that grouped it itself would be a second copy of the
     * decision. Empty groups are absent: a payday with no allowance line should not
     * print a heading with a nought under it.
     *
     * @return list<array{group: string, total: float|int, lines: list<array<string, mixed>>}>
     */
    private function spending(Payout $payout): array
    {
        return collect(ExpenseGroup::cases())
            /** Walked in case order, so two paydays never disagree on it. */
            ->map(function (ExpenseGroup $group) use ($payout): ?array {
                $lines = $payout->lines->where('group', $group);

                if ($lines->isEmpty()) {
                    return null;
                }

                return [
                    'group' => $group->label(),
                    'total' => $this->toPesos((int) $lines->sum('actual')),
                    'lines' => $lines->map($this->line(...))->values()->all(),
                ];
            })
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function income(PayoutIncome $income): array
    {
        return [
            'label' => $income->label,
            /** The label, not the value: a document is read, not parsed. */
            'source' => $income->source->label(),
            'planned' => $this->toPesos($income->planned),
            'actual' => $this->toPesos($income->actual),
            'variance' => $this->toPesos($income->variance()),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function line(PayoutLine $line): array
    {
        return [
            'name' => $line->name,
            'planned' => $this->toPesos($line->planned),
            'actual' => $this->toPesos($line->actual),
            'variance' => $this->toPesos($line->variance()),
            /** Spending the plan never forecast, marked as such in both files. */
            'unplanned' => $line->isUnplanned(),
        ];
    }
}
