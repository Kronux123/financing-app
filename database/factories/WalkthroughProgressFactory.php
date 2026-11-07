<?php

namespace Database\Factories;

use App\Enums\WalkthroughPage;
use App\Models\User;
use App\Models\WalkthroughProgress;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WalkthroughProgress>
 */
class WalkthroughProgressFactory extends Factory
{
    /**
     * A finished run through the dashboard's current walkthrough.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'page' => WalkthroughPage::Dashboard,
            'version' => WalkthroughPage::Dashboard->version(),
            'completed_at' => now(),
            'dismissed_at' => null,
        ];
    }

    public function dismissed(): static
    {
        return $this->state(fn (array $attributes) => [
            'completed_at' => null,
            'dismissed_at' => now(),
        ]);
    }

    /**
     * A run through a version the page has since moved past.
     */
    public function outdated(): static
    {
        return $this->state(fn (array $attributes) => [
            'version' => 0,
        ]);
    }
}
