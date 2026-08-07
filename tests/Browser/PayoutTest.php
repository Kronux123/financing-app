<?php

use App\Models\User;

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

/**
 * The record id for the most recent monthly payday that has already happened.
 * The monthly paycheck pays on the last day, so unless today is that day the
 * newest record belongs to last month.
 */
function lastMonthlyPayoutId(): string
{
    $month = now()->endOfMonth()->isToday() ? now() : now()->subMonth();

    return $month->format('Y-m').'-monthly';
}

test('the payouts page says so when no plan is saved', function () {
    $page = visit(route('payouts.index'));

    $page->assertSee('Payouts')
        ->assertSeeIn('@payouts-empty', 'No budget plan saved yet')
        ->assertNoJavaScriptErrors();
});

test('a payday that has been round shows up filled in from the plan', function () {
    $id = lastMonthlyPayoutId();

    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '25000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Rent')
        ->type('@item-amount-payables-monthly-0', '9000')
        ->type('@amount-allowance-monthly', '4000')
        ->click('@save-plan')
        ->click('@nav-payouts')
        ->assertPathIs('/payouts')
        ->assertSee('Monthly pay')
        ->assertSee('Rent')
        // Actuals start equal to the plan, so a payday that went as intended
        // needs no editing before it is finalized.
        ->assertValue("@payout-income-{$id}", '25000')
        ->assertValue("@payout-line-{$id}-0", '9000')
        ->assertSeeIn("@payout-left-{$id}", '₱12,000')
        ->assertSeeIn("@payout-variance-{$id}", 'Went to plan');
});

test('a payday starts pending and can be finalized', function () {
    $id = lastMonthlyPayoutId();

    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '25000')
        ->click('@save-plan')
        ->click('@nav-payouts')
        ->assertSeeIn("@payout-status-{$id}", 'Pending')
        ->assertSeeIn('@payouts-pending', 'awaiting review')
        ->click("@payout-toggle-{$id}")
        ->assertSeeIn("@payout-status-{$id}", 'Finalized');
});

test('correcting what actually came in shows the variance', function () {
    $id = lastMonthlyPayoutId();

    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '25000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Rent')
        ->type('@item-amount-payables-monthly-0', '9000')
        ->click('@save-plan')
        ->click('@nav-payouts')
        ->type("@payout-income-{$id}", '24800')
        ->type("@payout-line-{$id}-0", '9200')
        ->assertSeeIn("@payout-variance-{$id}", '-₱200 take-home')
        ->assertSeeIn("@payout-variance-{$id}", '1 line differs')
        ->assertSeeIn("@payout-left-{$id}", '₱15,600');
});

test('a finalized payday cannot be edited until it is reopened', function () {
    $id = lastMonthlyPayoutId();

    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '25000')
        ->click('@save-plan')
        ->click('@nav-payouts')
        ->click("@payout-toggle-{$id}")
        ->assertDisabled("@payout-income-{$id}")
        ->click("@payout-toggle-{$id}")
        ->assertEnabled("@payout-income-{$id}");
});

test('a corrected payday survives a reload', function () {
    $id = lastMonthlyPayoutId();

    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '25000')
        ->click('@save-plan')
        ->click('@nav-payouts')
        ->type("@payout-income-{$id}", '24800')
        ->click("@payout-toggle-{$id}");

    /*
     * refresh() reloads the url the page was *opened* at, which is /finance —
     * we walked to /payouts through the sidebar. It still tears down every bit
     * of in-memory state, so walking back afterwards proves the record was read
     * from storage rather than remembered.
     *
     * Asserting on a payouts element straight after the refresh does not fail,
     * it hangs: the locator waits for something that will never appear on
     * /finance, and inputValue() has no deadline of its own.
     */
    $page->refresh()
        ->assertPathIs('/finance')
        ->click('@nav-payouts')
        ->assertValue("@payout-income-{$id}", '24800')
        ->assertSeeIn("@payout-status-{$id}", 'Finalized');
});

// The freeze is the whole point: a finalized payday is the record of what
// happened, and editing the plan afterwards must not rewrite it.
test('a finalized payday stops following the plan', function () {
    $id = lastMonthlyPayoutId();

    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '25000')
        ->click('@save-plan')
        ->click('@nav-payouts')
        ->click("@payout-toggle-{$id}")
        ->click('@nav-finance')
        ->type('@income-monthly', '31000')
        ->click('@save-plan')
        ->click('@nav-payouts')
        ->assertValue("@payout-income-{$id}", '25000');
});

test('an untouched payday still follows the plan', function () {
    $id = lastMonthlyPayoutId();

    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '25000')
        ->click('@save-plan')
        ->click('@nav-payouts')
        ->assertValue("@payout-income-{$id}", '25000')
        ->click('@nav-finance')
        ->type('@income-monthly', '31000')
        ->click('@save-plan')
        ->click('@nav-payouts')
        ->assertValue("@payout-income-{$id}", '31000');
});

test('semi-monthly pay gives two records a month', function () {
    $page = visit(route('finance.edit'));

    $page->click('@cadence-semi-monthly')
        ->type('@income-mid-month', '12500')
        ->type('@income-end-month', '12500')
        ->click('@save-plan')
        ->click('@nav-payouts')
        ->assertSee('15th')
        ->assertSee('End of month');
});

test('the payouts page has no accessibility issues', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '25000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Rent')
        ->type('@item-amount-payables-monthly-0', '9000')
        ->click('@save-plan')
        ->click('@nav-payouts')
        ->wait(5)
        ->assertNoAccessibilityIssues();
});

test('the payouts page has no accessibility issues in dark mode', function () {
    $id = lastMonthlyPayoutId();

    $page = visit(route('finance.edit'))->inDarkMode();

    $page->type('@income-monthly', '25000')
        ->click('@save-plan')
        ->click('@nav-payouts')
        ->click("@payout-toggle-{$id}")
        ->wait(5)
        ->assertNoAccessibilityIssues();
});
