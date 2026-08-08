<?php

namespace App\Http\Resources;

use App\Concerns\ConvertsMoney;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One month of saving, in the shape the charts read.
 *
 * Wraps a plain row from MonthlySavings rather than a model, because a month is
 * something the ledger adds up rather than something the database holds. The
 * peso crossing still belongs here — see ConvertsMoney.
 *
 * @property-read array{month: string, saved: int} $resource
 */
class MonthlySavingsResource extends JsonResource
{
    use ConvertsMoney;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            /** `2026-07`. The client names the month; the server dates it. */
            'month' => $this->resource['month'],
            'saved' => $this->toPesos($this->resource['saved']),
        ];
    }
}
