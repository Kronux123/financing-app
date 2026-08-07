<?php

namespace Database\Factories;

use App\Enums\ExpenseGroup;
use App\Models\Payout;
use App\Models\PayoutLine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PayoutLine>
 */
class PayoutLineFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $amount = fake()->numberBetween(50_000, 1_000_000);

        return [
            'payout_id' => Payout::factory(),
            'expense_item_id' => null,
            'group' => ExpenseGroup::Payables,
            'name' => fake()->randomElement(['Rent', 'Electricity', 'Internet']),
            'planned' => $amount,
            'actual' => $amount,
            'position' => 0,
        ];
    }

    public function savings(int $amount = 500_000): static
    {
        return $this->state([
            'group' => ExpenseGroup::Savings,
            'name' => 'Savings',
            'planned' => $amount,
            'actual' => $amount,
        ]);
    }

    /** Spending the plan never saw coming: no source, nothing planned. */
    public function unplanned(int $amount = 200_000): static
    {
        return $this->state([
            'expense_item_id' => null,
            'name' => 'Hospital visit',
            'planned' => 0,
            'actual' => $amount,
        ]);
    }

    /** Came out at a different figure from the plan. */
    public function overspent(int $by = 20_000): static
    {
        return $this->state(fn (array $attributes): array => [
            'actual' => $attributes['planned'] + $by,
        ]);
    }
}
