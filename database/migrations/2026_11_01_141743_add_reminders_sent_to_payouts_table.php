<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * How many reminder emails a pending payday has had — see PaydayReminders.
 *
 * Kept on the payday rather than worked out from the date, so the daily run is
 * idempotent: a run that happens twice finds the count already raised and sends
 * nothing, and a missed run is caught up by the next one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payouts', function (Blueprint $table) {
            $table->unsignedTinyInteger('reminders_sent')->default(0)->after('finalized_at');
        });
    }

    public function down(): void
    {
        Schema::table('payouts', function (Blueprint $table) {
            $table->dropColumn('reminders_sent');
        });
    }
};
