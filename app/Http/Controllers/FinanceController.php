<?php

namespace App\Http\Controllers;

use App\Actions\Finance\SaveBudgetPlan;
use App\Http\Requests\Finance\BudgetPlanUpdateRequest;
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
}
