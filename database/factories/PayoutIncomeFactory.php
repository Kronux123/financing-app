<?php

namespace Database\Factories;

use App\Enums\IncomeSource;
use App\Models\Payout;
use App\Models\PayoutIncome;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PayoutIncome>
 */
class PayoutIncomeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'payout_id' => Payout::factory(),
            'source' => IncomeSource::Paycheck,
            'label' => 'Monthly pay',
            'planned' => 2_500_000,
            'actual' => 2_500_000,
            'position' => 0,
        ];
    }

    /** Money the plan never forecast, so nothing was planned against it. */
    public function thirteenthMonth(int $amount = 2_500_000): static
    {
        return $this->state([
            'source' => IncomeSource::ThirteenthMonth,
            'label' => '13th month',
            'planned' => 0,
            'actual' => $amount,
            'position' => 1,
        ]);
    }

    public function bonus(int $amount = 500_000): static
    {
        return $this->state([
            'source' => IncomeSource::Bonus,
            'label' => 'Bonus',
            'planned' => 0,
            'actual' => $amount,
            'position' => 1,
        ]);
    }
}
