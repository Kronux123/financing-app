<?php

namespace App\Actions\Payouts;

use App\Models\Payout;
use App\Models\User;
use App\Notifications\PaydaysAwaitingReview;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Emails people whose paydays are sitting unreviewed.
 *
 * A payday opens by itself, but only a finalized one reaches the history, so a
 * payday nobody comes back to is a month the calendar never fills in. This is
 * the nudge that reaches someone who is not on the site.
 *
 * Each pending payday is chased on a fixed schedule — on the day, three days
 * on, a week on — and then left alone, so somebody who has stopped using the
 * app is not emailed forever. Every user gets at most one email a run however
 * many of their paydays are due: the email is a digest of all of them.
 */
class PaydayReminders
{
    /** Days after a payday that each reminder for it goes out. */
    public const SCHEDULE = [0, 3, 7];

    /**
     * A payday older than this is never chased, even if it never had a
     * reminder. Without it, switching reminders on — or shipping this — would
     * email everybody about paydays from months ago.
     */
    public const GIVE_UP_AFTER_DAYS = 14;

    /**
     * @return int How many people were emailed.
     */
    public function send(CarbonInterface $today): int
    {
        $today = $today->copy()->startOfDay();
        $emailed = 0;

        User::query()
            ->where('payday_reminders', true)
            /*
             * Unverified addresses are skipped. A typo at sign-up is somebody
             * else's inbox, and a budget is not something to email a stranger.
             */
            ->whereNotNull('email_verified_at')
            ->whereHas('payouts', function (Builder $query) use ($today): void {
                /** @var Builder<Payout> $query */
                $this->chaseable($query, $today);
            })
            ->chunkById(100, function ($users) use ($today, &$emailed): void {
                foreach ($users as $user) {
                    $emailed += $this->remind($user, $today) ? 1 : 0;
                }
            });

        return $emailed;
    }

    /**
     * How many reminders a payday should have had by today: one for each step
     * of the schedule it has reached.
     *
     * A run that was missed is caught up in one email rather than several. A
     * payday first seen on day 5 is owed two reminders, gets one, and is marked
     * as having had both.
     */
    public function owedBy(Payout $payout, CarbonInterface $today): int
    {
        $days = (int) $payout->paid_on->copy()->startOfDay()->diffInDays($today->copy()->startOfDay(), false);

        if ($days < 0 || $days > self::GIVE_UP_AFTER_DAYS) {
            return 0;
        }

        return count(array_filter(self::SCHEDULE, fn (int $after): bool => $after <= $days));
    }

    /**
     * What the email lists: every payday still waiting, oldest first, not only
     * the ones whose reminder fell due. One that is past being chased is still
     * waiting, and still worth a line.
     *
     * @return list<array{paid_on: string, label: string, planned: int}>
     */
    public function waitingFor(User $user): array
    {
        return $this->pendingFor($user)
            ->with('incomes')
            ->get()
            ->map(fn (Payout $payout): array => [
                'paid_on' => $payout->paid_on->toDateString(),
                'label' => $payout->paycheck_label,
                'planned' => $payout->plannedIncome(),
            ])
            ->values()
            ->all();
    }

    private function remind(User $user, CarbonInterface $today): bool
    {
        $claimed = 0;

        foreach ($this->pendingFor($user)->get() as $payout) {
            $owed = $this->owedBy($payout, $today);

            if ($owed <= $payout->reminders_sent) {
                continue;
            }

            /*
             * Claimed with a conditional update rather than a save, so two runs
             * at once cannot both send for the same reminder: only the one that
             * still sees the old count gets a row back.
             */
            $claimed += Payout::query()
                ->whereKey($payout->getKey())
                ->where('reminders_sent', $payout->reminders_sent)
                ->update(['reminders_sent' => $owed]);
        }

        if ($claimed === 0) {
            return false;
        }

        $user->notify(new PaydaysAwaitingReview($this->waitingFor($user)));

        return true;
    }

    /**
     * Pending paydays, oldest first. reorder(), not orderBy(): the relation is
     * declared newest-first, and a second ordering would only break its ties.
     *
     * @return HasMany<Payout, User>
     */
    private function pendingFor(User $user): HasMany
    {
        return $user->payouts()->pending()->reorder('paid_on')->orderBy('id');
    }

    /**
     * Pending paydays that may still be owed a reminder. The final say is
     * owedBy(); this only keeps users with nothing due out of the run.
     *
     * @param  Builder<Payout>  $query
     * @return Builder<Payout>
     */
    private function chaseable(Builder $query, CarbonInterface $today): Builder
    {
        return $query->pending()
            ->where('reminders_sent', '<', count(self::SCHEDULE))
            ->whereDate('paid_on', '<=', $today->toDateString())
            ->whereDate('paid_on', '>=', $today->copy()->subDays(self::GIVE_UP_AFTER_DAYS)->toDateString());
    }
}
