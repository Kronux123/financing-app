<?php

namespace App\Actions\Finance;

use App\Models\BudgetPlan;
use App\Models\ExpenseItem;
use App\Models\Paycheck;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Replaces a user's whole budget plan with the document they sent.
 *
 * The plan is edited as one thing, so it arrives as one thing. What it is not
 * is delete-and-recreate: `payout_lines.expense_item_id` points at these rows,
 * and rebuilding them every save would null every link between a payment and
 * the payable it was for. Rows are matched to what is already there and only
 * what the user actually removed is deleted.
 */
class SaveBudgetPlan
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(User $user, array $data): BudgetPlan
    {
        return DB::transaction(function () use ($user, $data): BudgetPlan {
            /*
             * Queried rather than read off `$user->budgetPlan`: the relation
             * caches on the model, and saving through it never refreshes that
             * cache. A second save in the same request cycle would otherwise be
             * handed a stale null and try to insert a duplicate plan.
             */
            $plan = $user->budgetPlan()->firstOrNew();

            $plan->fill([
                'cadence' => $data['cadence'],
                'months_of_cover' => $data['months_of_cover'],
                'emergency_fund_balance' => $data['emergency_fund_balance'],
                'savings_pot_balance' => $data['savings_pot_balance'],
            ])->save();

            $user->setRelation('budgetPlan', $plan);

            /*
             * Order matters on a cadence switch. Paychecks are written first so
             * items have somewhere to land, items are reassigned to whichever
             * paychecks survived, and only then are the departed ones dropped —
             * their cascade would otherwise take live items with them.
             */
            $paychecks = $this->syncPaychecks($plan, $data['paychecks']);
            $this->syncItems($plan, $data['items'], $paychecks);
            $this->dropRetiredPaychecks($plan, $paychecks);

            return $plan->load(['paychecks', 'expenseItems']);
        });
    }

    /**
     * @param  array<int, array<string, mixed>>  $paychecks
     * @return Collection<string, Paycheck> Keyed by the paycheck's key.
     */
    private function syncPaychecks(BudgetPlan $plan, array $paychecks): Collection
    {
        $existing = $plan->paychecks()->get()->keyBy('key');

        return collect($paychecks)
            ->map(function (array $sent, int $position) use ($plan, $existing): Paycheck {
                $paycheck = $existing->get($sent['key']) ?? new Paycheck;

                $paycheck->fill([
                    'key' => $sent['key'],
                    'label' => $sent['label'],
                    'day_of_month' => $sent['day_of_month'],
                    'amount' => $sent['amount'],
                    'saves_remainder' => $sent['saves_remainder'],
                    'position' => $position,
                ]);

                $plan->paychecks()->save($paycheck);

                return $paycheck;
            })
            ->keyBy('key');
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @param  Collection<string, Paycheck>  $paychecks
     */
    private function syncItems(BudgetPlan $plan, array $items, Collection $paychecks): void
    {
        $existing = $plan->expenseItems()->get()->keyBy('id');
        $sent = collect($items);

        /*
         * Anything the user did not send back is gone. Its payout lines keep
         * their figures and lose only the link, which is what the null-on-delete
         * on that key is for.
         */
        $plan->expenseItems()
            ->whereNotIn('id', $sent->pluck('id')->filter()->all())
            ->delete();

        $sent->each(function (array $row, int $position) use ($plan, $existing, $paychecks): void {
            $item = $existing->get($row['id'] ?? null) ?? new ExpenseItem;

            /*
             * forceFill because the foreign key is deliberately not fillable —
             * mass assignment must never be able to move a row to another plan.
             */
            $item->forceFill([
                'paycheck_id' => $paychecks->get($row['paycheck_key'])->id,
                'group' => $row['group'],
                'name' => $row['name'] ?? null,
                'amount' => $row['amount'],
                'started_on' => $row['started_on'] ?? null,
                'ends_on' => $row['ends_on'] ?? null,
                'is_debt' => $row['is_debt'],
                'position' => $position,
            ]);

            $plan->expenseItems()->save($item);
        });
    }

    /**
     * @param  Collection<string, Paycheck>  $paychecks
     */
    private function dropRetiredPaychecks(BudgetPlan $plan, Collection $paychecks): void
    {
        $plan->paychecks()
            ->whereNotIn('key', $paychecks->keys()->all())
            ->delete();
    }
}
