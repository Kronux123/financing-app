<?php

use App\Enums\ExpenseGroup;
use App\Enums\IncomeSource;
use App\Enums\PayoutStatus;
use App\Models\Payout;
use App\Models\PayoutLine;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

/**
 * A payday with its paycheck income and one payable line.
 *
 * `$paidOn` is a parameter because a user cannot have two records for the same
 * payday — the unique key says so.
 */
function payoutFor(User $user, ?string $paidOn = null): Payout
{
    $payout = Payout::factory()->for($user)->withPaycheckIncome(2_500_000)->create(
        $paidOn === null ? [] : ['paid_on' => $paidOn]
    );

    PayoutLine::factory()->for($payout)->create([
        'group' => ExpenseGroup::Payables,
        'name' => 'Rent',
        'planned' => 900_000,
        'actual' => 900_000,
    ]);

    return $payout->load(['incomes', 'lines']);
}

/**
 * @return array<string, mixed>
 */
function payoutPayload(Payout $payout, int $income = 2_500_000, int $rent = 900_000): array
{
    return [
        'incomes' => [[
            'id' => $payout->incomes->first()->id,
            'source' => IncomeSource::Paycheck->value,
            'label' => 'Monthly pay',
            'actual' => $income,
        ]],
        'lines' => [[
            'id' => $payout->lines->first()->id,
            'group' => ExpenseGroup::Payables->value,
            'name' => 'Rent',
            'actual' => $rent,
        ]],
    ];
}

test('guests are turned away', function () {
    $payout = payoutFor(User::factory()->create());

    $this->get(route('payouts.index'))->assertRedirect(route('login'));
    $this->put(route('payouts.update', $payout), payoutPayload($payout))
        ->assertRedirect(route('login'));
});

test('the page lists your paydays with their figures', function () {
    $user = User::factory()->create();
    payoutFor($user);

    $this->actingAs($user)
        ->get(route('payouts.index'))
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('payouts/index')
                ->has('payouts', 1)
                ->has('payouts.0.incomes', 1)
                ->has('payouts.0.lines', 1)
        );
});

test('the page shows only your own paydays', function () {
    $user = User::factory()->create();
    payoutFor($user);
    payoutFor(User::factory()->create());

    $this->actingAs($user)
        ->get(route('payouts.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->has('payouts', 1));
});

test('correcting what came in records the actuals', function () {
    $user = User::factory()->create();
    $payout = payoutFor($user);

    $this->actingAs($user)
        ->put(route('payouts.update', $payout), payoutPayload($payout, income: 2_480_000, rent: 920_000))
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('payouts.index'));

    $payout->refresh()->load(['incomes', 'lines']);

    expect($payout->actualIncome())->toBe(2_480_000)
        ->and($payout->lines->first()->actual)->toBe(920_000)
        // The forecast is untouched — that is what makes it a record.
        ->and($payout->lines->first()->planned)->toBe(900_000)
        ->and($payout->incomes->first()->planned)->toBe(2_500_000);
});

test('a line added while reviewing is unplanned spending', function () {
    $user = User::factory()->create();
    $payout = payoutFor($user);

    $payload = payoutPayload($payout);
    $payload['lines'][] = [
        'id' => null,
        'group' => ExpenseGroup::Payables->value,
        'name' => 'Hospital visit',
        'actual' => 200_000,
    ];

    $this->actingAs($user)->put(route('payouts.update', $payout), $payload)
        ->assertSessionHasNoErrors();

    $line = $payout->lines()->where('name', 'Hospital visit')->firstOrFail();

    expect($line->planned)->toBe(0)
        ->and($line->actual)->toBe(200_000)
        ->and($line->expense_item_id)->toBeNull()
        ->and($line->isUnplanned())->toBeTrue();
});

test('13th month pay is added as income nobody forecast', function () {
    $user = User::factory()->create();
    $payout = payoutFor($user);

    $payload = payoutPayload($payout);
    $payload['incomes'][] = [
        'id' => null,
        'source' => IncomeSource::ThirteenthMonth->value,
        'label' => '13th month',
        'actual' => 2_500_000,
    ];

    $this->actingAs($user)->put(route('payouts.update', $payout), $payload)
        ->assertSessionHasNoErrors();

    $payout->refresh()->load('incomes');

    expect($payout->plannedIncome())->toBe(2_500_000)
        ->and($payout->actualIncome())->toBe(5_000_000);
});

// planned is the snapshot. If it could be edited, the record of the forecast
// would be worth nothing.
test('the planned figure cannot be edited', function () {
    $user = User::factory()->create();
    $payout = payoutFor($user);

    $payload = payoutPayload($payout);
    $payload['lines'][0]['planned'] = 1;
    $payload['incomes'][0]['planned'] = 1;

    $this->actingAs($user)->put(route('payouts.update', $payout), $payload)
        ->assertSessionHasNoErrors();

    $payout->refresh()->load(['incomes', 'lines']);

    expect($payout->lines->first()->planned)->toBe(900_000)
        ->and($payout->incomes->first()->planned)->toBe(2_500_000);
});

test('finalizing stamps when it happened, and reopening clears it', function () {
    $user = User::factory()->create();
    $payout = payoutFor($user);

    $this->actingAs($user)
        ->patch(route('payouts.status', $payout), ['status' => 'finalized'])
        ->assertSessionHasNoErrors();

    expect($payout->refresh()->status)->toBe(PayoutStatus::Finalized)
        ->and($payout->finalized_at)->not->toBeNull();

    $this->actingAs($user)->patch(route('payouts.status', $payout), ['status' => 'pending']);

    expect($payout->refresh()->status)->toBe(PayoutStatus::Pending)
        ->and($payout->finalized_at)->toBeNull();
});

test('a finalized payday refuses corrections until it is reopened', function () {
    $user = User::factory()->create();
    $payout = payoutFor($user);

    $this->actingAs($user)->patch(route('payouts.status', $payout), ['status' => 'finalized']);

    $this->actingAs($user)
        ->put(route('payouts.update', $payout), payoutPayload($payout, rent: 999_999))
        ->assertSessionHasErrors('status');

    expect($payout->lines()->first()->actual)->toBe(900_000);

    $this->actingAs($user)->patch(route('payouts.status', $payout), ['status' => 'pending']);

    $this->actingAs($user)
        ->put(route('payouts.update', $payout), payoutPayload($payout, rent: 999_999))
        ->assertSessionHasNoErrors();

    expect($payout->lines()->first()->actual)->toBe(999_999);
});

test('somebody elses payday cannot be corrected', function () {
    $stranger = User::factory()->create();
    $theirs = payoutFor($stranger);

    $this->actingAs(User::factory()->create())
        ->put(route('payouts.update', $theirs), payoutPayload($theirs, rent: 1))
        ->assertForbidden();

    expect($theirs->lines()->first()->actual)->toBe(900_000);
});

test('somebody elses payday cannot be finalized', function () {
    $theirs = payoutFor(User::factory()->create());

    $this->actingAs(User::factory()->create())
        ->patch(route('payouts.status', $theirs), ['status' => 'finalized'])
        ->assertForbidden();

    expect($theirs->refresh()->status)->toBe(PayoutStatus::Pending);
});

test('a line id from another payday is refused', function () {
    $user = User::factory()->create();
    $payout = payoutFor($user);
    $other = payoutFor($user, now()->subMonths(2)->endOfMonth()->toDateString());

    $payload = payoutPayload($payout);
    $payload['lines'][0]['id'] = $other->lines->first()->id;

    $this->actingAs($user)
        ->put(route('payouts.update', $payout), $payload)
        ->assertSessionHasErrors('lines.0.id');
});

test('a negative actual is refused', function () {
    $user = User::factory()->create();
    $payout = payoutFor($user);

    $this->actingAs($user)
        ->put(route('payouts.update', $payout), payoutPayload($payout, rent: -1))
        ->assertSessionHasErrors('lines.0.actual');
});
