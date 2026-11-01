<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\NotificationUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * Show the user's email notification settings.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/notifications', [
            'paydayReminders' => (bool) $request->user()->payday_reminders,
        ]);
    }

    /**
     * Turn payday reminder emails on or off.
     */
    public function update(NotificationUpdateRequest $request): RedirectResponse
    {
        $request->user()->forceFill([
            'payday_reminders' => $request->boolean('payday_reminders'),
        ])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Notification settings saved.')]);

        return to_route('notifications.edit');
    }
}
