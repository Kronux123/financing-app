<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\MonthExportController;
use App\Http\Controllers\PayoutController;
use App\Http\Controllers\PayoutStatusController;
use App\Http\Middleware\OpenDuePayouts;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

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
});

require __DIR__.'/settings.php';
