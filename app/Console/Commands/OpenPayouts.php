<?php

namespace App\Console\Commands;

use App\Actions\Payouts\OpenPayoutsForPlan;
use App\Models\BudgetPlan;
use Illuminate\Console\Command;

class OpenPayouts extends Command
{
    /**
     * @var string
     */
    protected $signature = 'payouts:open {--months=1 : How far back to catch up}';

    /**
     * @var string
     */
    protected $description = 'Open a pending payout for every payday that has been and has none';

    /**
     * Safe to run as often as you like, and safe to miss.
     *
     * Every payday it would open is checked against what is already there, and
     * the unique key on (user, date, paycheck) is the backstop — so a run that
     * overlaps another, or one catching up after downtime, cannot double-post.
     */
    public function handle(OpenPayoutsForPlan $openPayouts): int
    {
        $months = max(0, (int) $this->option('months'));
        $today = now();
        $opened = 0;
        $plans = 0;

        BudgetPlan::query()
            ->with(['paychecks', 'expenseItems'])
            ->chunkById(100, function ($chunk) use ($openPayouts, $today, $months, &$opened, &$plans): void {
                foreach ($chunk as $plan) {
                    $opened += $openPayouts->handle($plan, $today, $months);
                    $plans++;
                }
            });

        $this->info("Opened {$opened} payday(s) across {$plans} plan(s).");

        return self::SUCCESS;
    }
}
