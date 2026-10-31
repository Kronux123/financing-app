<?php

namespace App\Http\Requests\Finance;

use App\Concerns\ConvertsMoney;
use App\Enums\PayCadence;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A gross the finance page wants previewed, as the user types it.
 */
class DeductionsRequest extends FormRequest
{
    use ConvertsMoney;

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'gross' => ['required', 'numeric', 'min:0', 'max:9999999999'],
            'cadence' => ['required', Rule::enum(PayCadence::class)],
        ];
    }

    /** Centavos, the way StatutoryDeductions counts. */
    public function gross(): int
    {
        return $this->toCentavos($this->validated('gross'));
    }

    public function cadence(): PayCadence
    {
        return PayCadence::from($this->validated('cadence'));
    }
}
