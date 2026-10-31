<?php

namespace App\Http\Controllers;

use App\Actions\Finance\SaveBudgetPlan;
use App\Actions\Finance\StatutoryDeductions;
use App\Http\Requests\Finance\BudgetPlanUpdateRequest;
use App\Http\Requests\Finance\DeductionsRequest;
use App\Http\Resources\DeductionsResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    /**
     * Show the budget plan.
     */
    public function edit(): Response
    {
        // The plan itself is a shared prop — every page that reads one gets it.
        return Inertia::render('finance/index');
    }

    /**
     * Replace the budget plan with the one that was sent.
     */
    public function update(
        BudgetPlanUpdateRequest $request,
        SaveBudgetPlan $saveBudgetPlan,
    ): RedirectResponse {
        $saveBudgetPlan->handle($request->user(), $request->planData());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Budget plan saved.')]);

        return to_route('finance.edit');
    }

    /**
     * Preview what a gross loses to statutory deductions, as it is typed.
     *
     * Plain JSON rather than an Inertia visit: the page asks for this on every
     * pause in typing and must not lose the draft plan it is holding.
     */
    public function deductions(DeductionsRequest $request, StatutoryDeductions $deductions): JsonResponse
    {
        $resource = new DeductionsResource([
            'breakdown' => $deductions->handle($request->gross()),
            'paychecks' => $deductions->paycheckAmounts($request->cadence(), $request->gross()),
        ]);

        // resolve(), so the figures are not wrapped in a `data` key.
        return response()->json($resource->resolve($request));
    }
}
