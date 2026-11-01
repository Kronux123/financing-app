<?php

use App\Models\User;
use App\Notifications\PaydaysAwaitingReview;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;

test('the verification email is in Kept\'s words', function () {
    $user = User::factory()->unverified()->create(['name' => 'Maria Santos']);

    $mail = (new VerifyEmail)->toMail($user);

    expect($mail->subject)->toBe('Confirm your email for Kept')
        ->and($mail->greeting)->toBe('Welcome to Kept, Maria!')
        ->and($mail->actionText)->toBe('Confirm my email')
        ->and($mail->actionUrl)->toContain('/email/verify/'.$user->id.'/');
});

test('the password reset email is in Kept\'s words', function () {
    $user = User::factory()->create(['name' => 'Maria Santos']);

    $mail = (new ResetPassword('a-token'))->toMail($user);

    expect($mail->subject)->toBe('Reset your Kept password')
        ->and($mail->actionText)->toBe('Choose a new password')
        ->and($mail->actionUrl)->toBe(route('password.reset', ['token' => 'a-token', 'email' => $user->email]));
});

// One theme for every email the app sends: the jade button and the drawn mark,
// rather than the framework's black button and plain app name.
test('every email is drawn with the Kept theme', function () {
    $user = User::factory()->create();

    $emails = [
        (new VerifyEmail)->toMail($user),
        (new PaydaysAwaitingReview([
            ['paid_on' => '2026-05-29', 'label' => 'Monthly pay', 'planned' => 2_500_000],
        ]))->toMail($user),
    ];

    foreach ($emails as $mail) {
        $html = (string) $mail->render();

        expect($html)->toContain('class="brand-mark"')
            ->and($html)->toContain('background-color: #0d7050')
            ->and($html)->toContain('— Kept')
            ->and($html)->not->toContain('All rights reserved');
    }
});
