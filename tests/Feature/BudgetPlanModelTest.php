<?php

use App\Enums\ExpenseGroup;
use App\Enums\PayCadence;
use App\Models\BudgetPlan;
use App\Models\ExpenseItem;
use App\Models\Paycheck;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;

test('a user has at most one plan', function () {
    $user = User::factory()->create();

    BudgetPlan::factory()->for($user)->create();

    expect($user->refresh()->budgetPlan)->toBeInstanceOf(BudgetPlan::class);

    expect(fn () => BudgetPlan::factory()->for($user)->create())
        ->toThrow(UniqueConstraintViolationException::class);
});

test('a cadence knows the paychecks it implies', function () {
    expect(PayCadence::Monthly->paychecks())->toHaveCount(1)
        ->and(PayCadence::SemiMonthly->paychecks())->toHaveCount(2);

    $plan = BudgetPlan::factory()->semiMonthly()->withPaychecks()->create();

    expect($plan->paychecks)->toHaveCount(2)
        ->and($plan->paychecks->pluck('key')->all())->toBe(['mid_month', 'end_month']);
});

test('a paycheck with no day of the month pays on the last one', function () {
    $paycheck = Paycheck::factory()->create(['day_of_month' => null]);

    expect($paycheck->paysOnLastDay())->toBeTrue()
        ->and($paycheck->payday(Carbon\Carbon::parse('2026-02-10'))->toDateString())
        ->toBe('2026-02-28');
});

// A paycheck set to the 31st still has to pay in February.
test('a payday past the end of a short month is pulled back', function () {
    $paycheck = Paycheck::factory()->create(['day_of_month' => 31]);

    expect($paycheck->payday(Carbon\Carbon::parse('2026-02-10'))->toDateString())
        ->toBe('2026-02-28');
});

test('the emergency fund target leaves savings out', function () {
    $plan = BudgetPlan::factory()->withPaychecks()->create(['months_of_cover' => 3]);
    $paycheck = $plan->paychecks()->firstOrFail();

    ExpenseItem::factory()->for($plan)->for($paycheck)
        ->create(['group' => ExpenseGroup::Payables, 'amount' => 1_000_000]);
    ExpenseItem::factory()->for($plan)->for($paycheck)->allowance()
        ->create(['amount' => 500_000]);
    ExpenseItem::factory()->for($plan)->for($paycheck)->savings()
        ->create(['amount' => 400_000]);

    $plan->load('expenseItems');

    // Money being put by is not a cost you would still have to cover.
    expect($plan->essentialsPerMonth())->toBe(1_500_000)
        ->and($plan->emergencyTarget())->toBe(4_500_000);
});

test('a debt works out what is left from its end date', function () {
    $item = ExpenseItem::factory()->debt(months: 12)->create(['amount' => 250_000]);

    expect($item->monthsRemaining(now()))->toBe(12)
        ->and($item->outstanding(now()))->toBe(3_000_000);
});

test('an item with no end date says nothing rather than zero', function () {
    $item = ExpenseItem::factory()->create(['ends_on' => null]);

    expect($item->monthsRemaining(now()))->toBeNull()
        ->and($item->outstanding(now()))->toBeNull();
});

test('the ending-within scope finds only what finishes inside the window', function () {
    $plan = BudgetPlan::factory()->withPaychecks()->create();
    $paycheck = $plan->paychecks()->firstOrFail();

    ExpenseItem::factory()->for($plan)->for($paycheck)->debt(months: 6)->create();
    ExpenseItem::factory()->for($plan)->for($paycheck)->debt(months: 30)->create();
    ExpenseItem::factory()->for($plan)->for($paycheck)->create(['ends_on' => null]);

    expect(ExpenseItem::query()->endingWithin(12, now())->count())->toBe(1);
});

test('deleting a plan takes its paychecks and items with it', function () {
    $plan = BudgetPlan::factory()->withPaychecks()->withPayables()->create();

    $plan->delete();

    expect(Paycheck::count())->toBe(0)
        ->and(ExpenseItem::count())->toBe(0);
});
