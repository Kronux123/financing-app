<?php

namespace App\Http\Controllers;

use App\Actions\Payouts\SavePayout;
use App\Http\Requests\Payouts\PayoutUpdateRequest;
use App\Http\Resources\PayoutResource;
use App\Models\Payout;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PayoutController extends Controller
{
    /**
     * Show every payday that has been, newest first.
     *
     * Only records that exist: this reads the ledger rather than working out
     * what should be in it. Anything due has already been opened on the way in,
     * by OpenDuePayouts, so a payday the scheduler missed still shows.
     */
    public function index(Request $request): Response
    {
        $payouts = $request->user()->payouts()
            ->with(['incomes', 'lines'])
            ->orderByDesc('paid_on')
            ->get();

        return Inertia::render('payouts/index', [
            // resolve(), not the collection itself: a resource handed to Inertia
            // arrives wrapped in a `data` key, which is not what the page reads.
            'payouts' => PayoutResource::collection($payouts)->resolve($request),
        ]);
    }

    /**
     * Record what a payday actually did.
     */
    public function update(
        PayoutUpdateRequest $request,
        Payout $payout,
        SavePayout $savePayout,
    ): RedirectResponse {
        Gate::authorize('update', $payout);

        /*
         * A finalized payday is the record of what happened. Reopen it first
         * rather than letting a correction slip in behind the status.
         */
        if ($payout->isFinalized()) {
            throw ValidationException::withMessages([
                'status' => __('Reopen this payday before correcting it.'),
            ]);
        }

        $savePayout->handle($payout, $request->payoutData());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Payday updated.')]);

        return to_route('payouts.index');
    }
}
