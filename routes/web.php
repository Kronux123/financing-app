<?php

use App\Http\Controllers\FinanceController;
use App\Http\Controllers\PayoutController;
use App\Http\Controllers\PayoutStatusController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard/index')->name('dashboard');
    Route::inertia('dashboard/months', 'months/index')->name('dashboard.months');
    Route::inertia('dashboard/activities', 'activities/index')->name('dashboard.activities');
    Route::get('finance', [FinanceController::class, 'edit'])->name('finance.edit');
    Route::put('finance', [FinanceController::class, 'update'])->name('finance.update');
    Route::inertia('debt', 'debt/index')->name('debt.index');
    Route::get('payouts', [PayoutController::class, 'index'])->name('payouts.index');
    Route::put('payouts/{payout}', [PayoutController::class, 'update'])->name('payouts.update');
    Route::patch('payouts/{payout}/status', PayoutStatusController::class)->name('payouts.status');
});

require __DIR__.'/settings.php';
