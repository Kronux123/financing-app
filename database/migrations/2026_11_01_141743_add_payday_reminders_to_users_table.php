<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Whether the user wants an email when a payday is waiting to be reviewed.
 *
 * On by default: a payday nobody finalizes never reaches the history, and the
 * email is the only nudge that reaches someone who is not on the site. Turned
 * off from Settings → Notifications, or the unsubscribe link in the email.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('payday_reminders')->default(true)->after('email_verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('payday_reminders');
        });
    }
};
