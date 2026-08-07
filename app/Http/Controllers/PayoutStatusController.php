<?php

namespace App\Http\Controllers;

use App\Enums\PayoutStatus;
use App\Http\Requests\Payouts\PayoutStatusUpdateRequest;
use App\Models\Payout;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

/**
 * Finalizing and reopening a payday.
 *
 * Its own controller because it is a transition rather than an edit: it decides
 * whether the record is still a draft of what happened or the account of it.
 */
class PayoutStatusController extends Controller
{
    public function __invoke(PayoutStatusUpdateRequest $request, Payout $payout): RedirectResponse
    {
        Gate::authorize('update', $payout);

        $status = $request->status();

        $payout->update([
            'status' => $status,
            'finalized_at' => $status === PayoutStatus::Finalized ? now() : null,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $status === PayoutStatus::Finalized
                ? __('Payday finalized.')
                : __('Payday reopened.'),
        ]);

        return to_route('payouts.index');
    }
}
