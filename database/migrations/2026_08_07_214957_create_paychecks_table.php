<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row for monthly pay, two for semi-monthly.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paychecks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_plan_id')->constrained()->cascadeOnDelete();

            /**
             * Payouts snapshot this string rather than holding a foreign key,
             * so it has to stay stable: `monthly`, `mid_month`, `end_month`.
             */
            $table->string('key', 20);
            $table->string('label');

            /**
             * Null means the last day of the month, which varies. A second
             * boolean would be clearer to read but could contradict this one,
             * and there is no correct answer when it does.
             */
            $table->unsignedTinyInteger('day_of_month')->nullable();

            $table->unsignedBigInteger('amount')->default(0);

            /** Sends whatever this paycheck has left over to savings. */
            $table->boolean('saves_remainder')->default(false);

            $table->unsignedTinyInteger('position')->default(0);
            $table->timestamps();

            $table->unique(['budget_plan_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paychecks');
    }
};
