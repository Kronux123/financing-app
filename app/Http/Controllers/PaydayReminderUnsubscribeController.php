<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The unsubscribe link in a payday reminder. Signed, so it needs no sign-in.
 *
 * Opening the link only asks; the button on the page (or a mail client's own
 * one-click unsubscribe, which POSTs to the same link) is what turns reminders
 * off. A plain GET that unsubscribed would be triggered by every mail scanner
 * that prefetches links, and people would stop getting reminders without ever
 * having asked.
 */
class PaydayReminderUnsubscribeController extends Controller
{
    public function show(User $user): Response
    {
        return Inertia::render('auth/unsubscribe', [
            'unsubscribed' => ! $user->payday_reminders,
        ]);
    }

    public function store(Request $request, User $user): RedirectResponse
    {
        $user->forceFill(['payday_reminders' => false])->save();

        // Back to the same signed link, which now reads as done.
        return redirect()->to($request->fullUrl());
    }
}
