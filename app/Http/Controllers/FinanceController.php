<?php

namespace App\Http\Controllers;

use App\Actions\Finance\SaveBudgetPlan;
use App\Http\Requests\Finance\BudgetPlanUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    /**
     * Show the budget plan.
     */
    public function edit(Request $request): Response
    {
        $plan = $request->user()->budgetPlan()
            ->with(['paychecks', 'expenseItems'])
            ->first();

        return Inertia::render('finance/index', [
            'plan' => $plan,
        ]);
    }

    /**
     * Replace the budget plan with the one that was sent.
     */
    public function update(
        BudgetPlanUpdateRequest $request,
        SaveBudgetPlan $saveBudgetPlan,
    ): RedirectResponse {
        $saveBudgetPlan->handle($request->user(), $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Budget plan saved.')]);

        return to_route('finance.edit');
    }
}
