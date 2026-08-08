<?php

namespace App\Http\Resources;

use App\Concerns\ConvertsMoney;
use App\Enums\ExpenseGroup;
use App\Models\BudgetPlan;
use App\Models\ExpenseItem;
use App\Models\Paycheck;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The plan, in the shape the pages already read.
 *
 * This is the whole contract between the two halves of the app, and it is
 * deliberately not the table shape. Two differences are the ones to know about:
 *
 * Money is pesos here and centavos in the database. The conversion happens on
 * this boundary and its opposite in the form request, and nowhere else — see
 * ConvertsMoney.
 *
 * Rows are grouped rather than flat, because that is how they are edited. The
 * group is a column on the row; the nesting is presentation.
 *
 * @mixin BudgetPlan
 */
class BudgetPlanResource extends JsonResource
{
    use ConvertsMoney;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'cadence' => $this->cadence->value,
            'paychecks' => $this->paychecks->map($this->paycheck(...))->values(),
            'groups' => collect(ExpenseGroup::cases())
                ->map(fn (ExpenseGroup $group): array => [
                    'id' => $group->value,
                    'name' => $group->label(),
                    'items' => $this->expenseItems
                        ->where('group', $group)
                        ->map($this->item(...))
                        ->values(),
                ])
                ->values(),
            'emergencyFund' => [
                'monthsOfCover' => $this->months_of_cover,
                'balance' => $this->toPesos($this->emergency_fund_balance),
            ],
            'savingsPot' => [
                'balance' => $this->toPesos($this->savings_pot_balance),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function paycheck(Paycheck $paycheck): array
    {
        return [
            /** The key, not the row id: it is what an item points at. */
            'id' => $paycheck->key,
            'label' => $paycheck->label,
            'dayOfMonth' => $paycheck->day_of_month ?? 'last',
            'amount' => $this->toPesos($paycheck->amount),
            'savesRemainder' => $paycheck->saves_remainder,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function item(ExpenseItem $item): array
    {
        return [
            /**
             * Sent as a string because the page also holds rows you have added
             * but not saved, which have no row id. A numeric one means a row
             * that exists; anything else is new.
             */
            'id' => (string) $item->id,
            'name' => $item->name ?? '',
            'amount' => $this->toPesos($item->amount),
            'paycheckId' => $item->paycheck->key,
            'endsOn' => $item->ends_on?->toDateString(),
            'startedOn' => $item->started_on?->toDateString(),
            'isDebt' => $item->is_debt,
        ];
    }
}
