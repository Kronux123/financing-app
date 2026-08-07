<?php

namespace App\Concerns;

use App\Enums\ExpenseGroup;
use App\Enums\PayCadence;
use App\Models\BudgetPlan;
use Illuminate\Validation\Rule;

trait BudgetPlanValidationRules
{
    /**
     * The plan arrives as a whole document, so these rules describe the whole
     * of it rather than one field at a time.
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
            'months_of_cover' => ['required', 'integer', 'min:1', 'max:24'],
            'emergency_fund_balance' => ['required', ...$this->amountRules()],
            'savings_pot_balance' => ['required', ...$this->amountRules()],

            'paychecks' => ['required', 'array', 'min:1', 'max:2'],
            'paychecks.*.key' => ['required', 'string', 'max:20', 'distinct'],
            'paychecks.*.label' => ['required', 'string', 'max:255'],
            'paychecks.*.day_of_month' => ['nullable', 'integer', 'min:1', 'max:31'],
            'paychecks.*.amount' => ['required', ...$this->amountRules()],
            'paychecks.*.saves_remainder' => ['required', 'boolean'],

            'items' => ['present', 'array', 'max:200'],
            'items.*.id' => [
                'nullable',
                'integer',
                Rule::exists('expense_items', 'id')->where(
                    'budget_plan_id',
                    $plan?->id ?? 0,
                ),
            ],
            /** Items point at a paycheck by key: the client has no ids for new ones. */
            'items.*.paycheck_key' => ['required', 'string', 'in_array:paychecks.*.key'],
            'items.*.group' => ['required', Rule::enum(ExpenseGroup::class)],
            'items.*.name' => ['nullable', 'string', 'max:255'],
            'items.*.amount' => ['required', ...$this->amountRules()],
            'items.*.started_on' => ['nullable', 'date'],
            'items.*.ends_on' => ['nullable', 'date', 'after_or_equal:items.*.started_on'],
            'items.*.is_debt' => ['required', 'boolean'],
        ];
    }

    /**
     * Money is centavos, so every figure is a whole number. The ceiling keeps a
     * typo well inside the unsigned bigint the column holds.
     *
     * @return array<int, string>
     */
    private function amountRules(): array
    {
        return ['integer', 'min:0', 'max:999999999999'];
    }
}
