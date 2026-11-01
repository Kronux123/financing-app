<?php

namespace App\Notifications;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;
use Symfony\Component\Mime\Email;

/**
 * The digest PaydayReminders sends: every payday still waiting for review.
 *
 * Carries a snapshot of the paydays rather than the models, so the email says
 * what was true when the run decided to send it, and the queue does not have to
 * load anything back.
 */
class PaydaysAwaitingReview extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  list<array{paid_on: string, label: string, planned: int}>  $paydays  Amounts in centavos.
     */
    public function __construct(public array $paydays)
    {
        $this->afterCommit();
    }

    /**
     * @return array<int, string>
     */
    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $count = count($this->paydays);
        $unsubscribe = self::unsubscribeUrl($notifiable);

        return (new MailMessage)
            ->subject($count === 1
                ? 'A payday is waiting for you to review'
                : "{$count} paydays are waiting for you to review")
            ->markdown('mail.paydays-awaiting-review', [
                'name' => strtok($notifiable->name, ' '),
                'count' => $count,
                'paydays' => array_map(fn (array $payday): array => $this->row($payday), $this->paydays),
                'total' => self::peso(array_sum(array_column($this->paydays, 'planned'))),
                'reviewUrl' => route('payouts.index'),
                'unsubscribeUrl' => $unsubscribe,
            ])
            /*
             * The header mail clients turn into their own "Unsubscribe" button.
             * List-Unsubscribe-Post makes it one click: the client POSTs to the
             * link, which the route accepts without a CSRF token.
             */
            ->withSymfonyMessage(function (Email $email) use ($unsubscribe): void {
                $email->getHeaders()->addTextHeader('List-Unsubscribe', "<{$unsubscribe}>");
                $email->getHeaders()->addTextHeader('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
            });
    }

    /**
     * One payday as the email draws it: a calendar badge, the paycheck, the
     * day it landed and what the plan said would come in.
     *
     * @param  array{paid_on: string, label: string, planned: int}  $payday
     * @return array{month: string, day: string, label: string, date: string, amount: string}
     */
    private function row(array $payday): array
    {
        $paidOn = CarbonImmutable::parse($payday['paid_on']);

        return [
            'month' => $paidOn->format('M'),
            'day' => $paidOn->format('j'),
            'label' => $payday['label'],
            'date' => $paidOn->format('l, F j, Y'),
            'amount' => self::peso($payday['planned']),
        ];
    }

    /** Whole pesos from centavos, as the app shows them. */
    private static function peso(int $centavos): string
    {
        return '₱'.number_format($centavos / 100);
    }

    /**
     * Signed, so it works from the inbox without signing in, and permanent,
     * because an email can be opened long after it was sent.
     */
    public static function unsubscribeUrl(User $user): string
    {
        return URL::signedRoute('payday-reminders.unsubscribe', ['user' => $user->getKey()]);
    }
}
