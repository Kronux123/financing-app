<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The ledger: one row per payday that has been.
 *
 * Hangs off the user rather than the plan, because a payout has to survive the
 * plan being rebuilt. Everything it reports comes from its own columns.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            /** Snapshots, not foreign keys. The paycheck may be gone by now. */
            $table->string('paycheck_key', 20);
            $table->string('paycheck_label');

            $table->date('paid_on');
            $table->string('status', 20)->default('pending');
            $table->timestamp('finalized_at')->nullable();

            $table->timestamps();

            /** Deleting a payout destroys history, so it is recoverable. */
            $table->softDeletes();

            /**
             * The idempotency key for the scheduled command. A job that runs
             * twice, or catches up after downtime, cannot double-post a payday.
             */
            $table->unique(['user_id', 'paid_on', 'paycheck_key']);

            $table->index(['user_id', 'paid_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payouts');
    }
};
