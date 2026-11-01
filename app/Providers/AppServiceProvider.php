<?php

namespace App\Providers;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureAuthEmails();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    /**
     * The two emails Fortify sends, in Kept's voice rather than the framework's
     * stock wording. The look comes from the mail theme (config/mail.php); this
     * is only the words.
     */
    protected function configureAuthEmails(): void
    {
        VerifyEmail::toMailUsing(fn (User $user, string $url): MailMessage => (new MailMessage)
            ->subject('Confirm your email for Kept')
            ->greeting('Welcome to Kept, '.strtok($user->name, ' ').'!')
            ->line('One quick step before you start planning: confirm that this is your email address.')
            ->action('Confirm my email', $url)
            ->line('Kept only emails you about your own paydays: a reminder when one is waiting for review, and nothing you have not asked for.')
            ->line('The link works for '.config('auth.verification.expire', 60).' minutes. If you did not sign up for Kept, ignore this email and the address stays unconfirmed.')
            ->salutation('— Kept'));

        ResetPassword::toMailUsing(function (User $user, string $token): MailMessage {
            $url = route('password.reset', [
                'token' => $token,
                'email' => $user->getEmailForPasswordReset(),
            ]);
            $minutes = config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

            return (new MailMessage)
                ->subject('Reset your Kept password')
                ->greeting('Hi '.strtok($user->name, ' ').',')
                ->line('Someone, hopefully you, asked to reset the password on your Kept account.')
                ->action('Choose a new password', $url)
                ->line("The link works for {$minutes} minutes. If you did not ask for this, ignore this email and your password stays as it is.")
                ->salutation('— Kept');
        });
    }
}
