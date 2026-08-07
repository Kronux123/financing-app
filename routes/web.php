<?php

use App\Http\Controllers\FinanceController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard/index')->name('dashboard');
    Route::inertia('dashboard/months', 'months/index')->name('dashboard.months');
    Route::inertia('dashboard/activities', 'activities/index')->name('dashboard.activities');
    Route::get('finance', [FinanceController::class, 'edit'])->name('finance.edit');
    Route::put('finance', [FinanceController::class, 'update'])->name('finance.update');
    Route::inertia('debt', 'debt/index')->name('debt.index');
    Route::inertia('payouts', 'payouts/index')->name('payouts.index');
});

require __DIR__.'/settings.php';
