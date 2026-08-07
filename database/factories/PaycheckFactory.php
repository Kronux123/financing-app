<?php

namespace Database\Factories;

use App\Models\BudgetPlan;
use App\Models\Paycheck;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Paycheck>
 */
class PaycheckFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'budget_plan_id' => BudgetPlan::factory(),
            'key' => 'monthly',
            'label' => 'Monthly pay',
            'day_of_month' => null,
            'amount' => 2_500_000,
            'saves_remainder' => false,
            'position' => 0,
        ];
    }

    public function midMonth(): static
    {
        return $this->state([
            'key' => 'mid_month',
            'label' => '15th',
            'day_of_month' => 15,
            'position' => 0,
        ]);
    }

    public function endMonth(): static
    {
        return $this->state([
            'key' => 'end_month',
            'label' => 'End of month',
            'day_of_month' => null,
            'position' => 1,
        ]);
    }

    public function savingRemainder(): static
    {
        return $this->state(['saves_remainder' => true]);
    }
}
