<?php

use App\Actions\Payouts\PaydayReminders;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\MonthExportController;
use App\Http\Controllers\PaydayReminderUnsubscribeController;
use App\Http\Controllers\PayoutController;
use App\Http\Controllers\PayoutStatusController;
use App\Http\Controllers\WalkthroughController;
use App\Http\Middleware\OpenDuePayouts;
use App\Notifications\PaydaysAwaitingReview;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

/*
 * The unsubscribe link in a payday reminder. Signed rather than behind a login,
 * so it works straight from the inbox. The POST is also what a mail client's
 * one-click unsubscribe sends, which is why it is exempt from CSRF in
 * bootstrap/app.php — a mail client has no token to send.
 */
Route::middleware('signed')->group(function () {
    Route::get('payday-reminders/{user}/unsubscribe', [PaydayReminderUnsubscribeController::class, 'show'])
        ->name('payday-reminders.unsubscribe');
    Route::post('payday-reminders/{user}/unsubscribe', [PaydayReminderUnsubscribeController::class, 'store'])
        ->name('payday-reminders.unsubscribe.store');
});

Route::middleware(['auth', 'verified'])->group(function () {
    /*
     * The pages that read the ledger open any payday that is due first, so one
     * the scheduler missed is there when you look rather than a day later.
     */
    Route::middleware(OpenDuePayouts::class)->group(function () {
        Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('dashboard/months', [DashboardController::class, 'months'])->name('dashboard.months');
        Route::get('dashboard/activities', [ActivityController::class, 'index'])->name('dashboard.activities');
        Route::get('payouts', [PayoutController::class, 'index'])->name('payouts.index');
    });
    /*
     * Downloads of one month and of a whole year. The patterns keep `2026-07`
     * and `2026` apart, so a month can never be read as a year or the other way
     * about; the controller refuses the impossible months the pattern allows.
     */
    Route::get('dashboard/months/{month}/sheet', [MonthExportController::class, 'monthSheet'])
        ->where('month', '\d{4}-\d{2}')->name('dashboard.months.sheet');
    Route::get('dashboard/months/{month}/pdf', [MonthExportController::class, 'monthPdf'])
        ->where('month', '\d{4}-\d{2}')->name('dashboard.months.pdf');
    Route::get('dashboard/years/{year}/sheet', [MonthExportController::class, 'yearSheet'])
        ->where('year', '\d{4}')->name('dashboard.years.sheet');
    Route::get('finance', [FinanceController::class, 'edit'])->name('finance.edit');
    Route::put('finance', [FinanceController::class, 'update'])->name('finance.update');
    Route::get('finance/deductions', [FinanceController::class, 'deductions'])->name('finance.deductions');
    Route::get('finance/export', [FinanceController::class, 'export'])->name('finance.export');
    Route::post('finance/import', [FinanceController::class, 'import'])->name('finance.import');
    Route::inertia('debt', 'debt/index')->name('debt.index');
    Route::put('payouts/{payout}', [PayoutController::class, 'update'])->name('payouts.update');
    Route::patch('payouts/{payout}/status', PayoutStatusController::class)->name('payouts.status');
    Route::put('walkthroughs/{page}', WalkthroughController::class)->name('walkthroughs.update');
});

/*
 * The reminder email, rendered in the browser while working on it. Local only,
 * and built from your own pending paydays, so nothing is sent. Mailpit shows
 * the real thing once `php artisan payouts:remind` has run.
 */
if (app()->isLocal()) {
    Route::get('dev/mail/paydays-awaiting-review', function (Request $request, PaydayReminders $reminders) {
        return (new PaydaysAwaitingReview($reminders->waitingFor($request->user())))->toMail($request->user());
    })->middleware('auth');
}

require __DIR__.'/settings.php';
