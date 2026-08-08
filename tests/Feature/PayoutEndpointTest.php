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
 * The correction as the page sends it: pesos, and named the way the page reads
 * them. PayoutResource is the other half of this shape.
 *
 * @return array<string, mixed>
 */
function payoutPayload(Payout $payout, float|int $income = 25_000, float|int $rent = 9_000): array
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
    $payout = payoutFor($user, '2026-07-31');

    $this->actingAs($user)
        ->get(route('payouts.index'))
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('payouts/index')
                ->has('payouts', 1)
                ->where('payouts.0.id', $payout->id)
                // Stable across reloads, and safe to build a selector from.
                ->where('payouts.0.key', '2026-07-monthly')
                ->where('payouts.0.paycheckId', 'monthly')
                ->where('payouts.0.paycheckLabel', 'Monthly pay')
                ->where('payouts.0.paidOn', '2026-07-31')
                ->where('payouts.0.status', 'pending')
                // Pesos on the wire, centavos in the column behind it.
                ->where('payouts.0.incomes.0.planned', 25_000)
                ->where('payouts.0.incomes.0.actual', 25_000)
                ->where('payouts.0.incomes.0.source', 'paycheck')
                ->where('payouts.0.lines.0.groupId', 'payables')
                ->where('payouts.0.lines.0.name', 'Rent')
                ->where('payouts.0.lines.0.planned', 9_000)
        );
});

// Newest first: the payday you came to settle is the one at the top.
test('paydays are listed newest first', function () {
    $user = User::factory()->create();
    payoutFor($user, '2026-06-30');
    payoutFor($user, '2026-07-31');

    $this->actingAs($user)
        ->get(route('payouts.index'))
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('payouts.0.paidOn', '2026-07-31')
                ->where('payouts.1.paidOn', '2026-06-30')
                ->etc()
        );
});

// A hundredfold error in somebody's budget is what a missed conversion costs.
test('centavos survive the round trip', function () {
    $user = User::factory()->create();
    $payout = payoutFor($user);

    $this->actingAs($user)
        ->put(route('payouts.update', $payout), payoutPayload($payout, rent: 9_000.07))
        ->assertSessionHasNoErrors();

    expect($payout->lines()->first()->actual)->toBe(900_007);

    $this->actingAs($user)
        ->get(route('payouts.index'))
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('payouts.0.lines.0.actual', 9_000.07)
                ->etc()
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
        ->put(route('payouts.update', $payout), payoutPayload($payout, income: 24_800, rent: 9_200))
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('payouts.index'));

    $payout->refresh()->load(['incomes', 'lines']);

    expect($payout->actualIncome())->toBe(2_480_000)
        ->and($payout->lines->first()->actual)->toBe(920_000)
        // The forecast is untouched — that is what makes it a record.
        ->and($payout->lines->first()->planned)->toBe(900_000)
        ->and($payout->incomes->first()->planned)->toBe(2_500_000);
});

/*
 * A paycheck that funds nothing still opens a payday, so a record with no lines
 * at all is an ordinary case rather than an edge one — and its correction has to
 * go through.
 */
test('a payday with nothing planned against it can still be corrected', function () {
    $user = User::factory()->create();
    $payout = Payout::factory()->for($user)->withPaycheckIncome(2_500_000)->create();
    $payout->load(['incomes', 'lines']);

    $this->actingAs($user)
        ->put(route('payouts.update', $payout), [
            'incomes' => [[
                'id' => $payout->incomes->first()->id,
                'source' => IncomeSource::Paycheck->value,
                'label' => 'Monthly pay',
                'actual' => 24_800,
            ]],
            'lines' => [],
        ])
        ->assertSessionHasNoErrors();

    expect($payout->refresh()->actualIncome())->toBe(2_480_000);
});

// The other half of the browser test: what the page reads on the way back in is
// the correction, not the figure the payday was opened with.
test('a correction is what the next page load reads', function () {
    $user = User::factory()->create();
    $payout = payoutFor($user);

    $this->actingAs($user)
        ->put(route('payouts.update', $payout), payoutPayload($payout, income: 24_800))
        ->assertSessionHasNoErrors();

    $this->actingAs($user)
        ->get(route('payouts.index'))
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('payouts.0.incomes.0.actual', 24_800)
                ->etc()
        );
});

test('a line added while reviewing is unplanned spending', function () {
    $user = User::factory()->create();
    $payout = payoutFor($user);

    $payload = payoutPayload($payout);
    $payload['lines'][] = [
        'id' => null,
        'group' => ExpenseGroup::Payables->value,
        'name' => 'Hospital visit',
        'actual' => 2_000,
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
        'actual' => 25_000,
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
        ->put(route('payouts.update', $payout), payoutPayload($payout, rent: 9_999.99))
        ->assertSessionHasErrors('status');

    expect($payout->lines()->first()->actual)->toBe(900_000);

    $this->actingAs($user)->patch(route('payouts.status', $payout), ['status' => 'pending']);

    $this->actingAs($user)
        ->put(route('payouts.update', $payout), payoutPayload($payout, rent: 9_999.99))
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
