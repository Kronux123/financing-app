<?php

namespace App\Http\Requests\Finance;

use App\Concerns\BudgetPlanValidationRules;
use App\Concerns\ConvertsMoney;
use Illuminate\Foundation\Http\FormRequest;

class BudgetPlanUpdateRequest extends FormRequest
{
    use BudgetPlanValidationRules, ConvertsMoney;

    /**
     * The page speaks in pesos and calls the last day of the month `last`. The
     * database speaks in centavos and calls it null. This request is where the
     * two are reconciled, and its opposite number is BudgetPlanResource.
     */
    protected function prepareForValidation(): void
    {
        $paychecks = collect($this->input('paychecks', []))
            ->map(function (array $paycheck): array {
                $paycheck['dayOfMonth'] = ($paycheck['dayOfMonth'] ?? 'last') === 'last'
                    ? null
                    : $paycheck['dayOfMonth'];

                return $paycheck;
            })
            ->all();

        $items = collect($this->input('items', []))
            ->map(function (array $item): array {
                /**
                 * A row that exists has a numeric id. Anything else was added on
                 * the page and has never been saved, so it becomes null and is
                 * created rather than matched.
                 */
                $item['id'] = isset($item['id']) && ctype_digit((string) $item['id'])
                    ? (int) $item['id']
                    : null;

                return $item;
            })
            ->all();

        $this->merge(['paychecks' => $paychecks, 'items' => $items]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // Queried, not read off the relation, which may be cached from earlier
        // in the request cycle and would scope the id check to nothing.
        return $this->budgetPlanRules($this->user()->budgetPlan()->first());
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.*.paycheckId.in_array' => 'Every expense has to be funded by one of the paychecks you sent.',
            'items.*.endsOn.after_or_equal' => 'An expense cannot finish before it started.',
        ];
    }

    /**
     * The plan as the action wants it: centavos, and named for the columns.
     *
     * @return array<string, mixed>
     */
    public function planData(): array
    {
        $data = $this->validated();

        return [
            'cadence' => $data['cadence'],
            'months_of_cover' => $data['emergencyFund']['monthsOfCover'],
            'emergency_fund_balance' => $this->toCentavos($data['emergencyFund']['balance']),
            'savings_pot_balance' => $this->toCentavos($data['savingsPot']['balance']),
            'paychecks' => array_map(fn (array $paycheck): array => [
                'key' => $paycheck['id'],
                'label' => $paycheck['label'],
                'day_of_month' => $paycheck['dayOfMonth'],
                'amount' => $this->toCentavos($paycheck['amount']),
                'saves_remainder' => $paycheck['savesRemainder'] ?? false,
            ], $data['paychecks']),
            'items' => array_map(fn (array $item): array => [
                'id' => $item['id'],
                'paycheck_key' => $item['paycheckId'],
                'group' => $item['group'],
                'name' => $item['name'] ?? null,
                'amount' => $this->toCentavos($item['amount']),
                'started_on' => $item['startedOn'] ?? null,
                'ends_on' => $item['endsOn'] ?? null,
                'is_debt' => $item['isDebt'] ?? false,
            ], $data['items']),
        ];
    }
}
