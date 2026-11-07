<?php

use App\Enums\ExpenseGroup;
use App\Models\BudgetPlan;
use App\Models\ExpenseItem;
use App\Models\Payout;
use App\Models\User;
use App\Notifications\PaydaysAwaitingReview;
use Illuminate\Support\Facades\Artisan;

beforeEach(function () {
    $this->user = User::factory()->walkthroughsSeen()->create();

    $this->actingAs($this->user);
});

/**
 * A plan old enough to have a payday behind it, with that payday open and
 * waiting. Named apart from SavingsHistoryTest's helper, which builds the same
 * thing: Pest loads every file into one process.
 */
function planAwaitingReview(User $user): BudgetPlan
{
    $plan = BudgetPlan::factory()->for($user)->withPaychecks(2_500_000)->create();

    ExpenseItem::factory()->for($plan)->for($plan->paychecks()->firstOrFail())
        ->create(['group' => ExpenseGroup::Payables, 'name' => 'Rent', 'amount' => 900_000]);

    $plan->forceFill(['created_at' => now()->subMonths(6)])->save();

    Artisan::call('payouts:open');

    return $plan->refresh();
}

test('payouts in the sidebar counts the paydays waiting for review', function () {
    planAwaitingReview($this->user);
    $pending = Payout::query()->pending()->count();

    $page = visit(route('dashboard'));

    $page->assertSeeIn('@nav-payouts-badge', (string) $pending)
        ->assertNoJavaScriptErrors();
});

test('the sidebar shows no count when nothing is waiting', function () {
    $page = visit(route('dashboard'));

    $page->assertMissing('@nav-payouts-badge')
        ->assertNoJavaScriptErrors();
});

test('the dashboard says paydays are waiting and leads to them', function () {
    planAwaitingReview($this->user);

    $page = visit(route('dashboard'));

    $page->assertSeeIn('@pending-paydays-banner', 'waiting for you to review')
        ->click('@pending-paydays-review')
        ->assertPathIs('/payouts')
        ->assertNoJavaScriptErrors();
});

test('the banner can be dismissed', function () {
    planAwaitingReview($this->user);

    $page = visit(route('dashboard'));

    $page->assertVisible('@pending-paydays-banner')
        ->click('@pending-paydays-dismiss')
        ->assertMissing('@pending-paydays-banner')
        ->assertNoJavaScriptErrors();
});

test('the banner has no accessibility issues', function () {
    planAwaitingReview($this->user);

    visit(route('dashboard'))
        ->assertVisible('@pending-paydays-banner')
        ->assertNoAccessibilityIssues();
});

test('the banner has no accessibility issues in dark mode', function () {
    planAwaitingReview($this->user);

    visit(route('dashboard'))->inDarkMode()
        ->assertVisible('@pending-paydays-banner')
        ->assertNoAccessibilityIssues();
});

// Save is disabled until something changes — clicking it before the toggle
// would hang the run, so the toggle always comes first.
test('payday reminders can be turned off in settings', function () {
    $page = visit(route('notifications.edit'));

    $page->assertSee('Payday reminders')
        ->click('@payday-reminders-toggle')
        ->assertAttribute('@payday-reminders-toggle', 'aria-checked', 'false')
        ->click('@save-notifications')
        ->assertSee('Notification settings saved.')
        ->assertNoJavaScriptErrors();

    expect($this->user->fresh()->payday_reminders)->toBeFalse();
});

test('the notification settings have no accessibility issues', function () {
    visit(route('notifications.edit'))
        ->assertSee('Payday reminders')
        ->assertNoAccessibilityIssues();
});

test('the unsubscribe link turns reminders off once confirmed', function () {
    $page = visit(PaydaysAwaitingReview::unsubscribeUrl($this->user));

    $page->assertSee('Stop payday reminders')
        ->assertNoAccessibilityIssues()
        ->click('@confirm-unsubscribe')
        ->assertSeeIn('@unsubscribed', "You won't get payday reminder emails")
        ->assertNoJavaScriptErrors();

    expect($this->user->fresh()->payday_reminders)->toBeFalse();
});
