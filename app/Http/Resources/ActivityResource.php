<?php

namespace App\Http\Resources;

use App\Concerns\ConvertsMoney;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One row of the activity log, in the shape the page reads.
 *
 * Wraps a plain row from ActivityLog rather than a model, because an activity is
 * a payday's income or one of its lines seen from the outside, not something the
 * database holds on its own. The peso crossing still belongs here — see
 * ConvertsMoney. The sign is already on the figure: money in is positive, money
 * out negative, and dividing by a hundred leaves that alone.
 *
 * @property-read array{key: string, date: string, title: string, category: string, payday: string, amount: int, isUnplanned: bool, status: string} $resource
 */
class ActivityResource extends JsonResource
{
    use ConvertsMoney;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            /** `line-12`. Stable across reloads, so React can key a row. */
            'key' => $this->resource['key'],
            /** `2026-07-31`. The client names the day; the server dates it. */
            'date' => $this->resource['date'],
            'title' => $this->resource['title'],
            /** `Payables`, `Allowance`, `Savings`, or `Income`. */
            'category' => $this->resource['category'],
            'payday' => $this->resource['payday'],
            'amount' => $this->toPesos($this->resource['amount']),
            /** Spending the plan never saw coming, which the page marks. */
            'isUnplanned' => $this->resource['isUnplanned'],
            /** `pending` or `finalized`. The page has the words for those. */
            'status' => $this->resource['status'],
        ];
    }
}
