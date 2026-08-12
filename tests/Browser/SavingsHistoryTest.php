<?php

use App\Enums\ExpenseGroup;
use App\Models\BudgetPlan;
use App\Models\ExpenseItem;
use App\Models\Payout;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;

beforeEach(function () {
    $this->user = User::factory()->create();

    $this->actingAs($this->user);
});

/**
 * A plan old enough to have a payday behind it, with that payday opened.
 *
 * Built with factories because a payout only exists once `payouts:open` has run,
 * and the command leaves alone any payday older than the plan.
 */
function planWithPayday(User $user, int $income = 2_500_000, int $rent = 900_000): BudgetPlan
{
    $plan = BudgetPlan::factory()->for($user)->withPaychecks($income)->create();

    ExpenseItem::factory()->for($plan)->for($plan->paychecks()->firstOrFail())
        ->create(['group' => ExpenseGroup::Payables, 'name' => 'Rent', 'amount' => $rent]);

    $plan->forceFill(['created_at' => now()->subMonths(6)])->save();

    Artisan::call('payouts:open');

    return $plan->refresh();
}

/** The card key of the newest payday, the one the payouts page opens on. */
function newestPaydayKey(): string
{
    $payout = Payout::query()->orderByDesc('paid_on')->firstOrFail();

    return $payout->paid_on->format('Y-m').'-'.$payout->paycheck_key;
}

test('the dashboard says nothing is settled before a payday is finalized', function () {
    planWithPayday($this->user);

    $page = visit(route('dashboard'));

    $page->assertSee('Monthly savings')
        ->assertSeeIn('@savings-empty', 'No month has been settled yet')
        ->assertNoJavaScriptErrors();
});

// The whole point: what shows up is what a settled payday actually did, not what
// the plan said it would.
test('finalizing a payday puts the month on the dashboard', function () {
    planWithPayday($this->user);
    $key = newestPaydayKey();

    $page = visit(route('payouts.index'));

    $page->click("@payout-toggle-{$key}")
        ->assertSeeIn("@payout-status-{$key}", 'Finalized')
        ->click('@nav-dashboard')
        ->assertMissing('@savings-empty')
        // 25,000 in, 9,000 on rent.
        ->assertSee('₱16,000')
        ->assertNoJavaScriptErrors();
});

test('a correction is what the month reports, not the plan', function () {
    planWithPayday($this->user);
    $key = newestPaydayKey();

    $page = visit(route('payouts.index'));

    // Rent came out dearer, so less was put by that month.
    $page->type("@payout-line-{$key}-0", '9500')
        ->click("@payout-toggle-{$key}")
        ->assertSeeIn("@payout-status-{$key}", 'Finalized')
        ->click('@nav-dashboard')
        ->assertSee('₱15,500');
});

test('the savings calendar says so when no month is settled', function () {
    planWithPayday($this->user);

    $page = visit(route('dashboard.months'));

    $page->assertSee('Savings calendar')
        ->assertSeeIn('@calendar-empty', 'No month has been settled yet')
        ->assertNoJavaScriptErrors();
});

test('a settled month lands in the calendar under its own year', function () {
    planWithPayday($this->user);
    $key = newestPaydayKey();
    $year = Payout::query()->orderByDesc('paid_on')->firstOrFail()->paid_on->format('Y');

    $page = visit(route('payouts.index'));

    $page->click("@payout-toggle-{$key}")
        ->assertSeeIn("@payout-status-{$key}", 'Finalized')
        ->click('@nav-dashboard')
        ->click('View all months')
        ->assertMissing('@calendar-empty')
        ->assertSeeIn('@calendar-year', $year)
        ->assertSeeIn('@calendar-total', '₱16,000')
        ->assertSee('across 1 month')
        ->assertNoJavaScriptErrors();
});

/*
 * The hrefs are asserted rather than followed. Clicking one hands the download to
 * the browser, which either saves a file outside the run or sits waiting for a
 * dialog — and a browser test that waits has no deadline of its own. What the
 * files themselves contain is settled in tests/Feature/MonthExportTest.php.
 */
test('a settled month offers both breakdowns, and the year offers a sheet', function () {
    planWithPayday($this->user);
    $key = newestPaydayKey();
    $paidOn = Payout::query()->orderByDesc('paid_on')->firstOrFail()->paid_on;
    $ordinal = (int) $paidOn->format('n');

    $page = visit(route('payouts.index'));

    $page->click("@payout-toggle-{$key}")
        ->assertSeeIn("@payout-status-{$key}", 'Finalized')
        ->click('@nav-dashboard')
        ->click('View all months')
        ->assertVisible("@export-sheet-{$ordinal}")
        ->assertAttributeContains("@export-sheet-{$ordinal}", 'href', "/dashboard/months/{$paidOn->format('Y-m')}/sheet")
        ->assertAttributeContains("@export-pdf-{$ordinal}", 'href', "/dashboard/months/{$paidOn->format('Y-m')}/pdf")
        ->assertAttributeContains('@export-year-sheet', 'href', "/dashboard/years/{$paidOn->format('Y')}/sheet")
        /** A month with nothing settled has nothing to download. */
        ->assertMissing('@export-sheet-'.($ordinal === 12 ? 11 : $ordinal + 1))
        ->assertNoJavaScriptErrors();
});

// An icon on its own says nothing about what it will download, so the label is
// the whole explanation — and it is the accessible name as well as the tooltip.
test('hovering a download says what it will download', function () {
    planWithPayday($this->user);
    $key = newestPaydayKey();
    $paidOn = Payout::query()->orderByDesc('paid_on')->firstOrFail()->paid_on;
    $ordinal = (int) $paidOn->format('n');
    $month = $paidOn->format('F');

    $page = visit(route('payouts.index'));

    $page->click("@payout-toggle-{$key}")
        ->assertSeeIn("@payout-status-{$key}", 'Finalized')
        ->click('@nav-dashboard')
        ->click('View all months')
        ->assertAriaAttribute("@export-sheet-{$ordinal}", 'label', "Download {$month} spreadsheet")
        ->assertAriaAttribute("@export-pdf-{$ordinal}", 'label', "Download {$month} PDF")
        ->hover("@export-sheet-{$ordinal}")
        ->assertSee("Download {$month} spreadsheet")
        ->assertNoJavaScriptErrors();
});

test('the savings calendar has no accessibility issues', function () {
    planWithPayday($this->user);
    $key = newestPaydayKey();

    $page = visit(route('payouts.index'));

    $page->click("@payout-toggle-{$key}")
        ->assertSeeIn("@payout-status-{$key}", 'Finalized')
        ->click('@nav-dashboard')
        ->click('View all months')
        ->wait(5)
        ->assertNoAccessibilityIssues();
});

test('the savings calendar has no accessibility issues in dark mode', function () {
    planWithPayday($this->user);
    $key = newestPaydayKey();

    $page = visit(route('payouts.index'))->inDarkMode();

    $page->click("@payout-toggle-{$key}")
        ->assertSeeIn("@payout-status-{$key}", 'Finalized')
        ->click('@nav-dashboard')
        ->click('View all months')
        ->wait(5)
        ->assertNoAccessibilityIssues();
});
