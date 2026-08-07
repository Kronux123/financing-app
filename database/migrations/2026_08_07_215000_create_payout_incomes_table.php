<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What came in on a payday. The paycheck is one row; a bonus is another.
 *
 * Rows rather than two columns on `payouts` so that 13th month pay, bonuses and
 * side income all fall out without a shape change.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payout_incomes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payout_id')->constrained()->cascadeOnDelete();

            $table->string('source', 30);
            $table->string('label');

            /** Zero for anything the plan did not forecast. */
            $table->unsignedBigInteger('planned')->default(0);
            $table->unsignedBigInteger('actual')->default(0);

            $table->unsignedTinyInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_incomes');
    }
};
