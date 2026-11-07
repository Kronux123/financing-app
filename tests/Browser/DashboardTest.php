<?php

use App\Models\BudgetPlan;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->walkthroughsSeen()->create();

    $this->actingAs($this->user);
});

test('the dashboard renders every card once there is a plan', function () {
    BudgetPlan::factory()->for($this->user)->withPaychecks()->withPayables()->create();

    $page = visit(route('dashboard'));

    $page->assertSee('Savings overview')
        ->assertMissing('@dashboard-empty')
        ->assertSee('Total saved')
        ->assertSee('Monthly expenses')
        ->assertSee('Outstanding debt')
        ->assertSee('Projected cashflow')
        ->assertSee('Monthly savings')
        ->assertSee('pay goes')
        ->assertSee('Recent activity')
        ->assertNoJavaScriptErrors();
});

/** An end date leaving exactly `$months` payments to make, counting this one. */
function endsInMonths(int $months): string
{
    return now()->startOfMonth()->addMonths($months - 1)->endOfMonth()->format('Y-m-d');
}

test('projected cashflow names the payable that is about to end', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', endsInMonths(6))
        ->click('@save-plan')
        ->assertSee('Budget plan saved.')
        ->click('Back to dashboard')
        ->assertSee('Projected cashflow')
        ->assertSee('+₱2,500')
        ->assertSee('when Laptop installment ends');
});

test('projected cashflow sums several endings and counts them', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', endsInMonths(6))
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-1', 'Phone plan')
        ->type('@item-amount-payables-monthly-1', '1000')
        ->type('@item-ends-payables-monthly-1', endsInMonths(9))
        ->click('@save-plan')
        ->assertSee('Budget plan saved.')
        ->click('Back to dashboard')
        ->assertSee('+₱3,500')
        ->assertSee('across 2 payables');
});

test('projected cashflow ignores a payable ending beyond the window', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Car loan')
        ->type('@item-amount-payables-monthly-0', '5000')
        ->type('@item-ends-payables-monthly-0', endsInMonths(30))
        ->click('@save-plan')
        ->assertSee('Budget plan saved.')
        ->click('Back to dashboard')
        ->assertSee('Nothing ends in the next 12 months')
        ->assertDontSee('+₱5,000');
});

// The old tile showed unallocated, which the sweep drives to exactly zero — so
// it read ₱0 for anyone using it. This one is about payables finishing, and the
// sweep has nothing to do with it.
test('projected cashflow survives sweeping the remainder to savings', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', endsInMonths(6))
        ->click('@sweep-monthly')
        ->assertSeeIn('@leftover-monthly', '₱0')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.')
        ->click('Back to dashboard')
        ->assertSee('+₱2,500')
        ->assertSee('when Laptop installment ends');
});

test('projected cashflow says nothing ends when no payable has a date', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Rent')
        ->type('@item-amount-payables-monthly-0', '12000')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.')
        ->click('Back to dashboard')
        ->assertSee('Nothing ends in the next 12 months');
});

/*
 * Both states are checked. Without a plan the page is the onboarding card, and
 * with one it is the full overview, empty states for the chart and the log
 * included — a fresh plan has settled nothing yet.
 */
test('the dashboard has no accessibility issues', function () {
    $page = visit(route('dashboard'));

    $page->assertPresent('@dashboard-empty')
        ->assertNoAccessibilityIssues();
});

// The card icons sit on tinted surfaces that carry their own dark steps, so the
// dark card has to be checked alongside the light one.
test('the dashboard has no accessibility issues in dark mode', function () {
    $page = visit(route('dashboard'))->inDarkMode();

    $page->assertPresent('@dashboard-empty')
        ->assertNoAccessibilityIssues();
});

test('the dashboard with a plan has no accessibility issues', function () {
    BudgetPlan::factory()->for($this->user)->withPaychecks()->withPayables()->create();

    $page = visit(route('dashboard'));

    $page->assertSee('pay goes')
        ->assertNoAccessibilityIssues();
});

test('the dashboard with a plan has no accessibility issues in dark mode', function () {
    BudgetPlan::factory()->for($this->user)->withPaychecks()->withPayables()->create();

    $page = visit(route('dashboard'))->inDarkMode();

    $page->assertSee('pay goes')
        ->assertNoAccessibilityIssues();
});

// The hero's gap is the point of it: a plan that spends more than it takes in
// says so, and by how much.
test('the pay split shows what is left to assign, and when it runs over', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '20000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '5000')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.')
        ->click('Back to dashboard')
        ->assertSeeIn('@pay-flow-income', '₱20,000')
        ->assertSeeIn('@pay-flow-unassigned', '₱15,000')
        ->assertSee('Not yet given a job');

    $page = visit(route('finance.edit'));

    $page->type('@item-amount-payables-monthly-0', '25000')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.')
        ->click('Back to dashboard')
        ->assertSeeIn('@pay-flow-unassigned', '−₱5,000')
        ->assertSee('Over budget');
});
