<?php

use App\Models\BudgetPlan;
use App\Models\Paycheck;
use App\Models\Payout;
use Illuminate\Console\Scheduling\Schedule;

/**
 * What can be tested about a scheduled job, and what cannot.
 *
 * The command's behaviour is covered by OpenPayoutsTest. These cover the two
 * things around it: that the schedule actually holds the entry, and that the
 * date arithmetic behaves on real calendar days rather than only on whatever
 * today happens to be.
 *
 * What no test here can prove is that cron is installed on the server and
 * calling `schedule:run` every minute. That is deployment, not code — check it
 * with `schedule:list` for what is due, and `schedule:work` to run the
 * scheduler in the foreground while developing.
 */
test('opening paydays is on the schedule, daily', function () {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn ($event): bool => str_contains((string) $event->command, 'payouts:open'));

    expect($events)->toHaveCount(1)
        ->and($events->first()->expression)->toBe('0 1 * * *');
});

// Daily is what lets the command own the calendar: a payday set to the 31st
// still has to land in February, and cron cannot express that. February 2026
// then ends on a Saturday, so the pay lands on the Friday before it — both rules
// at once, which is the case worth pinning.
test('a payday on the 31st opens on the last weekday of a short month', function () {
    $this->travelTo('2026-03-02 09:00');

    $plan = BudgetPlan::factory()->create();
    $plan->forceFill(['created_at' => '2026-01-01'])->save();

    Paycheck::factory()->for($plan)->create([
        'key' => 'monthly',
        'day_of_month' => 31,
    ]);

    $this->artisan('payouts:open')->assertSuccessful();

    expect(Payout::query()->pluck('paid_on')->map->toDateString()->all())
        ->toBe(['2026-02-27']);
});

test('a payday later this month is not opened early', function () {
    $this->travelTo('2026-03-10 09:00');

    $plan = BudgetPlan::factory()->create();
    $plan->forceFill(['created_at' => '2026-03-01'])->save();

    Paycheck::factory()->for($plan)->create([
        'key' => 'mid-month',
        'day_of_month' => 15,
    ]);

    $this->artisan('payouts:open')->assertSuccessful();

    expect(Payout::count())->toBe(0);

    // Days later it has been, and the daily run picks it up. The 15th is a Sunday
    // that March, so the money actually arrived on the Friday the 13th.
    $this->travelTo('2026-03-16 09:00');

    $this->artisan('payouts:open')->assertSuccessful();

    expect(Payout::query()->pluck('paid_on')->map->toDateString()->all())
        ->toBe(['2026-03-13']);
});

// A run that never happened has to be recoverable by the next one, which is the
// other half of why this is daily rather than on the paydays themselves.
test('a missed run is caught up by the next one', function () {
    $this->travelTo('2026-03-01 09:00');

    $plan = BudgetPlan::factory()->create();
    $plan->forceFill(['created_at' => '2026-01-01'])->save();

    Paycheck::factory()->for($plan)->create(['key' => 'monthly', 'day_of_month' => null]);

    // Nothing ran on the 27th of February. A week later, it is still opened.
    $this->travelTo('2026-03-07 09:00');

    $this->artisan('payouts:open')->assertSuccessful();

    expect(Payout::query()->pluck('paid_on')->map->toDateString()->all())
        ->toBe(['2026-02-27']);
});
