<?php

namespace App\Http\Resources;

use App\Concerns\ConvertsMoney;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A gross broken down into what comes off it, in pesos, for the finance page.
 *
 * Wraps the breakdown StatutoryDeductions returns plus the take-home each
 * paycheck gets, so the page can show the figures and fill the paychecks from
 * one response.
 *
 * @property-read array{breakdown: array<string, int>, paychecks: array<string, int>} $resource
 */
class DeductionsResource extends JsonResource
{
    use ConvertsMoney;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...array_map($this->toPesos(...), $this->resource['breakdown']),
            /** Keyed by paycheck key: `monthly`, or `mid-month` and `end-month`. */
            'paychecks' => array_map($this->toPesos(...), $this->resource['paychecks']),
            /** The year the rates are for, so the page can say so. */
            'effectiveYear' => config('payroll.effective_year'),
        ];
    }
}
