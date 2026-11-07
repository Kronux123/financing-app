<?php

use App\Models\Payout;
use App\Models\PayoutIncome;
use App\Models\PayoutLine;
use App\Models\User;

/**
 * Six paydays of five rows each: the paycheck that came in, then the four lines
 * it paid. Thirty rows is enough for three pages at the default size and for the
 * page-size steps to visibly collapse them.
 *
 * Numbered so a row names the payday it belongs to, which is what lets a page
 * assertion say which paydays are on screen without counting.
 */
function recordPaydays(User $user, int $count = 6): void
{
    foreach (range(1, $count) as $number) {
        $payout = Payout::factory()->for($user)->finalized()->create([
            'paycheck_label' => "Payday {$number}",
            // Newest first, so payday 1 opens the log.
            'paid_on' => now()->subMonthsNoOverflow($number - 1)->startOfMonth()->toDateString(),
        ]);

        PayoutIncome::factory()->for($payout)->create([
            'label' => "Paycheck {$number}",
            'actual' => 2_500_000,
        ]);

        foreach (['Rent', 'Power', 'Food', 'Savings'] as $position => $name) {
            PayoutLine::factory()->for($payout)->create([
                'name' => "{$name} {$number}",
                'actual' => 100_000,
                // Explicit, because the relation orders on it and rows sharing a
                // position have no order of their own to fall back on.
                'position' => $position,
            ]);
        }
    }
}

beforeEach(function () {
    $this->user = User::factory()->walkthroughsSeen()->create();
    $this->actingAs($this->user);
});

test('the activity log opens on the first page of ten rows', function () {
    recordPaydays($this->user);

    $page = visit(route('dashboard.activities'));

    $page->assertSee('Activities')
        ->assertSeeIn('@pagination-summary', 'Showing 1–10 of 30 activities')
        ->assertSee('Page 1 of 3')
        ->assertSee('Rent 1')
        ->assertDontSee('Rent 3')
        ->assertNoJavaScriptErrors();
});

test('the next page shows the following rows', function () {
    recordPaydays($this->user);

    $page = visit(route('dashboard.activities'));

    $page->click('@page-next')
        ->assertSeeIn('@pagination-summary', 'Showing 11–20 of 30 activities')
        ->assertSee('Rent 3')
        ->assertDontSee('Rent 1');
});

test('the last page holds the oldest paydays', function () {
    recordPaydays($this->user);

    $page = visit(route('dashboard.activities'));

    $page->click('@page-last')
        ->assertSeeIn('@pagination-summary', 'Showing 21–30 of 30 activities')
        ->assertSee('Rent 6');
});

test('a page can be jumped to by number', function () {
    recordPaydays($this->user);

    $page = visit(route('dashboard.activities'));

    $page->click('@page-3')
        ->assertSeeIn('@pagination-summary', 'Showing 21–30 of 30 activities')
        ->click('@page-1')
        ->assertSeeIn('@pagination-summary', 'Showing 1–10 of 30 activities');
});

test('the steps are disabled at either end of the log', function () {
    recordPaydays($this->user);

    $page = visit(route('dashboard.activities'));

    $page->assertDisabled('@page-first')
        ->assertDisabled('@page-prev')
        ->assertEnabled('@page-next')
        ->click('@page-last')
        ->assertDisabled('@page-next')
        ->assertDisabled('@page-last')
        ->assertEnabled('@page-prev');
});

test('showing more rows per page collapses the page count', function () {
    recordPaydays($this->user);

    $page = visit(route('dashboard.activities'));

    $page->click('@rows-25')
        ->assertSeeIn('@pagination-summary', 'Showing 1–25 of 30 activities')
        ->assertSee('Page 1 of 2')
        ->click('@rows-50')
        ->assertSeeIn('@pagination-summary', 'Showing 1–30 of 30 activities')
        ->assertSee('Page 1 of 1')
        ->assertDisabled('@page-next');
});

test('changing the page size keeps the first visible row in view', function () {
    recordPaydays($this->user);

    $page = visit(route('dashboard.activities'));

    $page->click('@page-3')
        ->assertSee('Rent 5')
        ->click('@rows-25')
        ->assertSeeIn('@pagination-summary', 'Showing 1–25 of 30 activities')
        ->assertSee('Rent 5');
});

/*
 * The page size rides in a cookie so the server can slice on the first render.
 * That it survives a reload is the visible half of it; the half worth having is
 * that the reload came back already holding twenty-five rows.
 */
test('the chosen page size becomes the default on the next visit', function () {
    recordPaydays($this->user);

    $page = visit(route('dashboard.activities'));

    $page->click('@rows-25')
        ->assertSeeIn('@pagination-summary', 'Showing 1–25 of 30 activities');

    // refresh() reloads in the same browser context, so the cookie survives.
    $page->refresh()
        ->assertPathIs('/dashboard/activities')
        ->assertSeeIn('@pagination-summary', 'Showing 1–25 of 30 activities')
        ->assertSee('Page 1 of 2');
});

/*
 * Stepping through the log is navigation, so a page is somewhere you can link
 * to and step back out of.
 */
test('the page is in the url and the back button undoes it', function () {
    recordPaydays($this->user);

    $page = visit(route('dashboard.activities'));

    $page->click('@page-next')
        ->assertQueryStringHas('page', '2')
        ->assertSeeIn('@pagination-summary', 'Showing 11–20 of 30 activities')
        ->back()
        ->assertSeeIn('@pagination-summary', 'Showing 1–10 of 30 activities');
});

test('a page can be opened directly by its url', function () {
    recordPaydays($this->user);

    $page = visit(route('dashboard.activities', ['page' => 3]));

    $page->assertSeeIn('@pagination-summary', 'Showing 21–30 of 30 activities')
        ->assertSee('Rent 6')
        ->assertNoJavaScriptErrors();
});

test('the log reads what the ledger holds', function () {
    $payout = Payout::factory()->for($this->user)->finalized()->create([
        'paycheck_label' => 'End of month',
    ]);

    PayoutIncome::factory()->for($payout)->create([
        'label' => 'Monthly pay',
        'actual' => 2_500_000,
    ]);
    PayoutLine::factory()->for($payout)->create([
        'name' => 'Rent',
        'actual' => 850_000,
    ]);
    PayoutLine::factory()->for($payout)->unplanned()->create(['position' => 1]);

    $page = visit(route('dashboard.activities'));

    $page->assertSee('Monthly pay')
        // Money in reads positive, money out negative, both in pesos.
        ->assertSee('+₱25,000')
        ->assertSee('-₱8,500')
        ->assertSee('End of month')
        ->assertSee('Payables')
        // Spending the plan never forecast says so beside itself.
        ->assertSee('Hospital visit')
        ->assertSee('Unplanned')
        ->assertSee('Completed')
        ->assertNoJavaScriptErrors();
});

/*
 * A payday that is still open to correction is shown rather than hidden, and
 * labelled so the figure beside it is not read as settled.
 */
test('a pending payday is labelled rather than dropped', function () {
    $payout = Payout::factory()->for($this->user)->create();

    PayoutLine::factory()->for($payout)->create(['name' => 'Rent']);

    $page = visit(route('dashboard.activities'));

    $page->assertSee('Rent')
        ->assertSee('Pending')
        ->assertDontSee('Completed');
});

/*
 * Nothing recorded is a state the log opens in for every new account, so it is
 * the first thing most people will see here.
 */
test('an account with no paydays is told so', function () {
    $page = visit(route('dashboard.activities'));

    $page->assertSee('No paydays recorded yet')
        ->assertDontSee('Rows per page')
        ->assertNoJavaScriptErrors();
});

test('the paginated activity log has no accessibility issues', function () {
    recordPaydays($this->user);

    $page = visit(route('dashboard.activities'));

    $page->click('@page-2')
        ->assertNoAccessibilityIssues();
});

// The status tints, the unplanned marker and the amount colours carry separate
// dark steps, so the table has to be checked against the dark card as well as
// the light one.
test('the paginated activity log has no accessibility issues in dark mode', function () {
    recordPaydays($this->user);

    $page = visit(route('dashboard.activities'))->inDarkMode();

    $page->click('@page-2')
        ->assertNoAccessibilityIssues();
});

test('the empty log has no accessibility issues', function () {
    $page = visit(route('dashboard.activities'));

    $page->assertNoAccessibilityIssues();
});
