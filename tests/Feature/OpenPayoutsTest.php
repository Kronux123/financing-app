<?php

use App\Enums\ExpenseGroup;
use App\Enums\IncomeSource;
use App\Enums\PayoutStatus;
use App\Models\BudgetPlan;
use App\Models\ExpenseItem;
use App\Models\Payout;

/** A plan that has been around long enough for last month's payday to count. */
function planOpenSince(string $since = '-6 months'): BudgetPlan
{
    $plan = BudgetPlan::factory()->withPaychecks()->create();

    $plan->forceFill(['created_at' => now()->modify($since)])->save();

    return $plan->refresh();
}

/*
 * Time is pinned rather than left to whenever the suite runs, because the date
 * asserted here depends on the calendar: May 2026 ends on a Sunday, so the
 * command has to open the record against the Friday before it.
 */
test('a payday that has been gets a pending record', function () {
    $this->travelTo('2026-06-10 09:00');

    $plan = planOpenSince();

    $this->artisan('payouts:open')->assertSuccessful();

    $payout = Payout::query()->firstOrFail();

    expect(Payout::count())->toBe(1)
        ->and($payout->status)->toBe(PayoutStatus::Pending)
        ->and($payout->user_id)->toBe($plan->user_id)
        ->and($payout->paycheck_key)->toBe('monthly')
        ->and($payout->paid_on->toDateString())->toBe('2026-05-29');
});

// The unique key is the backstop, but the command should not lean on an
// exception to stay idempotent.
test('running twice opens nothing the second time', function () {
    planOpenSince();

    $this->artisan('payouts:open')->assertSuccessful();
    $this->artisan('payouts:open')->assertSuccessful();

    expect(Payout::count())->toBe(1);
});

test('a payday still to come is left alone', function () {
    $this->travelTo('2026-06-10 09:00');

    planOpenSince();

    // This month's last day has not arrived, so only last month's is opened.
    expect(Payout::count())->toBe(0);

    $this->artisan('payouts:open')->assertSuccessful();

    expect(Payout::query()->where('paid_on', '2026-06-30')->exists())->toBeFalse()
        ->and(Payout::count())->toBe(1);
});

// The app has nothing to say about months it was not around for.
test('paydays from before the plan existed are not invented', function () {
    planOpenSince('-2 days');

    $this->artisan('payouts:open --months=6')->assertSuccessful();

    expect(Payout::count())->toBe(0);
});

test('the plan is copied into the record, not pointed at', function () {
    $plan = planOpenSince();
    $paycheck = $plan->paychecks()->firstOrFail();

    ExpenseItem::factory()->for($plan)->for($paycheck)
        ->create(['group' => ExpenseGroup::Payables, 'name' => 'Rent', 'amount' => 900_000]);
    ExpenseItem::factory()->for($plan)->for($paycheck)->savings()
        ->create(['amount' => 500_000]);

    $this->artisan('payouts:open')->assertSuccessful();

    $payout = Payout::query()->with(['incomes', 'lines'])->firstOrFail();

    expect($payout->lines)->toHaveCount(2)
        ->and($payout->incomes)->toHaveCount(1)
        ->and($payout->incomes->first()->source)->toBe(IncomeSource::Paycheck)
        ->and($payout->incomes->first()->planned)->toBe($paycheck->amount);

    $rent = $payout->lines->firstWhere('name', 'Rent');

    // Actuals start equal to the plan: a payday that went as intended needs no
    // editing before it is finalized.
    expect($rent->planned)->toBe(900_000)
        ->and($rent->actual)->toBe(900_000)
        ->and($rent->expense_item_id)->not->toBeNull();

    // A savings line has no name of its own, so the group names it.
    expect($payout->lines->firstWhere('group', ExpenseGroup::Savings)->name)
        ->toBe('Savings');
});

// The snapshot is the whole point: what the plan says later cannot reach back.
test('editing the plan afterwards does not change the record', function () {
    $plan = planOpenSince();
    $paycheck = $plan->paychecks()->firstOrFail();

    $item = ExpenseItem::factory()->for($plan)->for($paycheck)
        ->create(['name' => 'Rent', 'amount' => 900_000]);

    $this->artisan('payouts:open')->assertSuccessful();

    $item->update(['amount' => 1_500_000]);
    $paycheck->update(['amount' => 9_999_999, 'label' => 'Renamed']);

    $payout = Payout::query()->with(['incomes', 'lines'])->firstOrFail();

    expect($payout->lines->first()->planned)->toBe(900_000)
        ->and($payout->incomes->first()->planned)->toBe(2_500_000)
        ->and($payout->paycheck_label)->toBe('Monthly pay');
});

test('semi-monthly pay opens two records a month', function () {
    $plan = BudgetPlan::factory()->semiMonthly()->withPaychecks()->create();
    $plan->forceFill(['created_at' => now()->subMonths(6)])->save();

    $this->artisan('payouts:open')->assertSuccessful();

    // Last month's 15th and last day, plus this month's 15th if it has passed.
    expect(Payout::query()->where('paycheck_key', 'mid-month')->exists())->toBeTrue()
        ->and(Payout::query()->where('paycheck_key', 'end-month')->exists())->toBeTrue();
});

test('a deleted payday is not reopened behind your back', function () {
    planOpenSince();

    $this->artisan('payouts:open')->assertSuccessful();

    Payout::query()->firstOrFail()->delete();

    $this->artisan('payouts:open')->assertSuccessful();

    expect(Payout::count())->toBe(0)
        ->and(Payout::withTrashed()->count())->toBe(1);
});

test('a plan with no paydays yet opens nothing', function () {
    BudgetPlan::factory()->withPaychecks()->create();

    $this->artisan('payouts:open')->assertSuccessful();

    expect(Payout::count())->toBe(0);
});
