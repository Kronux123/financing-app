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
 * A whole plan, as the page sends it.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function planPayload(array $overrides = []): array
{
    return array_merge([
        'cadence' => 'monthly',
        'months_of_cover' => 3,
        'emergency_fund_balance' => 0,
        'savings_pot_balance' => 0,
        'paychecks' => [[
            'key' => 'monthly',
            'label' => 'Monthly pay',
            'day_of_month' => null,
            'amount' => 2_500_000,
            'saves_remainder' => false,
        ]],
        'items' => [[
            'id' => null,
            'paycheck_key' => 'monthly',
            'group' => 'payables',
            'name' => 'Rent',
            'amount' => 900_000,
            'started_on' => null,
            'ends_on' => null,
            'is_debt' => false,
        ]],
    ], $overrides);
}

test('guests cannot save a plan', function () {
    $this->put(route('finance.update'), planPayload())
        ->assertRedirect(route('login'));
});

test('saving builds the plan, its paychecks and its items', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), planPayload())
        ->assertRedirect(route('finance.edit'));

    $plan = $user->refresh()->budgetPlan;

    expect($plan->cadence)->toBe(PayCadence::Monthly)
        ->and($plan->paychecks)->toHaveCount(1)
        ->and($plan->expenseItems)->toHaveCount(1)
        ->and($plan->expenseItems->first()->name)->toBe('Rent')
        ->and($plan->expenseItems->first()->group)->toBe(ExpenseGroup::Payables)
        ->and($plan->expenseItems->first()->paycheck_id)->toBe($plan->paychecks->first()->id);
});

test('saving twice edits the plan rather than making a second one', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->put(route('finance.update'), planPayload())
        ->assertSessionHasNoErrors();
    $this->actingAs($user)->put(route('finance.update'), planPayload([
        'emergency_fund_balance' => 1_200_000,
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
        'items' => [[
            'id' => $item->id,
            'paycheck_key' => 'monthly',
            'group' => 'payables',
            'name' => 'Rent',
            'amount' => 950_000,
            'started_on' => null,
            'ends_on' => null,
            'is_debt' => false,
        ]],
    ]));

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
        'cadence' => 'semi_monthly',
        'paychecks' => [
            ['key' => 'mid_month', 'label' => '15th', 'day_of_month' => 15, 'amount' => 1_250_000, 'saves_remainder' => false],
            ['key' => 'end_month', 'label' => 'End of month', 'day_of_month' => null, 'amount' => 1_250_000, 'saves_remainder' => false],
        ],
        'items' => [[
            'id' => $item->id,
            'paycheck_key' => 'mid_month',
            'group' => 'payables',
            'name' => 'Rent',
            'amount' => 900_000,
            'started_on' => null,
            'ends_on' => null,
            'is_debt' => false,
        ]],
    ]));

    $plan = $user->refresh()->budgetPlan;

    expect($plan->paychecks)->toHaveCount(2)
        ->and($plan->expenseItems)->toHaveCount(1)
        ->and($plan->expenseItems->first()->id)->toBe($item->id)
        ->and($plan->expenseItems->first()->paycheck->key)->toBe('mid_month');
});

test('another persons item cannot be edited by sending its id', function () {
    $stranger = User::factory()->create();
    $this->actingAs($stranger)->put(route('finance.update'), planPayload());
    $theirItem = $stranger->refresh()->budgetPlan->expenseItems->first();

    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), planPayload([
            'items' => [[
                'id' => $theirItem->id,
                'paycheck_key' => 'monthly',
                'group' => 'payables',
                'name' => 'Taken over',
                'amount' => 1,
                'started_on' => null,
                'ends_on' => null,
                'is_debt' => false,
            ]],
        ]))
        ->assertSessionHasErrors('items.0.id');

    expect($theirItem->refresh()->name)->toBe('Rent');
});

test('an expense has to name a paycheck that was sent', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), planPayload([
            'items' => [[
                'id' => null,
                'paycheck_key' => 'nonexistent',
                'group' => 'payables',
                'name' => 'Rent',
                'amount' => 900_000,
                'started_on' => null,
                'ends_on' => null,
                'is_debt' => false,
            ]],
        ]))
        ->assertSessionHasErrors('items.0.paycheck_key');

    expect(ExpenseItem::count())->toBe(0);
});

test('an expense cannot finish before it started', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), planPayload([
            'items' => [[
                'id' => null,
                'paycheck_key' => 'monthly',
                'group' => 'payables',
                'name' => 'Laptop',
                'amount' => 250_000,
                'started_on' => '2026-06-01',
                'ends_on' => '2026-01-31',
                'is_debt' => true,
            ]],
        ]))
        ->assertSessionHasErrors('items.0.ends_on');
});

test('a negative amount is refused', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->put(route('finance.update'), planPayload([
            'emergency_fund_balance' => -1,
        ]))
        ->assertSessionHasErrors('emergency_fund_balance');
});

test('the finance page is rendered with the saved plan', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->put(route('finance.update'), planPayload());

    $this->actingAs($user)
        ->get(route('finance.edit'))
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('finance/index')
                ->where('plan.cadence', 'monthly')
                ->has('plan.paychecks', 1)
                ->has('plan.expense_items', 1)
        );
});

test('the finance page renders without a plan', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('finance.edit'))
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('finance/index')
                ->where('plan', null)
        );
});
