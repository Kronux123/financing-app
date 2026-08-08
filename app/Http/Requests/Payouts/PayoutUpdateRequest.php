<?php

namespace App\Http\Requests\Payouts;

use App\Concerns\ConvertsMoney;
use App\Enums\ExpenseGroup;
use App\Enums\IncomeSource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PayoutUpdateRequest extends FormRequest
{
    use ConvertsMoney;

    /**
     * A payout is corrected as one document, the way it is reviewed.
     *
     * `planned` is deliberately not accepted on either side. It is what the plan
     * said at the moment the payday was opened, and a record of the forecast is
     * worth nothing if the forecast can be edited afterwards. Only `actual`
     * moves; a row added by hand gets a planned of zero.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $payout = $this->route('payout');

        return [
            'incomes' => ['present', 'array', 'max:20'],
            'incomes.*.id' => [
                'nullable',
                'integer',
                Rule::exists('payout_incomes', 'id')->where('payout_id', $payout->id),
            ],
            'incomes.*.source' => ['required', Rule::enum(IncomeSource::class)],
            'incomes.*.label' => ['required', 'string', 'max:255'],
            'incomes.*.actual' => ['required', ...$this->amountRules()],

            'lines' => ['present', 'array', 'max:200'],
            'lines.*.id' => [
                'nullable',
                'integer',
                Rule::exists('payout_lines', 'id')->where('payout_id', $payout->id),
            ],
            'lines.*.group' => ['required', Rule::enum(ExpenseGroup::class)],
            'lines.*.name' => ['required', 'string', 'max:255'],
            'lines.*.actual' => ['required', ...$this->amountRules()],
        ];
    }

    /**
     * The record as the action wants it: centavos, and named for the columns.
     *
     * `planned` never appears, on the way in or out of here. It is what the plan
     * said when the payday was opened, and a record of the forecast is worth
     * nothing if the forecast can be edited afterwards.
     *
     * @return array<string, mixed>
     */
    public function payoutData(): array
    {
        $data = $this->validated();

        return [
            'incomes' => array_map(fn (array $income): array => [
                'id' => $income['id'] ?? null,
                'source' => $income['source'],
                'label' => $income['label'],
                'actual' => $this->toCentavos($income['actual']),
            ], $data['incomes']),
            'lines' => array_map(fn (array $line): array => [
                'id' => $line['id'] ?? null,
                'group' => $line['group'],
                'name' => $line['name'],
                'actual' => $this->toCentavos($line['actual']),
            ], $data['lines']),
        ];
    }

    /**
     * Pesos on the wire, and they may carry centavos. Matches the plan's rules,
     * because the same input control types both figures.
     *
     * @return array<int, string>
     */
    private function amountRules(): array
    {
        return ['numeric', 'min:0', 'max:9999999999'];
    }
}
