<?php

namespace App\Console\Commands;

use App\Actions\Payouts\PaydayReminders;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class RemindPendingPaydays extends Command
{
    /**
     * @var string
     */
    protected $signature = 'payouts:remind
        {--date= : Run as if today were this date (Y-m-d), to walk through the reminder schedule locally}';

    /**
     * @var string
     */
    protected $description = 'Email people whose paydays are waiting to be reviewed';

    /**
     * Safe to run as often as you like, and safe to miss. Each payday records
     * how many reminders it has had, so a second run on the same day finds
     * nothing owed, and a missed run is caught up by the next one.
     */
    public function handle(PaydayReminders $reminders): int
    {
        $date = $this->option('date');
        $today = is_string($date) && $date !== '' ? CarbonImmutable::parse($date) : now();

        $emailed = $reminders->send($today);

        $this->info("Reminded {$emailed} user(s) about paydays awaiting review.");

        return self::SUCCESS;
    }
}
