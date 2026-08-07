<?php

namespace App\Http\Controllers;

use App\Actions\Payouts\SavePayout;
use App\Http\Requests\Payouts\PayoutUpdateRequest;
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
     */
    public function index(Request $request): Response
    {
        return Inertia::render('payouts/index', [
            'payouts' => $request->user()->payouts()
                ->with(['incomes', 'lines'])
                ->get(),
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

        $savePayout->handle($payout, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Payday updated.')]);

        return to_route('payouts.index');
    }
}
