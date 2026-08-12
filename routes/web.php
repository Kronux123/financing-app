<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\PayoutController;
use App\Http\Controllers\PayoutStatusController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('dashboard/months', [DashboardController::class, 'months'])->name('dashboard.months');
    Route::get('dashboard/activities', [ActivityController::class, 'index'])->name('dashboard.activities');
    Route::get('finance', [FinanceController::class, 'edit'])->name('finance.edit');
    Route::put('finance', [FinanceController::class, 'update'])->name('finance.update');
    Route::inertia('debt', 'debt/index')->name('debt.index');
    Route::get('payouts', [PayoutController::class, 'index'])->name('payouts.index');
    Route::put('payouts/{payout}', [PayoutController::class, 'update'])->name('payouts.update');
    Route::patch('payouts/{payout}/status', PayoutStatusController::class)->name('payouts.status');
});

require __DIR__.'/settings.php';
