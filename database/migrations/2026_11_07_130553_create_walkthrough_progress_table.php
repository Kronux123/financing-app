<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which page walkthroughs a user has been through — see WalkthroughPage.
 *
 * No row means not seen yet, so nothing is written at sign-up and existing
 * users get each walkthrough the first time they open the page.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('walkthrough_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            /** A WalkthroughPage value. A string, so adding a page is not a migration. */
            $table->string('page', 40);
            $table->unsignedSmallInteger('version');

            /** One or the other: finishing and skipping are worth telling apart. */
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('dismissed_at')->nullable();

            $table->timestamps();

            $table->unique(['user_id', 'page', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('walkthrough_progress');
    }
};
