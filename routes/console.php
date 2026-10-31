<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Paydays land on the 15th and the last day of the month, but this runs every
 * day: a run that is missed has to be caught up by the next one, not waited a
 * month for. The command only opens what is not already there.
 *
 * Pages that read the ledger also open what is due as they load (the
 * OpenDuePayouts middleware), so this is the backstop for paydays nobody comes
 * to look at rather than the only way one appears.
 *
 * withoutOverlapping because a slow run must not be joined by the next one.
 */
Schedule::command('payouts:open')
    ->dailyAt('01:00')
    ->withoutOverlapping();
