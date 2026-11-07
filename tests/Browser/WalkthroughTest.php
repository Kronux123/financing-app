<?php

use App\Enums\WalkthroughPage;
use App\Models\BudgetPlan;
use App\Models\Payout;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();

    $this->actingAs($this->user);
});

test('the dashboard tour opens on a first visit and is finished once', function () {
    BudgetPlan::factory()->for($this->user)->withPaychecks()->withPayables()->create();

    $page = visit(route('dashboard'));

    $page->assertVisible('@walkthrough-card')
        ->assertSee('Welcome to your dashboard')
        ->assertSee('1 of 8')
        ->click('@walkthrough-next')
        ->assertSee('Where your pay goes')
        ->click('@walkthrough-back')
        ->assertSee('Welcome to your dashboard');

    foreach (range(1, 7) as $step) {
        $page->click('@walkthrough-next');
    }

    $page->assertSee('That’s the tour')
        ->assertSee('8 of 8')
        ->click('@walkthrough-next')
        ->assertMissing('@walkthrough-card')
        ->assertNoJavaScriptErrors();

    $progress = $this->user->walkthroughProgress()->sole();

    expect($progress->page)->toBe(WalkthroughPage::Dashboard)
        ->and($progress->completed_at)->not->toBeNull();

    $page->refresh()
        ->assertSee('Savings overview')
        ->assertMissing('@walkthrough-card');
});

test('skipping the tour keeps it away', function () {
    BudgetPlan::factory()->for($this->user)->withPaychecks()->withPayables()->create();

    $page = visit(route('dashboard'));

    $page->click('@walkthrough-skip')
        ->assertMissing('@walkthrough-card');

    expect($this->user->walkthroughProgress()->sole()->dismissed_at)->not->toBeNull();

    $page->refresh()
        ->assertSee('Savings overview')
        ->assertMissing('@walkthrough-card');
});

test('escape skips the tour', function () {
    BudgetPlan::factory()->for($this->user)->withPaychecks()->withPayables()->create();

    $page = visit(route('dashboard'));

    $page->assertVisible('@walkthrough-card')
        ->keys('@walkthrough-next', 'Escape')
        ->assertMissing('@walkthrough-card');

    expect($this->user->walkthroughProgress()->sole()->dismissed_at)->not->toBeNull();
});

test('a dashboard with no plan is toured with sample data', function () {
    $page = visit(route('dashboard'));

    $page->assertVisible('@walkthrough-card')
        ->assertVisible('@walkthrough-sample')
        ->assertSee('Total saved')
        ->assertMissing('@dashboard-empty')
        ->click('@walkthrough-skip')
        ->assertMissing('@walkthrough-card')
        ->assertVisible('@dashboard-empty')
        ->assertNoJavaScriptErrors();

    expect(BudgetPlan::count())->toBe(0);
});

test('a dashboard with a plan is toured with the user\'s own data', function () {
    BudgetPlan::factory()->for($this->user)->withPaychecks()->withPayables()->create();

    visit(route('dashboard'))
        ->assertVisible('@walkthrough-card')
        ->assertMissing('@walkthrough-sample');
});

/*
 * Each page is visited by a brand new user, so every one of them is toured
 * with the sample account. The step counts are what the sample puts on the
 * page: every step finds its element.
 */
test('every page has a tour over sample data that leaves nothing behind', function (string $route, string $page, int $steps) {
    $visit = visit(route($route));

    $visit->assertVisible('@walkthrough-card')
        ->assertVisible('@walkthrough-sample')
        ->assertSee("1 of {$steps}");

    foreach (range(1, $steps) as $step) {
        $visit->click('@walkthrough-next');
    }

    $visit->assertMissing('@walkthrough-card')
        ->assertNoJavaScriptErrors();

    expect($this->user->walkthroughProgress()->sole())
        ->page->value->toBe($page)
        ->completed_at->not->toBeNull()
        ->and(BudgetPlan::count())->toBe(0)
        ->and(Payout::count())->toBe(0);

    $visit->refresh()->assertMissing('@walkthrough-card');
})->with([
    'finance' => ['finance.edit', 'finance', 7],
    'payouts' => ['payouts.index', 'payouts', 6],
    'debt' => ['debt.index', 'debt', 6],
    'months' => ['dashboard.months', 'months', 5],
    'activities' => ['dashboard.activities', 'activities', 4],
]);

test('the sample is gone once the tour ends', function () {
    $page = visit(route('payouts.index'));

    $page->assertVisible('@walkthrough-sample')
        ->assertVisible('@payout-card')
        ->click('@walkthrough-skip')
        ->assertMissing('@payout-card')
        ->assertVisible('@payouts-empty');
});

test('the tour can be taken again', function () {
    $user = User::factory()->walkthroughsSeen()->create();
    BudgetPlan::factory()->for($user)->withPaychecks()->withPayables()->create();
    $this->actingAs($user);

    $page = visit(route('dashboard'));

    $page->assertMissing('@walkthrough-card')
        ->click('@walkthrough-replay')
        ->assertVisible('@walkthrough-card')
        ->assertSee('Welcome to your dashboard')
        ->click('@walkthrough-skip')
        ->assertMissing('@walkthrough-card');

    // The replay leaves the first outcome alone.
    expect($user->walkthroughProgress()->where('page', WalkthroughPage::Dashboard)->sole()->completed_at)->not->toBeNull();
});

test('the tour passes accessibility checks', function () {
    BudgetPlan::factory()->for($this->user)->withPaychecks()->withPayables()->create();

    visit(route('dashboard'))
        ->click('@walkthrough-next')
        ->assertSee('Where your pay goes')
        ->assertNoAccessibilityIssues();
});

test('the tour passes accessibility checks in dark mode', function () {
    BudgetPlan::factory()->for($this->user)->withPaychecks()->withPayables()->create();

    visit(route('dashboard'))->inDarkMode()
        ->click('@walkthrough-next')
        ->assertSee('Where your pay goes')
        ->assertNoAccessibilityIssues();
});

test('the sample data label passes accessibility checks', function () {
    visit(route('payouts.index'))
        ->assertVisible('@walkthrough-sample')
        ->click('@walkthrough-next')
        ->assertNoAccessibilityIssues();
});

test('the sample data label passes accessibility checks in dark mode', function () {
    visit(route('payouts.index'))->inDarkMode()
        ->assertVisible('@walkthrough-sample')
        ->click('@walkthrough-next')
        ->assertNoAccessibilityIssues();
});
