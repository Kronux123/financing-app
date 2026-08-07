<?php

namespace App\Actions\Payouts;

use App\Models\Payout;
use App\Models\PayoutIncome;
use App\Models\PayoutLine;
use Illuminate\Support\Facades\DB;

/**
 * Records what a payday actually did.
 *
 * Only `actual` is ever written. `planned` is the snapshot taken when the payday
 * was opened, and a record of the forecast is worth nothing if the forecast can
 * be edited afterwards — so a row added here starts at a planned of zero and
 * stays there, which is exactly what unplanned spending is.
 */
class SavePayout
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Payout $payout, array $data): Payout
    {
        return DB::transaction(function () use ($payout, $data): Payout {
            $this->syncIncomes($payout, $data['incomes']);
            $this->syncLines($payout, $data['lines']);

            return $payout->load(['incomes', 'lines']);
        });
    }

    /**
     * @param  array<int, array<string, mixed>>  $incomes
     */
    private function syncIncomes(Payout $payout, array $incomes): void
    {
        $sent = collect($incomes);
        $existing = $payout->incomes()->get()->keyBy('id');

        $payout->incomes()
            ->whereNotIn('id', $sent->pluck('id')->filter()->all())
            ->delete();

        $sent->each(function (array $row, int $position) use ($payout, $existing): void {
            $income = $existing->get($row['id'] ?? null) ?? new PayoutIncome;

            $income->fill([
                'source' => $row['source'],
                'label' => $row['label'],
                'actual' => $row['actual'],
                'position' => $position,
            ]);

            /** Money nobody forecast: a bonus, or 13th month pay. */
            if (! $income->exists) {
                $income->planned = 0;
            }

            $payout->incomes()->save($income);
        });
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     */
    private function syncLines(Payout $payout, array $lines): void
    {
        $sent = collect($lines);
        $existing = $payout->lines()->get()->keyBy('id');

        $payout->lines()
            ->whereNotIn('id', $sent->pluck('id')->filter()->all())
            ->delete();

        $sent->each(function (array $row, int $position) use ($payout, $existing): void {
            $line = $existing->get($row['id'] ?? null) ?? new PayoutLine;

            $line->fill([
                'group' => $row['group'],
                'name' => $row['name'],
                'actual' => $row['actual'],
                'position' => $position,
            ]);

            /*
             * A line added while reviewing is spending the plan never saw. It
             * has no payable behind it and nothing was expected of it.
             */
            if (! $line->exists) {
                $line->planned = 0;
                $line->expense_item_id = null;
            }

            $payout->lines()->save($line);
        });
    }
}
