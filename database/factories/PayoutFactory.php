<?php

namespace Database\Factories;

use App\Enums\IncomeSource;
use App\Enums\PayoutStatus;
use App\Models\Payout;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payout>
 */
class PayoutFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'paycheck_key' => 'monthly',
            'paycheck_label' => 'Monthly pay',
            'paid_on' => now()->subMonth()->endOfMonth()->toDateString(),
            'status' => PayoutStatus::Pending,
            'finalized_at' => null,
        ];
    }

    public function finalized(): static
    {
        return $this->state([
            'status' => PayoutStatus::Finalized,
            'finalized_at' => now(),
        ]);
    }

    /** The paycheck row every payout has, so totals are not zero by default. */
    public function withPaycheckIncome(int $amount = 2_500_000): static
    {
        return $this->afterCreating(function (Payout $payout) use ($amount): void {
            $payout->incomes()->create([
                'source' => IncomeSource::Paycheck,
                'label' => $payout->paycheck_label,
                'planned' => $amount,
                'actual' => $amount,
            ]);
        });
    }
}
