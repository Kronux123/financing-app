<?php

namespace App\Http\Resources;

use App\Concerns\ConvertsMoney;
use App\Models\Payout;
use App\Models\PayoutIncome;
use App\Models\PayoutLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A payday, in the shape the payouts page reads.
 *
 * Money is pesos here and centavos in the database — see ConvertsMoney, and
 * PayoutUpdateRequest, which is the other half of this contract.
 *
 * Every figure on a record is a copy taken when the payday was opened, so
 * nothing here is read through a relation to the plan. That is what makes it a
 * record rather than a second view of the forecast.
 *
 * @mixin Payout
 */
class PayoutResource extends JsonResource
{
    use ConvertsMoney;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            /** The row id, which is what the update and status routes bind on. */
            'id' => $this->id,
            /**
             * `2026-07-monthly`. Stable across reloads, so the page can key a
             * card and a test can name one without knowing a row id. Made of
             * characters a CSS selector can hold — a colon here reads as a
             * pseudo selector and breaks every test hook built from it.
             */
            'key' => $this->paid_on->format('Y-m').'-'.$this->paycheck_key,
            'paycheckId' => $this->paycheck_key,
            'paycheckLabel' => $this->paycheck_label,
            'paidOn' => $this->paid_on->toDateString(),
            'status' => $this->status->value,
            'incomes' => $this->incomes->map($this->income(...))->values(),
            'lines' => $this->lines->map($this->line(...))->values(),
        ];
    }

    /**
     * The paycheck, plus anything that arrived alongside it. A bonus has a
     * planned of zero, which is the honest figure for money nobody forecast.
     *
     * @return array<string, mixed>
     */
    private function income(PayoutIncome $income): array
    {
        return [
            'id' => $income->id,
            'source' => $income->source->value,
            'label' => $income->label,
            'planned' => $this->toPesos($income->planned),
            'actual' => $this->toPesos($income->actual),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function line(PayoutLine $line): array
    {
        return [
            'id' => $line->id,
            /** The group is copied onto the row, so it survives the plan. */
            'groupId' => $line->group->value,
            'name' => $line->name,
            'planned' => $this->toPesos($line->planned),
            'actual' => $this->toPesos($line->actual),
        ];
    }
}
