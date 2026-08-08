<?php

use App\Enums\ExpenseGroup;
use App\Enums\IncomeSource;
use App\Models\BudgetPlan;
use App\Models\ExpenseItem;
use App\Models\Payout;
use App\Models\PayoutIncome;
use App\Models\PayoutLine;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;

test('a payday cannot be recorded twice', function () {
    $user = User::factory()->create();

    Payout::factory()->for($user)->create([
        'paid_on' => '2026-07-31',
        'paycheck_key' => 'monthly',
    ]);

    // The idempotency key the scheduled command leans on.
    expect(fn () => Payout::factory()->for($user)->create([
        'paid_on' => '2026-07-31',
        'paycheck_key' => 'monthly',
    ]))->toThrow(UniqueConstraintViolationException::class);
});

test('the same payday on two paychecks is two records', function () {
    $user = User::factory()->create();

    Payout::factory()->for($user)->create(['paid_on' => '2026-07-31', 'paycheck_key' => 'mid-month']);
    Payout::factory()->for($user)->create(['paid_on' => '2026-07-31', 'paycheck_key' => 'end-month']);

    expect($user->payouts)->toHaveCount(2);
});

test('a payout totals what came in against what went out', function () {
    $payout = Payout::factory()->withPaycheckIncome(2_500_000)->create();

    PayoutLine::factory()->for($payout)->create(['planned' => 900_000, 'actual' => 920_000]);
    PayoutLine::factory()->for($payout)->savings(500_000)->create();

    $payout->load(['incomes', 'lines']);

    expect($payout->actualIncome())->toBe(2_500_000)
        ->and($payout->actualSpend())->toBe(1_420_000)
        ->and($payout->leftOver())->toBe(1_080_000);
});

test('13th month pay is income the plan never forecast', function () {
    $payout = Payout::factory()->withPaycheckIncome(2_500_000)->create();

    PayoutIncome::factory()->for($payout)->thirteenthMonth(2_500_000)->create();

    $payout->load('incomes');

    expect($payout->plannedIncome())->toBe(2_500_000)
        ->and($payout->actualIncome())->toBe(5_000_000)
        ->and($payout->incomes->last()->source)->toBe(IncomeSource::ThirteenthMonth);
});

test('unplanned spending is a line with no source and nothing planned', function () {
    $payout = Payout::factory()->create();
    $line = PayoutLine::factory()->for($payout)->unplanned(200_000)->create();

    expect($line->isUnplanned())->toBeTrue()
        ->and($line->variance())->toBe(200_000);
});

test('a line records where it came from without depending on it', function () {
    $plan = BudgetPlan::factory()->withPaychecks()->create();
    $item = ExpenseItem::factory()->for($plan)->for($plan->paychecks()->firstOrFail())
        ->create(['name' => 'Rent', 'amount' => 900_000]);

    $line = PayoutLine::factory()->for(Payout::factory())->for($item)
        ->create(['name' => 'Rent', 'planned' => 900_000, 'actual' => 900_000]);

    expect($line->expenseItem->is($item))->toBeTrue()
        ->and($item->payoutLines)->toHaveCount(1);
});

// The whole point of copying rather than pointing: deleting a payable must not
// take the record of what you paid with it.
test('deleting a payable leaves its history standing', function () {
    $plan = BudgetPlan::factory()->withPaychecks()->create();
    $item = ExpenseItem::factory()->for($plan)->for($plan->paychecks()->firstOrFail())
        ->create(['name' => 'Rent', 'amount' => 900_000]);

    $line = PayoutLine::factory()->for(Payout::factory())->for($item)
        ->create(['name' => 'Rent', 'planned' => 900_000, 'actual' => 900_000]);

    $item->delete();

    $line->refresh();

    expect($line->exists)->toBeTrue()
        ->and($line->expense_item_id)->toBeNull()
        ->and($line->name)->toBe('Rent')
        ->and($line->actual)->toBe(900_000);
});

test('finalizing is recorded and the scopes tell the two apart', function () {
    $user = User::factory()->create();

    Payout::factory()->for($user)->create(['paid_on' => '2026-06-30']);
    Payout::factory()->for($user)->finalized()->create(['paid_on' => '2026-07-31']);

    expect(Payout::query()->pending()->count())->toBe(1)
        ->and(Payout::query()->finalized()->count())->toBe(1)
        ->and(Payout::query()->finalized()->first()->isFinalized())->toBeTrue();
});

test('a deleted payout is recoverable', function () {
    $payout = Payout::factory()->finalized()->create();

    $payout->delete();

    expect(Payout::count())->toBe(0)
        ->and(Payout::withTrashed()->count())->toBe(1);
});

test('deleting a payout takes its incomes and lines with it', function () {
    $payout = Payout::factory()->withPaycheckIncome()->create();
    PayoutLine::factory()->for($payout)->create();

    $payout->forceDelete();

    expect(PayoutIncome::count())->toBe(0)
        ->and(PayoutLine::count())->toBe(0);
});

test('savings across finalized payouts is one query', function () {
    $user = User::factory()->create();

    $june = Payout::factory()->for($user)->finalized()->create(['paid_on' => '2026-06-30']);
    $july = Payout::factory()->for($user)->finalized()->create(['paid_on' => '2026-07-31']);
    $pending = Payout::factory()->for($user)->create(['paid_on' => '2026-08-31']);

    PayoutLine::factory()->for($june)->savings(500_000)->create();
    PayoutLine::factory()->for($july)->savings(600_000)->create();
    PayoutLine::factory()->for($pending)->savings(900_000)->create();

    // This is what retires the hardcoded savings chart.
    $saved = PayoutLine::query()
        ->inGroup(ExpenseGroup::Savings)
        ->whereHas('payout', fn ($query) => $query->finalized()->where('user_id', $user->id))
        ->sum('actual');

    expect((int) $saved)->toBe(1_100_000);
});
