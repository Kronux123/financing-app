<?php

namespace App\Http\Controllers;

use App\Actions\Finance\SaveBudgetPlan;
use App\Actions\Finance\StatutoryDeductions;
use App\Http\Requests\Finance\BudgetPlanImportRequest;
use App\Http\Requests\Finance\BudgetPlanUpdateRequest;
use App\Http\Requests\Finance\DeductionsRequest;
use App\Http\Resources\BudgetPlanFileResource;
use App\Http\Resources\DeductionsResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
     * Download the saved plan as a file that can be imported again.
     *
     * The saved plan, not the draft on the page: what leaves is what the server
     * holds, so a file is never a half-finished edit.
     */
    public function export(Request $request): JsonResponse
    {
        $plan = $request->user()->budgetPlan()
            ->with(['paychecks', 'expenseItems.paycheck'])
            ->first();

        abort_if($plan === null, 404);

        $filename = 'kept-budget-plan-'.now()->toDateString().'.json';

        return response()->json(
            (new BudgetPlanFileResource($plan))->resolve($request),
            headers: ['Content-Disposition' => "attachment; filename=\"{$filename}\""],
            options: JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
        );
    }

    /**
     * Replace the budget plan with one from an exported file.
     *
     * Saved through the same action as the editor, so it is matched and replaced
     * exactly as a save would be. Every row arrives new, which means paydays
     * already recorded keep their figures but lose the link to the rows they
     * were opened from.
     */
    public function import(
        BudgetPlanImportRequest $request,
        SaveBudgetPlan $saveBudgetPlan,
    ): RedirectResponse {
        $saveBudgetPlan->handle($request->user(), $request->planData());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Budget plan imported.')]);

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
