<?php

use App\Models\Payout;
use App\Models\User;
use App\Notifications\PaydaysAwaitingReview;
use Inertia\Testing\AssertableInertia as Assert;

test('the notifications page shows whether reminders are on', function () {
    $user = User::factory()->create(['payday_reminders' => false]);

    $this->actingAs($user)
        ->get(route('notifications.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/notifications')
            ->where('paydayReminders', false));
});

test('reminders are on for a new account', function () {
    $user = User::factory()->create();

    expect($user->fresh()->payday_reminders)->toBeTrue();
});

// The model mirrors the column default. Without it a just-created user has no
// value at all, and the settings page showed reminders as off.
test('a user reads reminders as on before it is ever reloaded', function () {
    expect((new User)->payday_reminders)->toBeTrue()
        ->and(User::factory()->create()->payday_reminders)->toBeTrue();
});

test('payday reminders can be turned off and back on', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('notifications.update'), ['payday_reminders' => false])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('notifications.edit'));

    expect($user->fresh()->payday_reminders)->toBeFalse();

    $this->actingAs($user)
        ->patch(route('notifications.update'), ['payday_reminders' => true]);

    expect($user->fresh()->payday_reminders)->toBeTrue();
});

test('the setting has to be a yes or a no', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('notifications.update'), ['payday_reminders' => 'sometimes'])
        ->assertSessionHasErrors('payday_reminders');

    expect($user->fresh()->payday_reminders)->toBeTrue();
});

// Opening the link only asks: mail scanners fetch links, and must not
// unsubscribe anybody by doing so.
test('opening the unsubscribe link asks before doing anything', function () {
    $user = User::factory()->create();

    $this->get(PaydaysAwaitingReview::unsubscribeUrl($user))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/unsubscribe')
            ->where('unsubscribed', false));

    expect($user->fresh()->payday_reminders)->toBeTrue();
});

test('confirming the unsubscribe link turns reminders off without signing in', function () {
    $user = User::factory()->create();
    $url = PaydaysAwaitingReview::unsubscribeUrl($user);

    $this->post($url)->assertRedirect($url);

    expect($user->fresh()->payday_reminders)->toBeFalse();

    $this->get($url)->assertInertia(fn (Assert $page) => $page->where('unsubscribed', true));
});

test('an unsubscribe link that was tampered with is refused', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $forged = str_replace(
        "/payday-reminders/{$user->id}/",
        "/payday-reminders/{$other->id}/",
        PaydaysAwaitingReview::unsubscribeUrl($user),
    );

    $this->post($forged)->assertForbidden();
    $this->post(route('payday-reminders.unsubscribe.store', $other))->assertForbidden();

    expect($other->fresh()->payday_reminders)->toBeTrue();
});

test('every page knows how many paydays are waiting', function () {
    $user = User::factory()->create();
    Payout::factory()->for($user)->count(2)->sequence(
        ['paid_on' => '2026-05-15', 'paycheck_key' => 'mid-month'],
        ['paid_on' => '2026-05-29', 'paycheck_key' => 'monthly'],
    )->create();
    Payout::factory()->for($user)->finalized()->create(['paid_on' => '2026-04-30']);
    // Somebody else's do not count.
    Payout::factory()->create();

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page->where('pendingPaydays', 2));
});

test('an unverified account is sent to verify its email first', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertRedirect(route('verification.notice'));
});
