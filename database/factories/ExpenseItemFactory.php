<?php

namespace Database\Factories;

use App\Enums\ExpenseGroup;
use App\Models\BudgetPlan;
use App\Models\ExpenseItem;
use App\Models\Paycheck;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExpenseItem>
 */
class ExpenseItemFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $plan = BudgetPlan::factory();

        return [
            'budget_plan_id' => $plan,
            'paycheck_id' => Paycheck::factory()->for($plan),
            'group' => ExpenseGroup::Payables,
            'name' => fake()->randomElement(['Rent', 'Electricity', 'Internet']),
            'amount' => fake()->numberBetween(50_000, 1_500_000),
            'started_on' => null,
            'ends_on' => null,
            'is_debt' => false,
            'position' => 0,
        ];
    }

    public function allowance(): static
    {
        return $this->state([
            'group' => ExpenseGroup::Allowance,
            'name' => null,
        ]);
    }

    public function savings(): static
    {
        return $this->state([
            'group' => ExpenseGroup::Savings,
            'name' => null,
        ]);
    }

    /**
     * A debt that finishes in `$months`, having run for `$paid` already — the
     * two dates together are what give "8 of 20 paid".
     */
    public function debt(int $months = 12, int $paid = 0): static
    {
        return $this->state([
            'is_debt' => true,
            'name' => 'Laptop installment',
            'started_on' => now()->startOfMonth()->subMonths($paid),
            'ends_on' => now()->startOfMonth()->addMonths($months - 1)->endOfMonth(),
        ]);
    }
}
