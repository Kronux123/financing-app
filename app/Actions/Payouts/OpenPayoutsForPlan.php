<?php

namespace App\Actions\Payouts;

use App\Enums\IncomeSource;
use App\Enums\PayoutStatus;
use App\Models\BudgetPlan;
use App\Models\Paycheck;
use App\Models\Payout;
use Carbon\CarbonInterface;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Opens a pending record for every payday that has been and has none.
 *
 * This is where the snapshot happens. A payout copies the plan as it stands the
 * moment the payday comes round, and never looks at it again — which is what
 * makes it a record rather than a second view of the forecast.
 */
class OpenPayoutsForPlan
{
    /**
     * @param  int  $monthsBack  How far to catch up. One month covers a daily
     *                           run; more is for a job that has been down.
     * @return int The number opened.
     */
    public function handle(BudgetPlan $plan, CarbonInterface $today, int $monthsBack = 1): int
    {
        $plan->loadMissing(['paychecks', 'expenseItems']);

        $opened = 0;

        foreach ($this->paydaysDue($plan, $today, $monthsBack) as [$paycheck, $paidOn]) {
            $opened += $this->open($plan, $paycheck, $paidOn) ? 1 : 0;
        }

        return $opened;
    }

    /**
     * Every payday in the window that has already happened.
     *
     * Paydays before the plan existed are left alone: the app has nothing to say
     * about a month it was not around for, and inventing records for them would
     * be inventing history.
     *
     * @return array<int, array{0: Paycheck, 1: CarbonInterface}>
     */
    private function paydaysDue(BudgetPlan $plan, CarbonInterface $today, int $monthsBack): array
    {
        $due = [];

        for ($back = 0; $back <= $monthsBack; $back++) {
            $month = $today->copy()->startOfMonth()->subMonths($back);

            foreach ($plan->paychecks as $paycheck) {
                $paidOn = $paycheck->payday($month);

                if ($paidOn->greaterThan($today) || $paidOn->lessThan($plan->created_at)) {
                    continue;
                }

                $due[] = [$paycheck, $paidOn];
            }
        }

        return $due;
    }

    /** False when this payday already has a record. */
    private function open(BudgetPlan $plan, Paycheck $paycheck, CarbonInterface $paidOn): bool
    {
        /*
         * Trashed records count. A payday you deleted was a decision, and the
         * unique key covers it too — reopening it would fail the insert.
         */
        $alreadyOpen = Payout::withTrashed()
            ->where('user_id', $plan->user_id)
            // whereDate, not where: the date cast stores midnight alongside the
            // day, so comparing against a bare Y-m-d never matches.
            ->whereDate('paid_on', $paidOn->toDateString())
            ->where('paycheck_key', $paycheck->key)
            ->exists();

        if ($alreadyOpen) {
            return false;
        }

        try {
            $this->create($plan, $paycheck, $paidOn);
        } catch (UniqueConstraintViolationException) {
            /*
             * Paydays open on page loads as well as from the scheduler, so two
             * of them can pass the check above together. The loser lands here,
             * its transaction rolled back, and the payday is open either way.
             */
            return false;
        }

        return true;
    }

    private function create(BudgetPlan $plan, Paycheck $paycheck, CarbonInterface $paidOn): void
    {
        DB::transaction(function () use ($plan, $paycheck, $paidOn): void {
            $payout = new Payout;

            $payout->forceFill([
                'user_id' => $plan->user_id,
                'paycheck_key' => $paycheck->key,
                'paycheck_label' => $paycheck->label,
                'paid_on' => $paidOn->toDateString(),
                'status' => PayoutStatus::Pending,
            ])->save();

            $payout->incomes()->create([
                'source' => IncomeSource::Paycheck,
                'label' => $paycheck->label,
                'planned' => $paycheck->amount,
                'actual' => $paycheck->amount,
                'position' => 0,
            ]);

            $this->copyLines($plan, $paycheck, $payout);
        });
    }

    /**
     * Actuals start equal to the plan, so a payday that went as intended needs
     * no editing before it is finalized.
     */
    private function copyLines(BudgetPlan $plan, Paycheck $paycheck, Payout $payout): void
    {
        $plan->expenseItems
            ->where('paycheck_id', $paycheck->id)
            ->values()
            ->each(function ($item, int $position) use ($payout): void {
                $line = $payout->lines()->make([
                    'group' => $item->group,
                    'name' => $item->name ?? $item->group->label(),
                    'planned' => $item->amount,
                    'actual' => $item->amount,
                    'position' => $position,
                ]);

                $line->expense_item_id = $item->id;
                $line->save();
            });
    }
}
