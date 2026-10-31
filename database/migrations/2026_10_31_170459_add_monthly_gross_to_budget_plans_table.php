<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pay before deductions, for a plan that would rather type its gross.
 *
 * Null means the paychecks carry take-home typed in by hand, which is how every
 * plan worked before this. Set, the paychecks' amounts are worked out from it on
 * save — see StatutoryDeductions — and stored as they always were, so payouts go
 * on copying `paychecks.amount` without knowing gross exists.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budget_plans', function (Blueprint $table) {
            /** Centavos, like every other amount. */
            $table->unsignedBigInteger('monthly_gross')->nullable()->after('cadence');
        });
    }

    public function down(): void
    {
        Schema::table('budget_plans', function (Blueprint $table) {
            $table->dropColumn('monthly_gross');
        });
    }
};
