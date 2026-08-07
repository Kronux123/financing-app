<?php

namespace App\Http\Requests\Finance;

use App\Concerns\BudgetPlanValidationRules;
use Illuminate\Foundation\Http\FormRequest;

class BudgetPlanUpdateRequest extends FormRequest
{
    use BudgetPlanValidationRules;

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
            'items.*.paycheck_key.in_array' => 'Every expense has to be funded by one of the paychecks you sent.',
            'items.*.ends_on.after_or_equal' => 'An expense cannot finish before it started.',
        ];
    }
}
