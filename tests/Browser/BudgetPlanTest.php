<?php

use App\Models\User;

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

test('the budget plan renders for an authenticated user', function () {
    $page = visit(route('finance.edit'));

    $page->assertSee('Budget plan')
        ->assertSee('How you get paid')
        ->assertSee('Needs')
        ->assertSee('Utilities')
        ->assertNoJavaScriptErrors();
});

test('monthly pay shows a single paycheck', function () {
    $page = visit(route('finance.edit'));

    $page->assertPresent('@paycheck-monthly')
        ->assertMissing('@paycheck-mid-month')
        ->assertMissing('@paycheck-end-month');
});

test('semi-monthly pay splits into the 15th and end of month', function () {
    $page = visit(route('finance.edit'));

    $page->click('@cadence-semi-monthly')
        ->assertPresent('@paycheck-mid-month')
        ->assertPresent('@paycheck-end-month')
        ->assertMissing('@paycheck-monthly')
        ->assertSee('15th')
        ->assertSee('End of month');
});

test('switching back to monthly collapses to one paycheck', function () {
    $page = visit(route('finance.edit'));

    $page->click('@cadence-semi-monthly')
        ->assertPresent('@paycheck-mid-month')
        ->click('@cadence-monthly')
        ->assertPresent('@paycheck-monthly')
        ->assertMissing('@paycheck-mid-month');
});

test('semi-monthly splits the income across both paychecks', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '60000')
        ->click('@cadence-semi-monthly')
        ->assertValue('@income-mid-month', '30000')
        ->assertValue('@income-end-month', '30000')
        ->assertSeeIn('@plan-income', '₱60,000');
});

test('an expense reduces the leftover on its paycheck', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '60000')
        ->assertSeeIn('@leftover-monthly', '₱60,000')
        ->click('@add-needs-monthly')
        ->type('@item-name-needs-monthly-0', 'Rent')
        ->type('@item-amount-needs-monthly-0', '15000')
        ->assertSeeIn('@allocated-monthly', '₱15,000')
        ->assertSeeIn('@leftover-monthly', '₱45,000')
        ->assertSee('Comfortable');
});

test('expenses across groups roll up into the monthly summary', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '50000')
        ->click('@add-needs-monthly')
        ->type('@item-amount-needs-monthly-0', '20000')
        ->click('@add-utilities-monthly')
        ->type('@item-amount-utilities-monthly-0', '5000')
        ->assertSeeIn('@plan-income', '₱50,000')
        ->assertSeeIn('@plan-allocated', '₱25,000')
        ->assertSeeIn('@plan-unallocated', '₱25,000');
});

test('planning more than a paycheck holds flags it as over-allocated', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '10000')
        ->click('@add-needs-monthly')
        ->type('@item-amount-needs-monthly-0', '12000')
        ->assertSeeIn('@paycheck-monthly', 'Over-allocated')
        ->assertSeeIn('@leftover-monthly', '₱2,000')
        ->assertSee('Over budget');
});

test('an expense can be moved to the other paycheck', function () {
    $page = visit(route('finance.edit'));

    $page->click('@cadence-semi-monthly')
        ->type('@income-mid-month', '30000')
        ->type('@income-end-month', '30000')
        ->click('@add-needs-mid-month')
        ->type('@item-name-needs-mid-month-0', 'Rent')
        ->type('@item-amount-needs-mid-month-0', '12000')
        ->assertSeeIn('@leftover-mid-month', '₱18,000')
        ->assertSeeIn('@leftover-end-month', '₱30,000')
        ->click('@move-needs-mid-month-0')
        ->assertSeeIn('@leftover-mid-month', '₱30,000')
        ->assertSeeIn('@leftover-end-month', '₱18,000');
});

test('an expense can be removed', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-needs-monthly')
        ->type('@item-name-needs-monthly-0', 'Rent')
        ->type('@item-amount-needs-monthly-0', '10000')
        ->assertSeeIn('@leftover-monthly', '₱30,000')
        ->click('@remove-needs-monthly-0')
        ->assertSeeIn('@leftover-monthly', '₱40,000');
});

test('a saved plan survives a reload', function () {
    $page = visit(route('finance.edit'));

    $page->click('@cadence-semi-monthly')
        ->type('@income-mid-month', '25000')
        ->type('@income-end-month', '25000')
        ->click('@add-utilities-mid-month')
        ->type('@item-name-utilities-mid-month-0', 'Electricity')
        ->type('@item-amount-utilities-mid-month-0', '3200')
        ->click('@save-plan');

    // refresh() reloads in the same browser context, so local storage survives.
    // navigate() does not move the page at all here, and a second visit() opens
    // a fresh context with empty storage — neither can test persistence.
    $page->refresh()
        ->assertPathIs('/finance')
        ->assertPresent('@paycheck-mid-month')
        ->assertValue('@income-mid-month', '25000')
        ->assertValue('@item-name-utilities-mid-month-0', 'Electricity')
        ->assertSeeIn('@leftover-mid-month', '₱21,800');
});

test('an unsaved plan is not persisted', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '77000')
        ->assertSee('Unsaved changes');

    $page->refresh()
        ->assertPathIs('/finance')
        ->assertValue('@income-monthly', '')
        ->assertDontSee('Unsaved changes');
});

test('the dashboard reflects a saved plan', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '60000')
        ->click('@add-needs-monthly')
        ->type('@item-name-needs-monthly-0', 'Rent')
        ->type('@item-amount-needs-monthly-0', '15000')
        ->click('@add-savings-monthly')
        ->type('@item-name-savings-monthly-0', 'Emergency fund')
        ->type('@item-amount-savings-monthly-0', '10000')
        ->click('@save-plan');

    $page->click('Back to dashboard')
        ->assertPathIs('/dashboard')
        ->assertSee('Savings overview')
        ->assertDontSee('These are sample figures')
        ->assertSee('Planned by group')
        ->assertSee('₱15,000')
        ->assertSee('₱10,000')
        ->assertNoJavaScriptErrors();
});

test('the dashboard prompts for a plan when none is saved', function () {
    $page = visit(route('dashboard'));

    $page->assertSee('These are sample figures')
        ->assertSee('Spending categories')
        ->assertNoJavaScriptErrors();
});

test('the budget plan has no accessibility issues', function () {
    $page = visit(route('finance.edit'));

    $page->click('@cadence-semi-monthly')
        ->click('@add-needs-mid-month')
        ->assertNoAccessibilityIssues();
});

// The --goal-* tokens carry separate dark steps, so the tinted allocation
// surfaces have to be checked against the dark card as well as the light one.
test('the budget plan has no accessibility issues in dark mode', function () {
    $page = visit(route('finance.edit'))->inDarkMode();

    $page->click('@cadence-semi-monthly')
        ->type('@income-mid-month', '30000')
        ->click('@add-needs-mid-month')
        ->type('@item-amount-needs-mid-month-0', '29000')
        ->assertSeeIn('@paycheck-mid-month', 'Tight')
        ->assertNoAccessibilityIssues();
});
