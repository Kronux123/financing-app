<?php

use App\Enums\ExpenseGroup;
use App\Models\Payout;
use App\Models\PayoutLine;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

/**
 * A settled payday with an income and whatever lines are given, in centavos.
 *
 * @param  array<int, array{0: ExpenseGroup, 1: int}>  $lines
 */
function settledPayday(User $user, string $paidOn, int $income, array $lines = []): Payout
{
    $payout = Payout::factory()->for($user)->finalized()->withPaycheckIncome($income)
        ->create(['paid_on' => $paidOn]);

    foreach ($lines as [$group, $actual]) {
        PayoutLine::factory()->for($payout)->create([
            'group' => $group,
            'planned' => $actual,
            'actual' => $actual,
        ]);
    }

    return $payout;
}

test('a month saved what did not go out on living costs', function () {
    $user = User::factory()->create();

    settledPayday($user, '2026-07-31', 2_500_000, [
        [ExpenseGroup::Payables, 900_000],
        [ExpenseGroup::Allowance, 400_000],
        [ExpenseGroup::Savings, 300_000],
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->has('savings', 1)
                ->where('savings.0.month', '2026-07')
                // 25,000 less 9,000 payables and 4,000 allowance. The savings
                // line is inside that, not on top of it.
                ->where('savings.0.saved', 12_000)
                ->etc()
        );
});

/*
 * The swept remainder is worked out rather than stored, so it never becomes a
 * payout line. Counting the savings lines alone would report 3,000 here when
 * 12,000 was really put by, which is the whole reason saving is measured from
 * income downwards.
 */
test('what was swept rather than earmarked still counts as saved', function () {
    $user = User::factory()->create();

    settledPayday($user, '2026-07-31', 2_500_000, [
        [ExpenseGroup::Payables, 900_000],
        [ExpenseGroup::Allowance, 400_000],
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('savings.0.saved', 12_000)
                ->etc()
        );
});

// A forecast presented as history is worse than no history.
test('a payday still pending is not history yet', function () {
    $user = User::factory()->create();

    Payout::factory()->for($user)->withPaycheckIncome(2_500_000)
        ->create(['paid_on' => '2026-07-31']);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page->has('savings', 0)->etc());
});

test('semi-monthly pay adds both paydays into the one month', function () {
    $user = User::factory()->create();

    settledPayday($user, '2026-07-15', 1_250_000, [[ExpenseGroup::Payables, 500_000]]);
    settledPayday($user, '2026-07-31', 1_250_000, [[ExpenseGroup::Payables, 250_000]]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->has('savings', 1)
                ->where('savings.0.month', '2026-07')
                // 25,000 in, 7,500 out.
                ->where('savings.0.saved', 17_500)
                ->etc()
        );
});

test('months come back oldest first', function () {
    $user = User::factory()->create();

    settledPayday($user, '2026-07-31', 2_500_000);
    settledPayday($user, '2026-05-29', 2_000_000);
    settledPayday($user, '2026-06-30', 2_200_000);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('savings.0.month', '2026-05')
                ->where('savings.1.month', '2026-06')
                ->where('savings.2.month', '2026-07')
                ->etc()
        );
});

test('a month that spent more than it earned reads negative', function () {
    $user = User::factory()->create();

    settledPayday($user, '2026-07-31', 2_500_000, [
        [ExpenseGroup::Payables, 2_800_000],
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('savings.0.saved', -3_000)
                ->etc()
        );
});

test('centavos survive the crossing', function () {
    $user = User::factory()->create();

    settledPayday($user, '2026-07-31', 2_500_007);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('savings.0.saved', 25_000.07)
                ->etc()
        );
});

test('somebody elses months are not yours', function () {
    $user = User::factory()->create();

    settledPayday(User::factory()->create(), '2026-07-31', 2_500_000);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page->has('savings', 0)->etc());
});

test('the savings calendar reads the same history', function () {
    $user = User::factory()->create();

    settledPayday($user, '2026-07-31', 2_500_000, [[ExpenseGroup::Payables, 900_000]]);

    $this->actingAs($user)
        ->get(route('dashboard.months'))
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('months/index')
                ->has('savings', 1)
                ->where('savings.0.saved', 16_000)
                ->etc()
        );
});

test('guests are turned away from both', function () {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
    $this->get(route('dashboard.months'))->assertRedirect(route('login'));
});
