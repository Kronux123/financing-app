<?php

use App\Enums\ExpenseGroup;
use App\Enums\PayCadence;
use App\Models\BudgetPlan;
use App\Models\ExpenseItem;
use App\Models\Payout;
use App\Models\PayoutLine;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

/**
 * A whole plan, in the shape the page sends it: pesos, camel case, and `last`
 * for the day of the month that varies. BudgetPlanResource is what puts it in
 * that shape on the way out.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function planPayload(array $overrides = []): array
{
    return array_merge([
        'cadence' => 'monthly',
        'emergencyFund' => ['monthsOfCover' => 3, 'balance' => 0],
        'savingsPot' => ['balance' => 0],
        'paychecks' => [[
            'id' => 'monthly',
            'label' => 'Monthly pay',
            'dayOfMonth' => 'last',
            'amount' => 25_000,
            'savesRemainder' => false,
        ]],
        'items' => [[
            'id' => null,
            'paycheckId' => 'monthly',
            'group' => 'payables',
            'name' => 'Rent',
            'amount' => 9_000,
            'startedOn' => null,
            'endsOn' => null,
            'isDebt' => false,
        ]],
    ], $overrides);
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<int, array<string, mixed>>
 */
function itemPayload(array $overrides = []): array
{
    return [array_merge([
        'id' => null,
        'paycheckId' => 'monthly',
        'group' => 'payables',
        'name' => 'Rent',
        'amount' => 9_000,
        'startedOn' => null,
        'endsOn' => null,
        'isDebt' => false,
    ], $overrides)];
}

test('guests cannot save a plan', function () {
    $this->put(route('finance.update'), planPayload())
        ->assertRedirect(route('login'));
});

// Pesos on the wire, centavos in the database. A missed conversion here is a
// hundredfold error in somebody's budget.
test('saving builds the plan and stores money as centavos', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), planPayload())
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('finance.edit'));

    $plan = $user->refresh()->budgetPlan;

    expect($plan->cadence)->toBe(PayCadence::Monthly)
        ->and($plan->paychecks)->toHaveCount(1)
        ->and($plan->paychecks->first()->amount)->toBe(2_500_000)
        ->and($plan->paychecks->first()->day_of_month)->toBeNull()
        ->and($plan->expenseItems)->toHaveCount(1)
        ->and($plan->expenseItems->first()->name)->toBe('Rent')
        ->and($plan->expenseItems->first()->amount)->toBe(900_000)
        ->and($plan->expenseItems->first()->group)->toBe(ExpenseGroup::Payables);
});

test('centavos typed as decimals survive the trip', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), planPayload([
            'items' => itemPayload(['amount' => 1.07]),
        ]))
        ->assertSessionHasNoErrors();

    // 1.07 * 100 is 7.000000000000001 short of 107 without rounding.
    expect($user->refresh()->budgetPlan->expenseItems->first()->amount)->toBe(107);
});

test('saving twice edits the plan rather than making a second one', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->put(route('finance.update'), planPayload())
        ->assertSessionHasNoErrors();
    $this->actingAs($user)->put(route('finance.update'), planPayload([
        'emergencyFund' => ['monthsOfCover' => 3, 'balance' => 12_000],
    ]))->assertSessionHasNoErrors();

    expect(BudgetPlan::count())->toBe(1)
        ->and($user->refresh()->budgetPlan->emergency_fund_balance)->toBe(1_200_000);
});

// The reason this is a reconcile and not a delete-and-recreate: payout lines
// point at these rows, and rebuilding them would cut every payment loose from
// the payable it was for.
test('an item that is sent back keeps its id and its history', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->put(route('finance.update'), planPayload());

    $item = $user->refresh()->budgetPlan->expenseItems->first();

    $line = PayoutLine::factory()
        ->for(Payout::factory()->for($user))
        ->for($item)
        ->create(['name' => 'Rent', 'planned' => 900_000, 'actual' => 900_000]);

    $this->actingAs($user)->put(route('finance.update'), planPayload([
        'items' => itemPayload(['id' => (string) $item->id, 'amount' => 9_500]),
    ]))->assertSessionHasNoErrors();

    expect($item->refresh()->amount)->toBe(950_000)
        ->and($line->refresh()->expense_item_id)->toBe($item->id);
});

test('an item left out of the payload is removed', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->put(route('finance.update'), planPayload());
    $this->actingAs($user)->put(route('finance.update'), planPayload(['items' => []]));

    expect($user->refresh()->budgetPlan->expenseItems)->toHaveCount(0);
});

test('removing a payable leaves the payments made against it', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->put(route('finance.update'), planPayload());

    $item = $user->refresh()->budgetPlan->expenseItems->first();
    $line = PayoutLine::factory()
        ->for(Payout::factory()->for($user))
        ->for($item)
        ->create(['name' => 'Rent', 'planned' => 900_000, 'actual' => 900_000]);

    $this->actingAs($user)->put(route('finance.update'), planPayload(['items' => []]));

    $line->refresh();

    expect($line->exists)->toBeTrue()
        ->and($line->expense_item_id)->toBeNull()
        ->and($line->actual)->toBe(900_000);
});

// A cadence switch retires paychecks. The items have to be moved to whichever
// survives before that happens, or the cascade takes them along.
test('switching cadence moves items across and keeps them', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->put(route('finance.update'), planPayload());

    $item = $user->refresh()->budgetPlan->expenseItems->first();

    $this->actingAs($user)->put(route('finance.update'), planPayload([
        'cadence' => 'semi-monthly',
        'paychecks' => [
            ['id' => 'mid-month', 'label' => '15th', 'dayOfMonth' => 15, 'amount' => 12_500, 'savesRemainder' => false],
            ['id' => 'end-month', 'label' => 'End of month', 'dayOfMonth' => 'last', 'amount' => 12_500, 'savesRemainder' => false],
        ],
        'items' => itemPayload(['id' => (string) $item->id, 'paycheckId' => 'mid-month']),
    ]))->assertSessionHasNoErrors();

    $plan = $user->refresh()->budgetPlan;

    expect($plan->paychecks)->toHaveCount(2)
        ->and($plan->expenseItems)->toHaveCount(1)
        ->and($plan->expenseItems->first()->id)->toBe($item->id)
        ->and($plan->expenseItems->first()->paycheck->key)->toBe('mid-month');
});

// A row added on the page carries a made-up id. It has to be created, not
// matched against something the server has never seen.
test('an item with an invented id is created rather than rejected', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), planPayload([
            'items' => itemPayload(['id' => 'item-3f9a2c']),
        ]))
        ->assertSessionHasNoErrors();

    expect($user->refresh()->budgetPlan->expenseItems)->toHaveCount(1);
});

test('another persons item cannot be edited by sending its id', function () {
    $stranger = User::factory()->create();
    $this->actingAs($stranger)->put(route('finance.update'), planPayload());
    $theirItem = $stranger->refresh()->budgetPlan->expenseItems->first();

    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), planPayload([
            'items' => itemPayload([
                'id' => (string) $theirItem->id,
                'name' => 'Taken over',
                'amount' => 1,
            ]),
        ]))
        ->assertSessionHasErrors('items.0.id');

    expect($theirItem->refresh()->name)->toBe('Rent');
});

test('an expense has to name a paycheck that was sent', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), planPayload([
            'items' => itemPayload(['paycheckId' => 'nonexistent']),
        ]))
        ->assertSessionHasErrors('items.0.paycheckId');

    expect(ExpenseItem::count())->toBe(0);
});

test('an expense cannot finish before it started', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), planPayload([
            'items' => itemPayload([
                'startedOn' => '2026-06-01',
                'endsOn' => '2026-01-31',
                'isDebt' => true,
            ]),
        ]))
        ->assertSessionHasErrors('items.0.endsOn');
});

test('a negative amount is refused', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), planPayload([
            'emergencyFund' => ['monthsOfCover' => 3, 'balance' => -1],
        ]))
        ->assertSessionHasErrors('emergencyFund.balance');
});

// Every page reads the plan, so it is shared rather than passed to each one.
test('the plan is shared with every page in the shape the pages read', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->put(route('finance.update'), planPayload());

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('plan.cadence', 'monthly')
                ->where('plan.paychecks.0.id', 'monthly')
                ->where('plan.paychecks.0.dayOfMonth', 'last')
                // Pesos on the way out, as the pages expect.
                ->where('plan.paychecks.0.amount', 25_000)
                ->where('plan.emergencyFund.monthsOfCover', 3)
                ->has('plan.groups', 3)
                ->where('plan.groups.0.id', 'payables')
                ->has('plan.groups.0.items', 1)
                ->where('plan.groups.0.items.0.name', 'Rent')
                ->where('plan.groups.0.items.0.amount', 9_000)
                ->where('plan.groups.0.items.0.paycheckId', 'monthly')
        );
});

test('the plan is null until one is saved', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('finance.edit'))
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('finance/index')
                ->where('plan', null)
        );
});
