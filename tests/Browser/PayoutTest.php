<?php

use App\Models\BudgetPlan;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;

beforeEach(function () {
    $this->user = User::factory()->create();

    $this->actingAs($this->user);
});

/**
 * The card key for the most recent monthly payday that has already happened.
 * The monthly paycheck pays on the last day, so unless today is that day the
 * newest record belongs to last month.
 */
function lastMonthlyPayoutKey(): string
{
    $month = now()->endOfMonth()->isToday() ? now() : now()->subMonth();

    return $month->format('Y-m').'-monthly';
}

/**
 * A plan old enough for last month's payday to count, with that payday opened.
 *
 * Built with factories rather than through the form on purpose. A payout exists
 * only once `payouts:open` has run, and the command leaves alone any payday from
 * before the plan did — so a plan typed in just now has no history to review,
 * which is correct and makes it useless as a fixture.
 */
function planWithOpenPayouts(User $user, bool $semiMonthly = false, bool $withPayables = false): BudgetPlan
{
    $factory = BudgetPlan::factory()->for($user);

    if ($semiMonthly) {
        $factory = $factory->semiMonthly();
    }

    // withPaychecks first: the payable attaches to a paycheck, and the callbacks
    // run in the order they were added.
    $factory = $factory->withPaychecks();

    if ($withPayables) {
        $factory = $factory->withPayables();
    }

    $plan = $factory->create();

    $plan->forceFill(['created_at' => now()->subMonths(6)])->save();

    Artisan::call('payouts:open');

    return $plan->refresh();
}

test('the payouts page says so when no plan is saved', function () {
    $page = visit(route('payouts.index'));

    $page->assertSee('Payouts')
        ->assertSeeIn('@payouts-empty', 'No budget plan saved yet')
        ->assertNoJavaScriptErrors();
});

// A plan can be younger than the paydays it would cover, and the command is
// right not to invent them.
test('a plan with no payday behind it yet says so', function () {
    BudgetPlan::factory()->for($this->user)->withPaychecks()->create();

    $page = visit(route('payouts.index'));

    $page->assertSeeIn('@payouts-empty', 'No payday has come round yet')
        ->assertNoJavaScriptErrors();
});

test('a payday that has been round shows up filled in from the plan', function () {
    planWithOpenPayouts($this->user, withPayables: true);
    $key = lastMonthlyPayoutKey();

    $page = visit(route('payouts.index'));

    $page->assertSee('Monthly pay')
        ->assertSee('Rent')
        // Actuals start equal to the plan, so a payday that went as intended
        // needs no editing before it is finalized.
        ->assertValue("@payout-income-{$key}-0", '25000')
        ->assertValue("@payout-line-{$key}-0", '9000')
        ->assertSeeIn("@payout-left-{$key}", '₱16,000')
        ->assertSeeIn("@payout-variance-{$key}", 'Went to plan')
        ->assertNoJavaScriptErrors();
});

test('a payday starts pending and can be finalized', function () {
    planWithOpenPayouts($this->user);
    $key = lastMonthlyPayoutKey();

    $page = visit(route('payouts.index'));

    $page->assertSeeIn("@payout-status-{$key}", 'Pending')
        ->assertSeeIn('@payouts-pending', 'awaiting review')
        ->click("@payout-toggle-{$key}")
        ->assertSeeIn("@payout-status-{$key}", 'Finalized');
});

test('correcting what actually came in shows the variance', function () {
    planWithOpenPayouts($this->user, withPayables: true);
    $key = lastMonthlyPayoutKey();

    $page = visit(route('payouts.index'));

    // The figures move as they are typed; only writing them down waits.
    $page->type("@payout-income-{$key}-0", '24800')
        ->type("@payout-line-{$key}-0", '9200')
        ->assertSeeIn("@payout-variance-{$key}", '-₱200 take-home')
        ->assertSeeIn("@payout-variance-{$key}", '1 line differs')
        ->assertSeeIn("@payout-left-{$key}", '₱15,600');
});

test('a finalized payday cannot be edited until it is reopened', function () {
    planWithOpenPayouts($this->user);
    $key = lastMonthlyPayoutKey();

    $page = visit(route('payouts.index'));

    $page->click("@payout-toggle-{$key}")
        ->assertDisabled("@payout-income-{$key}-0")
        ->click("@payout-toggle-{$key}")
        ->assertEnabled("@payout-income-{$key}-0");
});

test('a corrected payday survives a reload', function () {
    planWithOpenPayouts($this->user);
    $key = lastMonthlyPayoutKey();

    $page = visit(route('payouts.index'));

    $page->type("@payout-income-{$key}-0", '24800')
        ->click("@payout-save-{$key}")
        ->assertMissing("@payout-save-{$key}");

    // Nothing was walked to here, so refresh() lands back on this page.
    $page->refresh()
        ->assertPathIs('/payouts')
        ->assertValue("@payout-income-{$key}-0", '24800');
});

test('finalizing writes down a correction that was still open', function () {
    planWithOpenPayouts($this->user);
    $key = lastMonthlyPayoutKey();

    $page = visit(route('payouts.index'));

    $page->type("@payout-income-{$key}-0", '24800')
        ->click("@payout-toggle-{$key}")
        ->assertSeeIn("@payout-status-{$key}", 'Finalized');

    $page->refresh()
        ->assertValue("@payout-income-{$key}-0", '24800')
        ->assertSeeIn("@payout-status-{$key}", 'Finalized');
});

// The snapshot is the whole point: a payday is the record of what happened, and
// editing the plan afterwards must not rewrite it.
test('a finalized payday stops following the plan', function () {
    planWithOpenPayouts($this->user);
    $key = lastMonthlyPayoutKey();

    $page = visit(route('payouts.index'));

    $page->click("@payout-toggle-{$key}")
        ->click('@nav-finance')
        ->type('@income-monthly', '31000')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.')
        ->click('@nav-payouts')
        ->assertValue("@payout-income-{$key}-0", '25000');
});

/*
 * The record is frozen when it is opened, not when it is touched. This used to
 * assert the opposite — an untouched payday followed the plan — because the page
 * derived it from the plan on every render. The server opens it now, and copies
 * the plan into it once.
 */
test('an untouched payday does not follow the plan either', function () {
    planWithOpenPayouts($this->user);
    $key = lastMonthlyPayoutKey();

    $page = visit(route('payouts.index'));

    $page->assertValue("@payout-income-{$key}-0", '25000')
        ->click('@nav-finance')
        ->type('@income-monthly', '31000')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.')
        ->click('@nav-payouts')
        ->assertValue("@payout-income-{$key}-0", '25000');
});

test('semi-monthly pay gives two records a month', function () {
    planWithOpenPayouts($this->user, semiMonthly: true);

    $page = visit(route('payouts.index'));

    $page->assertSee('15th')
        ->assertSee('End of month')
        ->assertNoJavaScriptErrors();
});

test('the payouts page has no accessibility issues', function () {
    planWithOpenPayouts($this->user, withPayables: true);

    $page = visit(route('payouts.index'));

    $page->wait(5)->assertNoAccessibilityIssues();
});

test('the payouts page has no accessibility issues in dark mode', function () {
    planWithOpenPayouts($this->user);
    $key = lastMonthlyPayoutKey();

    $page = visit(route('payouts.index'))->inDarkMode();

    $page->click("@payout-toggle-{$key}")
        ->wait(5)
        ->assertNoAccessibilityIssues();
});
