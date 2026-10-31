<?php

use App\Http\Controllers\DashboardController;
use App\Models\Payout;
use App\Models\PayoutIncome;
use App\Models\PayoutLine;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('guests are redirected away from the activity log', function () {
    $response = $this->get(route('dashboard.activities'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the activity log', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard.activities'));

    $response->assertOk();
    $response->assertInertia(
        fn (AssertableInertia $page) => $page->component('activities/index')
    );
});

test('guests are redirected away from the debt page', function () {
    $response = $this->get(route('debt.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the debt page', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('debt.index'));

    $response->assertOk();
    $response->assertInertia(
        fn (AssertableInertia $page) => $page->component('debt/index')
    );
});

test('guests are redirected away from the payouts page', function () {
    $response = $this->get(route('payouts.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the payouts page', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('payouts.index'));

    $response->assertOk();
    $response->assertInertia(
        fn (AssertableInertia $page) => $page->component('payouts/index')
    );
});

test('guests are redirected away from the savings calendar', function () {
    $response = $this->get(route('dashboard.months'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the savings calendar', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard.months'));

    $response->assertOk();
    $response->assertInertia(
        fn (AssertableInertia $page) => $page->component('months/index')
    );
});

test('the dashboard has no recent activity before a payday exists', function () {
    $this->actingAs(User::factory()->create());

    $response = $this->get(route('dashboard'));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->component('dashboard/index')
            ->has('recentActivity', 0)
    );
});

test('the dashboard shows only the newest rows of the activity log', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $older = Payout::factory()->for($user)->finalized()->create([
        'paid_on' => now()->subMonthsNoOverflow(2)->startOfMonth()->toDateString(),
    ]);
    PayoutLine::factory()->for($older)->count(4)->create(['name' => 'Old bill']);

    $newest = Payout::factory()->for($user)->create([
        'paid_on' => now()->startOfMonth()->toDateString(),
    ]);
    PayoutIncome::factory()->for($newest)->create(['label' => 'Monthly pay']);
    PayoutLine::factory()->for($newest)->create(['name' => 'Rent', 'planned' => 850_000, 'actual' => 850_000]);

    $response = $this->get(route('dashboard'));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->has('recentActivity', DashboardController::RECENT_ACTIVITY_ROWS)
            ->where('recentActivity.0.title', 'Monthly pay')
            ->where('recentActivity.1.title', 'Rent')
            // Centavos in the database, pesos on the wire, signed as money out.
            ->where('recentActivity.1.amount', -8_500)
            ->where('recentActivity.1.status', 'pending')
    );
});
