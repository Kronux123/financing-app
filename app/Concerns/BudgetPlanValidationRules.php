<?php

namespace App\Concerns;

use App\Enums\ExpenseGroup;
use App\Enums\PayCadence;
use App\Models\BudgetPlan;
use Illuminate\Validation\Rule;

trait BudgetPlanValidationRules
{
    /**
     * The plan arrives in the same shape it was sent out in — see
     * BudgetPlanResource, which is the other half of this contract.
     *
     * @param  BudgetPlan|null  $plan  The plan being replaced, if there is one.
     *                                 Row ids are checked against it so an id
     *                                 belonging to somebody else cannot be
     *                                 borrowed to edit their budget.
     * @return array<string, mixed>
     */
    protected function budgetPlanRules(?BudgetPlan $plan): array
    {
        return [
            'cadence' => ['required', Rule::enum(PayCadence::class)],
            'emergencyFund.monthsOfCover' => ['required', 'integer', 'min:1', 'max:24'],
            'emergencyFund.balance' => ['required', ...$this->amountRules()],
            'savingsPot.balance' => ['required', ...$this->amountRules()],

            'paychecks' => ['required', 'array', 'min:1', 'max:2'],
            'paychecks.*.id' => ['required', 'string', 'max:20', 'distinct'],
            'paychecks.*.label' => ['required', 'string', 'max:255'],
            /** Null once `last` has been normalised — the day that varies. */
            'paychecks.*.dayOfMonth' => ['nullable', 'integer', 'min:1', 'max:31'],
            'paychecks.*.amount' => ['required', ...$this->amountRules()],
            /** Optional on the page's type, so an absent key means false. */
            'paychecks.*.savesRemainder' => ['nullable', 'boolean'],

            'items' => ['present', 'array', 'max:200'],
            /**
             * Null for a row added on the page and not yet saved. A number has
             * to be a row of yours.
             */
            'items.*.id' => [
                'nullable',
                'integer',
                Rule::exists('expense_items', 'id')->where(
                    'budget_plan_id',
                    $plan?->id ?? 0,
                ),
            ],
            'items.*.paycheckId' => ['required', 'string', 'in_array:paychecks.*.id'],
            'items.*.group' => ['required', Rule::enum(ExpenseGroup::class)],
            'items.*.name' => ['nullable', 'string', 'max:255'],
            'items.*.amount' => ['required', ...$this->amountRules()],
            'items.*.startedOn' => ['nullable', 'date'],
            'items.*.endsOn' => ['nullable', 'date', 'after_or_equal:items.*.startedOn'],
            'items.*.isDebt' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Pesos on the wire, and they may carry centavos. The ceiling keeps a typo
     * well inside the column that holds it once multiplied up.
     *
     * @return array<int, string>
     */
    private function amountRules(): array
    {
        return ['numeric', 'min:0', 'max:9999999999'];
    }
}
