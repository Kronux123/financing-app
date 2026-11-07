<?php

use App\Models\User;

beforeEach(function () {
    $this->actingAs(User::factory()->walkthroughsSeen()->create());
});

test('the budget plan renders for an authenticated user', function () {
    $page = visit(route('finance.edit'));

    $page->assertSee('Budget plan')
        ->assertSee('How you get paid')
        ->assertSee('Payables')
        ->assertSee('Allowance')
        ->assertSee('Savings')
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
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Rent')
        ->type('@item-amount-payables-monthly-0', '15000')
        ->assertSeeIn('@allocated-monthly', '₱15,000')
        ->assertSeeIn('@leftover-monthly', '₱45,000')
        ->assertSee('Comfortable');
});

test('expenses across groups roll up into the monthly summary', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '50000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '20000')
        ->type('@amount-allowance-monthly', '5000')
        ->assertSeeIn('@plan-income', '₱50,000')
        ->assertSeeIn('@plan-allocated', '₱25,000')
        ->assertSeeIn('@plan-unallocated', '₱25,000');
});

test('planning more than a paycheck holds flags it as over-allocated', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '10000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '12000')
        ->assertSeeIn('@paycheck-monthly', 'Over-allocated')
        ->assertSeeIn('@leftover-monthly', '₱2,000')
        ->assertSee('Over budget');
});

test('an expense can be moved to the other paycheck', function () {
    $page = visit(route('finance.edit'));

    $page->click('@cadence-semi-monthly')
        ->type('@income-mid-month', '30000')
        ->type('@income-end-month', '30000')
        ->click('@add-payables-mid-month')
        ->type('@item-name-payables-mid-month-0', 'Rent')
        ->type('@item-amount-payables-mid-month-0', '12000')
        ->assertSeeIn('@leftover-mid-month', '₱18,000')
        ->assertSeeIn('@leftover-end-month', '₱30,000')
        ->click('@move-payables-mid-month-0')
        ->assertSeeIn('@leftover-mid-month', '₱30,000')
        ->assertSeeIn('@leftover-end-month', '₱18,000');
});

test('an expense can be removed', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Rent')
        ->type('@item-amount-payables-monthly-0', '10000')
        ->assertSeeIn('@leftover-monthly', '₱30,000')
        ->click('@remove-payables-monthly-0')
        ->assertSeeIn('@leftover-monthly', '₱40,000');
});

test('a saved plan survives a reload', function () {
    $page = visit(route('finance.edit'));

    $page->click('@cadence-semi-monthly')
        ->type('@income-mid-month', '25000')
        ->type('@income-end-month', '25000')
        ->click('@add-payables-mid-month')
        ->type('@item-name-payables-mid-month-0', 'Electricity')
        ->type('@item-amount-payables-mid-month-0', '3200')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.');

    // refresh() reloads in the same browser context, so local storage survives.
    // navigate() does not move the page at all here, and a second visit() opens
    // a fresh context with empty storage — neither can test persistence.
    $page->refresh()
        ->assertPathIs('/finance')
        ->assertPresent('@paycheck-mid-month')
        ->assertValue('@income-mid-month', '25000')
        ->assertValue('@item-name-payables-mid-month-0', 'Electricity')
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

test('an amount field keeps digits and a decimal point, and drops the rest', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', 'abc12def34')
        ->assertValue('@income-monthly', '1234')
        ->type('@amount-savings-monthly', '₱2,500')
        ->assertValue('@amount-savings-monthly', '2500')
        ->assertSeeIn('@allocated-monthly', '₱2,500')
        ->type('@fund-balance', '1.50')
        ->assertValue('@fund-balance', '1.50');
});

test('a second decimal point folds into the first', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '1.2.3')
        ->assertValue('@income-monthly', '1.23');
});

test('a payable can carry an end date that survives a reload', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Laptop installment')
        ->type('@item-amount-payables-monthly-0', '2500')
        ->type('@item-ends-payables-monthly-0', '2026-12-31')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.');

    $page->refresh()
        ->assertValue('@item-name-payables-monthly-0', 'Laptop installment')
        ->assertValue('@item-ends-payables-monthly-0', '2026-12-31')
        ->assertSeeIn('@leftover-monthly', '₱27,500');
});

test('a payable without an end date is left alone', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Rent')
        ->type('@item-amount-payables-monthly-0', '9000')
        ->assertValue('@item-ends-payables-monthly-0', '')
        ->assertSeeIn('@leftover-monthly', '₱21,000');
});

test('allowance and savings take one figure instead of itemised rows', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->type('@amount-allowance-monthly', '4000')
        ->type('@amount-savings-monthly', '6000')
        ->assertPresent('@add-payables-monthly')
        ->assertMissing('@add-allowance-monthly')
        ->assertMissing('@add-savings-monthly')
        ->assertSeeIn('@allocated-monthly', '₱10,000')
        ->assertSeeIn('@leftover-monthly', '₱20,000');
});

test('retyping a single figure replaces it rather than adding to it', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '20000')
        ->type('@amount-allowance-monthly', '3000')
        ->assertSeeIn('@allocated-monthly', '₱3,000')
        ->type('@amount-allowance-monthly', '5000')
        ->assertSeeIn('@allocated-monthly', '₱5,000')
        ->assertSeeIn('@leftover-monthly', '₱15,000');
});

test('a single figure survives a reload', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '35000')
        ->type('@amount-savings-monthly', '7500')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.');

    $page->refresh()
        ->assertValue('@amount-savings-monthly', '7500')
        ->assertSeeIn('@leftover-monthly', '₱27,500');
});

test('saving the remainder moves the whole leftover into savings', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '60000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '15000')
        ->assertSeeIn('@leftover-monthly', '₱45,000')
        ->click('@sweep-monthly')
        ->assertSeeIn('@remainder-monthly', '₱45,000')
        ->assertSeeIn('@leftover-monthly', '₱0')
        ->assertSeeIn('@allocated-monthly', '₱60,000')
        ->assertSeeIn('@paycheck-monthly', 'Fully allocated');
});

test('the saved remainder follows every later edit', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '40000')
        ->click('@sweep-monthly')
        ->assertSeeIn('@remainder-monthly', '₱40,000')
        ->type('@amount-allowance-monthly', '6000')
        ->assertSeeIn('@remainder-monthly', '₱34,000')
        ->type('@amount-allowance-monthly', '0')
        ->assertSeeIn('@remainder-monthly', '₱40,000');
});

test('turning the saved remainder off hands the leftover back', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->click('@sweep-monthly')
        ->assertSeeIn('@leftover-monthly', '₱0')
        ->click('@sweep-monthly')
        ->assertMissing('@remainder-monthly')
        ->assertSeeIn('@leftover-monthly', '₱30,000')
        ->assertSeeIn('@plan-allocated', '₱0');
});

test('an over-allocated paycheck saves nothing', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '20000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '25000')
        ->click('@sweep-monthly')
        ->assertSeeIn('@remainder-monthly', '₱0')
        ->assertSeeIn('@paycheck-monthly', 'Over-allocated')
        ->assertSeeIn('@leftover-monthly', '₱5,000');
});

test('each paycheck saves its own remainder', function () {
    $page = visit(route('finance.edit'));

    $page->click('@cadence-semi-monthly')
        ->type('@income-mid-month', '25000')
        ->type('@income-end-month', '25000')
        ->click('@add-payables-mid-month')
        ->type('@item-amount-payables-mid-month-0', '10000')
        ->click('@sweep-mid-month')
        ->assertSeeIn('@remainder-mid-month', '₱15,000')
        ->assertMissing('@remainder-end-month')
        ->assertSeeIn('@leftover-end-month', '₱25,000');
});

test('a saved remainder survives a reload', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '45000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '5000')
        ->click('@sweep-monthly')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.');

    $page->refresh()
        ->assertSeeIn('@remainder-monthly', '₱40,000')
        ->assertSeeIn('@leftover-monthly', '₱0');
});

/*
 * The swept line is derived, never stored — see the expense_items migration.
 * Storing it made a reloaded plan count its own remainder as already claimed, so
 * there was nothing left to sweep and the next edit collapsed the figure to
 * zero. Editing after a reload is what catches it.
 */
test('a saved remainder is recomputed rather than carried', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '45000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '5000')
        ->click('@sweep-monthly')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.');

    // The reloaded plan sweeps what is actually left, not what was left when it
    // was saved.
    $page->refresh()
        ->type('@item-amount-payables-monthly-0', '6000')
        ->assertSeeIn('@remainder-monthly', '₱39,000')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.');

    $page->refresh()
        ->assertSeeIn('@remainder-monthly', '₱39,000')
        ->assertSeeIn('@leftover-monthly', '₱0');
});

test('the emergency fund target is months of payables and allowance', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '10000')
        ->type('@amount-allowance-monthly', '5000')
        ->assertSeeIn('@fund-target', '₱45,000')
        ->click('@cover-6')
        ->assertSeeIn('@fund-target', '₱90,000')
        ->click('@cover-3')
        ->assertSeeIn('@fund-target', '₱45,000');
});

test('savings are not counted as essentials', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '10000')
        ->assertSeeIn('@fund-target', '₱30,000')
        ->type('@amount-savings-monthly', '4000')
        ->assertSeeIn('@fund-target', '₱30,000');
});

test('the target is the same on either cadence', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '10000')
        ->type('@amount-allowance-monthly', '5000')
        ->assertSeeIn('@fund-target', '₱45,000')
        ->click('@cadence-semi-monthly')
        ->assertSeeIn('@fund-target', '₱45,000');
});

test('savings fill the emergency fund before the pot', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '10000')
        ->type('@amount-savings-monthly', '5000')
        ->assertSeeIn('@fund-target', '₱30,000')
        ->assertSeeIn('@fund-to-emergency', '₱5,000')
        ->assertSeeIn('@fund-to-pot', '₱0')
        ->assertSeeIn('@fund-forecast', 'Full in 6 months');
});

test('a part-filled fund takes only what it needs and the rest overflows', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '10000')
        ->type('@amount-savings-monthly', '5000')
        ->type('@fund-balance', '28000')
        ->assertSeeIn('@fund-to-emergency', '₱2,000')
        ->assertSeeIn('@fund-to-pot', '₱3,000')
        ->assertSeeIn('@fund-forecast', 'Full in 1 month');
});

test('a full fund sends everything to the pot', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '10000')
        ->type('@amount-savings-monthly', '5000')
        ->type('@fund-balance', '30000')
        ->assertSeeIn('@fund-to-emergency', '₱0')
        ->assertSeeIn('@fund-to-pot', '₱5,000')
        ->assertSee('Fully funded')
        ->assertSeeIn('@fund-forecast', 'everything now lands in the pot');
});

test('an unsized fund says so rather than claiming to be funded', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->type('@amount-savings-monthly', '5000')
        ->assertSee('Not sized yet')
        ->assertSeeIn('@fund-to-pot', '₱5,000')
        ->assertSeeIn('@fund-forecast', 'until the fund is sized');
});

test('the emergency fund survives a reload', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '10000')
        ->click('@cover-6')
        ->type('@fund-balance', '12000')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.');

    $page->refresh()
        ->assertValue('@fund-balance', '12000')
        ->assertSeeIn('@fund-target', '₱60,000');
});

test('the pot balance is kept alongside the fund', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->type('@fund-balance', '12000')
        ->type('@pot-balance', '8000')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.');

    $page->refresh()
        ->assertValue('@fund-balance', '12000')
        ->assertValue('@pot-balance', '8000');
});

test('the dashboard leads with total saved and gives the fund its own card', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '30000')
        ->click('@add-payables-monthly')
        ->type('@item-amount-payables-monthly-0', '10000')
        ->type('@amount-savings-monthly', '5000')
        ->type('@fund-balance', '12000')
        ->type('@pot-balance', '8000')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.');

    $page->click('Back to dashboard')
        ->assertPathIs('/dashboard')
        ->assertSeeIn('@dashboard-saved', '₱20,000')
        ->assertSee('₱5,000 a month going in')
        ->assertSee('Savings pot')
        ->assertSeeIn('@dashboard-fund', '₱12,000')
        ->assertSee('₱30,000 target')
        ->assertSeeIn('@dashboard-fund-note', '₱18,000 to go')
        ->assertSeeIn('@dashboard-fund-note', 'full in 4 months')
        ->assertDontSee('Emergency buffer')
        ->assertNoJavaScriptErrors();
});

test('the dashboard shows no figures until a plan exists', function () {
    $page = visit(route('dashboard'));

    $page->assertPresent('@dashboard-empty')
        ->assertMissing('@dashboard-saved')
        ->assertMissing('@dashboard-fund')
        ->assertDontSee('₱')
        ->assertNoJavaScriptErrors();
});

test('the dashboard reflects a saved plan', function () {
    $page = visit(route('finance.edit'));

    $page->type('@income-monthly', '60000')
        ->click('@add-payables-monthly')
        ->type('@item-name-payables-monthly-0', 'Rent')
        ->type('@item-amount-payables-monthly-0', '15000')
        ->type('@amount-savings-monthly', '10000')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.');

    $page->click('Back to dashboard')
        ->assertPathIs('/dashboard')
        ->assertSee('Savings overview')
        ->assertMissing('@dashboard-empty')
        ->assertSeeIn('@pay-flow-income', '₱60,000')
        ->assertSee('₱15,000')
        ->assertSee('₱10,000')
        // A plan alone opens no payday, so there is nothing in the log yet.
        ->assertSeeIn('@savings-empty', 'No month has been settled yet')
        ->assertSeeIn('@activity-empty', 'No activity yet')
        ->assertNoJavaScriptErrors();
});

test('the dashboard prompts for a plan when none is saved', function () {
    $page = visit(route('dashboard'));

    $page->assertSeeIn('@dashboard-empty', 'Your overview fills in as you go')
        ->click('@build-plan')
        ->assertPathIs('/finance')
        ->assertNoJavaScriptErrors();
});

test('the budget plan has no accessibility issues', function () {
    $page = visit(route('finance.edit'));

    $page->click('@cadence-semi-monthly')
        ->click('@add-payables-mid-month')
        ->click('@sweep-mid-month')
        ->assertNoAccessibilityIssues();
});

// The --goal-* tokens carry separate dark steps, so the tinted allocation
// surfaces have to be checked against the dark card as well as the light one.
test('the budget plan has no accessibility issues in dark mode', function () {
    $page = visit(route('finance.edit'))->inDarkMode();

    $page->click('@cadence-semi-monthly')
        ->type('@income-mid-month', '30000')
        ->click('@add-payables-mid-month')
        ->type('@item-amount-payables-mid-month-0', '29000')
        ->assertSeeIn('@paycheck-mid-month', 'Tight')
        ->assertNoAccessibilityIssues()
        ->click('@sweep-mid-month')
        ->assertSeeIn('@paycheck-mid-month', 'Fully allocated')
        ->assertNoAccessibilityIssues();
});

test('a gross works out the take-home on the paycheck', function () {
    $page = visit(route('finance.edit'));

    $page->click('@pay-basis-gross')
        ->type('@gross-monthly', '40000')
        ->assertSeeIn('@deduction-sss', '₱1,750.00')
        ->assertSeeIn('@deduction-philhealth', '₱1,000.00')
        ->assertSeeIn('@deduction-pagibig', '₱200.00')
        ->assertSeeIn('@deduction-tax', '₱2,618.40')
        ->assertSeeIn('@gross-take-home', '₱34,431.60')
        ->assertValue('@income-monthly', '34431.6')
        ->assertDisabled('@income-monthly')
        ->assertNoJavaScriptErrors();
});

// Tax comes off both paychecks, half each; the contributions only off the end
// of the month.
test('semi-monthly pay splits the tax and leaves contributions to the end of the month', function () {
    $page = visit(route('finance.edit'));

    $page->click('@cadence-semi-monthly')
        ->click('@pay-basis-gross')
        ->type('@gross-monthly', '40000')
        ->assertSeeIn('@gross-take-home', '₱34,431.60')
        ->assertValue('@income-mid-month', '18690.8')
        ->assertValue('@income-end-month', '15740.8')
        ->assertSee('Tax is split across both paychecks');
});

test('a gross plan comes back as a gross plan', function () {
    $page = visit(route('finance.edit'));

    $page->click('@pay-basis-gross')
        ->type('@gross-monthly', '40000')
        ->assertValue('@income-monthly', '34431.6')
        ->click('@save-plan')
        ->assertSee('Budget plan saved.');

    $page->refresh()
        ->assertPathIs('/finance')
        ->assertValue('@gross-monthly', '40000')
        ->assertSeeIn('@gross-take-home', '₱34,431.60')
        ->assertDisabled('@income-monthly')
        // Opening on a saved gross is not an edit.
        ->assertSee('Save plan')
        ->assertDontSee('Unsaved changes');
});

test('switching back to take-home hands the paycheck back to you', function () {
    $page = visit(route('finance.edit'));

    $page->click('@pay-basis-gross')
        ->type('@gross-monthly', '40000')
        ->assertValue('@income-monthly', '34431.6')
        ->click('@pay-basis-take-home')
        ->assertMissing('@gross-pay')
        ->assertEnabled('@income-monthly')
        ->assertValue('@income-monthly', '34431.6');
});

test('the gross breakdown has no accessibility issues', function () {
    $page = visit(route('finance.edit'));

    $page->click('@pay-basis-gross')
        ->type('@gross-monthly', '40000')
        ->assertSeeIn('@gross-take-home', '₱34,431.60')
        ->assertNoAccessibilityIssues();
});

test('the gross breakdown has no accessibility issues in dark mode', function () {
    $page = visit(route('finance.edit'))->inDarkMode();

    $page->click('@pay-basis-gross')
        ->type('@gross-monthly', '40000')
        ->assertSeeIn('@gross-take-home', '₱34,431.60')
        ->assertNoAccessibilityIssues();
});
