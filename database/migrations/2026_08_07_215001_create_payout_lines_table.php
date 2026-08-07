<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What went out on a payday. This is the transaction ledger the app has been
 * standing in for with sample data.
 *
 * Unplanned spending is a row here with no `expense_item_id` and `planned` at
 * zero — it needs no shape of its own.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payout_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payout_id')->constrained()->cascadeOnDelete();

            /**
             * Provenance only, and never load-bearing: every figure below is
             * this row's own. It answers "what has this debt been paid so far",
             * and goes null when the payable is deleted rather than taking the
             * history with it.
             */
            $table->foreignId('expense_item_id')->nullable()->constrained()->nullOnDelete();

            /** Copied, so grouping history never needs the plan. */
            $table->string('group', 20);
            $table->string('name');

            /** Zero for spending the plan never saw coming. */
            $table->unsignedBigInteger('planned')->default(0);
            $table->unsignedBigInteger('actual')->default(0);

            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->index(['payout_id', 'group']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_lines');
    }
};
