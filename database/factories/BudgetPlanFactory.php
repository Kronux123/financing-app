<?php

namespace Database\Factories;

use App\Enums\ExpenseGroup;
use App\Enums\PayCadence;
use App\Models\BudgetPlan;
use App\Models\ExpenseItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BudgetPlan>
 */
class BudgetPlanFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'cadence' => PayCadence::Monthly,
            'months_of_cover' => 3,
            'emergency_fund_balance' => 0,
            'savings_pot_balance' => 0,
        ];
    }

    public function semiMonthly(): static
    {
        return $this->state(['cadence' => PayCadence::SemiMonthly]);
    }

    /**
     * A plan with the paychecks its cadence implies, so tests do not have to
     * build the pay schedule by hand every time.
     */
    public function withPaychecks(int $amount = 2_500_000): static
    {
        return $this->afterCreating(function (BudgetPlan $plan) use ($amount): void {
            foreach ($plan->cadence->paychecks() as $position => $paycheck) {
                $plan->paychecks()->create([
                    ...$paycheck,
                    'amount' => intdiv($amount, count($plan->cadence->paychecks())),
                    'position' => $position,
                ]);
            }
        });
    }

    /**
     * A plan that is actually paying for something.
     *
     * Built through the factory rather than `$plan->expenseItems()->create()`:
     * foreign keys are deliberately left out of the model's fillable list, so a
     * relation's `create()` would drop `paycheck_id` on the floor.
     */
    public function withPayables(int $amount = 900_000): static
    {
        return $this->afterCreating(function (BudgetPlan $plan) use ($amount): void {
            ExpenseItem::factory()
                ->for($plan)
                ->for($plan->paychecks()->firstOrFail())
                ->create([
                    'group' => ExpenseGroup::Payables,
                    'name' => 'Rent',
                    'amount' => $amount,
                ]);
        });
    }
}
