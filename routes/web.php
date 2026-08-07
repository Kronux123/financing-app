<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard/index')->name('dashboard');
    Route::inertia('dashboard/months', 'months/index')->name('dashboard.months');
    Route::inertia('dashboard/activities', 'activities/index')->name('dashboard.activities');
    Route::inertia('finance', 'finance/index')->name('finance.edit');
    Route::inertia('debt', 'debt/index')->name('debt.index');
});

require __DIR__.'/settings.php';
