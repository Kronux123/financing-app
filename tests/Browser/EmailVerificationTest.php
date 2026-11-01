<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();

    $this->user = User::factory()->unverified()->create(['email' => 'maria@example.com']);

    $this->actingAs($this->user);
});

// Signing in sends nothing, so the page says where the sign-up link went
// instead of claiming one was just sent.
test('an unconfirmed account is told where its link went', function () {
    $page = visit(route('dashboard'));

    $page->assertPathIs('/email/verify')
        ->assertSee('Confirm your email')
        ->assertSeeIn('@verify-email-address', 'maria@example.com')
        ->assertDontSee('just emailed')
        ->assertNoJavaScriptErrors();
});

test('a new link can be sent from the page', function () {
    $page = visit(route('verification.notice'));

    $page->click('@resend-verification')
        ->assertSeeIn('@verification-link-sent', 'A new link is on its way')
        ->assertNoJavaScriptErrors();

    Notification::assertSentTo($this->user, VerifyEmail::class);
});

test('the confirm page has no accessibility issues', function () {
    visit(route('verification.notice'))
        ->click('@resend-verification')
        ->assertVisible('@verification-link-sent')
        ->assertNoAccessibilityIssues();
});

test('the confirm page has no accessibility issues in dark mode', function () {
    visit(route('verification.notice'))->inDarkMode()
        ->click('@resend-verification')
        ->assertVisible('@verification-link-sent')
        ->assertNoAccessibilityIssues();
});
