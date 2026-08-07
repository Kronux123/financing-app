<?php

use App\Models\User;

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

/**
 * An end date that leaves exactly `$months` payments to make, counting this
 * month's. Derived from the clock on both sides so these assertions stay true
 * as real time passes, rather than rotting on a hardcoded date.
 */
function debtEndDate(int $months): string
{
    return now()->startOfMonth()->addMonths($months - 1)->endOfMonth()->format('Y-m-d');
}

test('the debt page says so when no plan is saved', function () {
    $page = visit(route('debt.index'));

    $page->assertSee('Debt')
        ->assertSeeIn('@debt-total', '₱0')
        ->assertSeeIn('@debt-empty', 'No budget plan saved yet')
        ->assertNoJavaScriptErrors();
});

test('a payable is not debt until it is ticked', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Rent')
        ->type('@item-amount-payables-monthly-0', '12000')
        ->click('@save-plan')
        ->click('@nav-debt')
        ->assertSeeIn('@debt-empty', 'No payables are ticked as debt')
        ->assertSeeIn('@debt-total', '₱0');
});

test('ticking debt asks for nothing beyond the row itself', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->click('@item-is-debt-payables-monthly-0')
        // The amount and the end date are the whole of it — no second figure.
        ->assertSeeIn('@item-owed-payables-monthly-0', '₱30,000 left')
        ->assertSeeIn('@item-owed-payables-monthly-0', '12 months');
});

test('the debt tick works in either order', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '2500')
        // Ticked before the end date exists, so it asks for the date rather
        // than a figure the row can work out for itself.
        ->click('@item-is-debt-payables-monthly-0')
        ->assertSeeIn('@item-owed-payables-monthly-0', 'add an end date')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->assertSeeIn('@item-owed-payables-monthly-0', '₱30,000 left');
});

test('a debt with an end date totals up on the debt page', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->click('@item-is-debt-payables-monthly-0')
        ->click('@save-plan')
        ->click('@nav-debt')
        ->assertSeeIn('@debt-total', '₱30,000')
        ->assertSeeIn('@debt-free', '₱2,500 a month going out')
        ->assertSeeIn('@debt-free', 'debt-free in 12 months')
        ->assertSee('Laptop installment')
        ->assertSee('12 months left');
});

/** A date `$months` before the start of this month. */
function debtStartDate(int $months): string
{
    return now()->startOfMonth()->subMonths($months)->format('Y-m-d');
}

test('the start date is asked for only on a debt', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->assertMissing('@item-started-payables-monthly-0')
        ->click('@item-is-debt-payables-monthly-0')
        ->assertPresent('@item-started-payables-monthly-0')
        ->click('@item-is-debt-payables-monthly-0')
        ->assertMissing('@item-started-payables-monthly-0');
});

test('the end date is optional on a payable and required on a debt', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->assertAttributeDoesntContain(
            '@item-ends-payables-monthly-0',
            'aria-label',
            'required'
        )
        ->click('@item-is-debt-payables-monthly-0')
        ->assertAttribute('@item-ends-payables-monthly-0', 'aria-required', 'true')
        ->assertAttributeContains(
            '@item-ends-payables-monthly-0',
            'aria-label',
            'required for a debt'
        );
});

test('a start date turns what is left into how far through you are', function () {
    $page = visit(route('finance.edit'));

    // Started 8 months ago, 12 payments left: a 20-month term of ₱2,500.
    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->click('@item-is-debt-payables-monthly-0')
        ->type('@item-started-payables-monthly-0', debtStartDate(8))
        ->assertSeeIn('@item-owed-payables-monthly-0', '₱30,000 left')
        ->assertSeeIn('@item-owed-payables-monthly-0', '8 of 20 paid')
        ->click('@save-plan')
        ->click('@nav-debt')
        // Borrowed 20 x 2,500, of which 8 x 2,500 is paid and 12 x 2,500 left,
        // so the totals cannot contradict each other.
        ->assertSeeIn('@debt-history', '₱50,000 borrowed')
        ->assertSeeIn('@debt-history', '8 of 20 paid')
        ->assertSeeIn('@debt-history', '40%')
        ->assertSeeIn('@debt-total', '₱30,000');
});

test('the Today button fills the start date in', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->click('@item-is-debt-payables-monthly-0')
        ->click('@item-started-today-payables-monthly-0')
        ->assertValue('@item-started-payables-monthly-0', now()->format('Y-m-d'))
        // Starting today is a full term ahead of you, nothing paid yet.
        ->assertSeeIn('@item-owed-payables-monthly-0', '0 of 12 paid');
});

test('a debt with no start date shows no progress rather than zero progress', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->click('@item-is-debt-payables-monthly-0')
        ->assertSeeIn('@item-owed-payables-monthly-0', '₱30,000 left')
        ->assertDontSee('of 12 paid')
        ->click('@save-plan')
        ->click('@nav-debt')
        ->assertMissing('@debt-history')
        ->assertSeeIn('@debt-total', '₱30,000');
});

test('a debt without an end date admits it knows no total', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Family loan')
        ->type('@item-amount-payables-monthly-0', '1500')
        ->click('@item-is-debt-payables-monthly-0')
        ->click('@save-plan')
        ->click('@nav-debt')
        ->assertSeeIn('@debt-total', '₱0')
        ->assertSeeIn('@debt-free', 'some debts have no end date yet')
        ->assertSee('Amount unknown');
});

test('unticking debt drops it from the debt page but keeps the payable', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->click('@item-is-debt-payables-monthly-0')
        ->click('@item-is-debt-payables-monthly-0')
        ->assertMissing('@item-owed-payables-monthly-0')
        ->click('@save-plan')
        ->click('@nav-debt')
        ->assertSeeIn('@debt-empty', 'No payables are ticked as debt');

    // The payable itself is untouched — only its category changed.
    $page->click('@nav-finance')
        ->assertValue('@item-name-payables-monthly-0', 'Laptop installment')
        ->assertValue('@item-amount-payables-monthly-0', '2500')
        ->assertSeeIn('@leftover-monthly', '₱37,500');
});

test('debts total across rows and the slowest one sets the debt-free date', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->click('@item-is-debt-payables-monthly-0')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-1', 'Phone plan')
        ->type('@item-amount-payables-monthly-1', '1000')
        ->type('@item-ends-payables-monthly-1', debtEndDate(6))
        ->click('@item-is-debt-payables-monthly-1')
        ->click('@save-plan')
        ->click('@nav-debt')
        // 30,000 + 6,000, and 12 months rather than the 6-month debt or a
        // total-over-total average.
        ->assertSeeIn('@debt-total', '₱36,000')
        ->assertSeeIn('@debt-free', '₱3,500 a month going out')
        ->assertSeeIn('@debt-free', 'debt-free in 12 months');
});

test('the ordering toggle only appears with more than one debt', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->click('@item-is-debt-payables-monthly-0')
        ->click('@save-plan')
        ->click('@nav-debt')
        ->assertMissing('@order-smallest');
});

test('smallest first puts the cheapest debt to clear at the top', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->click('@item-is-debt-payables-monthly-0')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-1', 'Phone plan')
        ->type('@item-amount-payables-monthly-1', '1000')
        ->type('@item-ends-payables-monthly-1', debtEndDate(6))
        ->click('@item-is-debt-payables-monthly-1')
        ->click('@save-plan')
        ->click('@nav-debt')
        ->assertPresent('@order-smallest')
        ->assertSeeIn('@debt-row', 'Laptop installment')
        ->click('@order-smallest')
        ->assertSeeIn('@debt-row', 'Phone plan')
        ->click('@order-largest')
        ->assertSeeIn('@debt-row', 'Laptop installment');
});

test('the debt page sends you to the plan to change anything', function () {
    $page = visit(route('debt.index'));

    $page->click('@edit-on-plan')
        ->assertPathIs('/finance')
        ->assertSee('How you get paid');
});

test('the dashboard shows what is really owed once a plan exists', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->click('@item-is-debt-payables-monthly-0')
        ->click('@save-plan')
        ->click('Back to dashboard')
        ->assertPathIs('/dashboard')
        ->assertSee('Outstanding debt')
        ->assertSee('₱30,000')
        ->assertDontSee('₱16,780')
        ->assertNoJavaScriptErrors();
});

test('the dashboard reports nothing owed when no payable is debt', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@save-plan')
        ->click('Back to dashboard')
        ->assertSee('Nothing owed')
        ->assertDontSee('₱16,780');
});

/*
 * Saving raises a toast that fades in and out over about four seconds, and axe
 * samples whatever opacity it happens to catch — which reads as a contrast
 * failure at colours that differ every run. The wait lets it clear, so these
 * assertions measure the page rather than an animation.
 */
test('the debt page has no accessibility issues', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->click('@item-is-debt-payables-monthly-0')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-1', 'Family loan')
        ->type('@item-amount-payables-monthly-1', '1500')
        ->click('@item-is-debt-payables-monthly-1')
        ->assertNoAccessibilityIssues()
        ->click('@save-plan')
        ->click('@nav-debt')
        ->wait(5)
        ->assertNoAccessibilityIssues();
});

test('the debt page has no accessibility issues in dark mode', function () {
    $page = visit(route('finance.edit'))->inDarkMode();

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', debtEndDate(12))
        ->click('@item-is-debt-payables-monthly-0')
        ->assertNoAccessibilityIssues()
        ->click('@save-plan')
        ->click('@nav-debt')
        ->wait(5)
        ->assertNoAccessibilityIssues();
});
