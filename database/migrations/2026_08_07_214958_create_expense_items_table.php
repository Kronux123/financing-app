<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Every payable, plus the single allowance and savings figures.
 *
 * The swept "remaining balance" line is deliberately not a row here. It is
 * derived from `paychecks.saves_remainder` and must stay derived, or it drifts
 * out of step with the figures it is computed from.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_plan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('paycheck_id')->constrained()->cascadeOnDelete();

            $table->string('group', 20);

            /** Null for allowance and savings — the group heading names those. */
            $table->string('name')->nullable();

            $table->unsignedBigInteger('amount')->default(0);

            /** Debts only. With `ends_on` it gives "8 of 20 paid". */
            $table->date('started_on')->nullable();

            /**
             * Indexed because the dashboard asks "what finishes in the next
             * twelve months" on every load.
             */
            $table->date('ends_on')->nullable()->index();

            /**
             * A category and nothing more. The row already holds the name, the
             * payment and the end date, which is everything a debt is.
             */
            $table->boolean('is_debt')->default(false);

            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->index(['budget_plan_id', 'group']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_items');
    }
};
