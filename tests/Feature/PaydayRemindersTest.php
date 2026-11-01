<?php

use App\Models\Payout;
use App\Models\User;
use App\Notifications\PaydaysAwaitingReview;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Markdown;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
});

/** A pending payday for the user, ₱25,000 planned unless told otherwise. */
function pendingPayday(User $user, string $paidOn, string $key = 'monthly'): Payout
{
    return Payout::factory()->for($user)->withPaycheckIncome()->create([
        'paid_on' => $paidOn,
        'paycheck_key' => $key,
        'paycheck_label' => $key === 'monthly' ? 'Monthly pay' : 'Mid-month pay',
    ]);
}

/** Runs the reminder at 01:15 UTC on the given day, as the schedule does. */
function remindOn(string $date): void
{
    test()->travelTo("{$date} 01:15");
    test()->artisan('payouts:remind')->assertSuccessful();
}

test('reminding is on the schedule, after paydays open', function () {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn ($event): bool => str_contains((string) $event->command, 'payouts:remind'));

    expect($events)->toHaveCount(1)
        ->and($events->first()->expression)->toBe('15 1 * * *');
});

test('a payday is reminded about on the day it lands', function () {
    $user = User::factory()->create();
    $payout = pendingPayday($user, '2026-05-29');

    remindOn('2026-05-29');

    Notification::assertSentTo($user, PaydaysAwaitingReview::class);
    expect($payout->fresh()->reminders_sent)->toBe(1);
});

test('running twice on the same day sends one email', function () {
    $user = User::factory()->create();
    pendingPayday($user, '2026-05-29');

    remindOn('2026-05-29');
    remindOn('2026-05-29');

    Notification::assertSentToTimes($user, PaydaysAwaitingReview::class, 1);
});

// On the day, three days on, a week on — then never again.
test('a payday is chased three times over a week and then left alone', function () {
    $user = User::factory()->create();
    $payout = pendingPayday($user, '2026-05-29');

    $sentBy = [];

    foreach (range(0, 20) as $day) {
        remindOn(now()->setDate(2026, 5, 29)->addDays($day)->toDateString());
        $sentBy[$day] = Notification::sent($user, PaydaysAwaitingReview::class)->count();
    }

    expect($sentBy[0])->toBe(1)
        ->and($sentBy[2])->toBe(1)
        ->and($sentBy[3])->toBe(2)
        ->and($sentBy[6])->toBe(2)
        ->and($sentBy[7])->toBe(3)
        ->and($sentBy[20])->toBe(3)
        ->and($payout->fresh()->reminders_sent)->toBe(3);
});

// A run that never happened is caught up in one email, not one per step missed.
test('missed runs are caught up in a single email', function () {
    $user = User::factory()->create();
    $payout = pendingPayday($user, '2026-05-29');

    remindOn('2026-06-03');

    Notification::assertSentToTimes($user, PaydaysAwaitingReview::class, 1);
    expect($payout->fresh()->reminders_sent)->toBe(2);

    remindOn('2026-06-05');

    Notification::assertSentToTimes($user, PaydaysAwaitingReview::class, 2);
});

test('a payday more than two weeks old is never chased', function () {
    $user = User::factory()->create();
    pendingPayday($user, '2026-05-01');

    remindOn('2026-05-29');

    Notification::assertNothingSent();
});

test('a finalized payday is not reminded about', function () {
    $user = User::factory()->create();
    Payout::factory()->for($user)->finalized()->create(['paid_on' => '2026-05-29']);

    remindOn('2026-05-29');

    Notification::assertNothingSent();
});

test('nobody who turned reminders off is emailed', function () {
    $user = User::factory()->create(['payday_reminders' => false]);
    pendingPayday($user, '2026-05-29');

    remindOn('2026-05-29');

    Notification::assertNothingSent();
});

// A typo at sign-up is somebody else's inbox.
test('an unverified address is not emailed', function () {
    $user = User::factory()->unverified()->create();
    $payout = pendingPayday($user, '2026-05-29');

    remindOn('2026-05-29');

    Notification::assertNothingSent();
    expect($payout->fresh()->reminders_sent)->toBe(0);
});

// One email a run, listing every payday still waiting — including one that is
// past being chased itself.
test('several waiting paydays come in one email', function () {
    $user = User::factory()->create();
    pendingPayday($user, '2026-05-15', 'mid-month');
    pendingPayday($user, '2026-05-29');
    pendingPayday($user, '2026-04-15', 'mid-month');

    remindOn('2026-05-29');

    Notification::assertSentToTimes($user, PaydaysAwaitingReview::class, 1);
    Notification::assertSentTo($user, function (PaydaysAwaitingReview $notification): bool {
        return collect($notification->paydays)->pluck('paid_on')->all() === ['2026-04-15', '2026-05-15', '2026-05-29']
            && $notification->paydays[0]['planned'] === 2_500_000;
    });
});

test('each person gets their own email about their own paydays', function () {
    $first = User::factory()->create();
    $second = User::factory()->create();
    pendingPayday($first, '2026-05-29');
    pendingPayday($second, '2026-05-26');

    remindOn('2026-05-29');

    Notification::assertSentTo($first, fn (PaydaysAwaitingReview $n): bool => count($n->paydays) === 1 && $n->paydays[0]['paid_on'] === '2026-05-29');
    Notification::assertSentTo($second, fn (PaydaysAwaitingReview $n): bool => count($n->paydays) === 1 && $n->paydays[0]['paid_on'] === '2026-05-26');
});

test('the date can be overridden to walk the schedule locally', function () {
    $this->travelTo('2026-05-29 01:15');
    $user = User::factory()->create();
    pendingPayday($user, '2026-05-29');

    $this->artisan('payouts:remind', ['--date' => '2026-05-28'])->assertSuccessful();
    Notification::assertNothingSent();

    $this->artisan('payouts:remind', ['--date' => '2026-06-01'])->assertSuccessful();
    Notification::assertSentTo($user, PaydaysAwaitingReview::class);
});

test('the reminder is queued mail', function () {
    $user = User::factory()->create();

    expect(new PaydaysAwaitingReview([]))->toBeInstanceOf(ShouldQueue::class)
        ->and((new PaydaysAwaitingReview([]))->via($user))->toBe(['mail']);
});

test('the email lists each payday and links to review and unsubscribe', function () {
    $user = User::factory()->create(['name' => 'Maria Santos']);

    $mail = (new PaydaysAwaitingReview([
        ['paid_on' => '2026-05-15', 'label' => 'Mid-month pay', 'planned' => 1_250_000],
        ['paid_on' => '2026-05-29', 'label' => 'Monthly pay', 'planned' => 2_500_050],
    ]))->toMail($user);

    $html = (string) $mail->render();

    expect($mail->subject)->toBe('2 paydays are waiting for you to review')
        ->and($html)->toContain('2 paydays are waiting for you')
        ->and($html)->toContain('Hi Maria,')
        ->and($html)->toContain('Friday, May 15, 2026')
        ->and($html)->toContain('Mid-month pay')
        ->and($html)->toContain('₱12,500')
        ->and($html)->toContain('₱25,001')
        // ₱12,500 and ₱25,000.50, rounded once on the sum, not twice.
        ->and($html)->toContain('Total planned')
        ->and($html)->toContain('₱37,501')
        ->and($html)->toContain('href="'.route('payouts.index').'"')
        ->and($html)->toContain(e(PaydaysAwaitingReview::unsubscribeUrl($user)));

    // The plain-text part lists the same paydays, not raw table markup.
    $text = (string) app(Markdown::class)->renderText($mail->markdown, $mail->data());

    expect($text)->toContain('Friday, May 15, 2026 · Mid-month pay · ₱12,500 planned')
        ->and($text)->not->toContain('<table');
});

test('one payday is spoken of in the singular', function () {
    $mail = (new PaydaysAwaitingReview([
        ['paid_on' => '2026-05-29', 'label' => 'Monthly pay', 'planned' => 2_500_000],
    ]))->toMail(User::factory()->create());

    expect($mail->subject)->toBe('A payday is waiting for you to review');
});
