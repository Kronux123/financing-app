<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The forecast: what you intend each payday to do.
 *
 * One per user. Loaded whole, edited whole. Payouts copy from it rather than
 * pointing at it, so editing this can never rewrite what already happened.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('cadence', 20);
            $table->unsignedTinyInteger('months_of_cover')->default(3);

            /**
             * Centavos, not pesos. Money is never a float here: the whole app
             * stores minor units and formats on the way out.
             *
             * Both are typed in by hand and only as current as the last time
             * the user touched them. Once there are enough finalized payouts to
             * compare against, these become the figure to check rather than the
             * figure to trust.
             */
            $table->unsignedBigInteger('emergency_fund_balance')->default(0);
            $table->unsignedBigInteger('savings_pot_balance')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_plans');
    }
};
