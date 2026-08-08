<?php

namespace App\Http\Controllers;

use App\Actions\Payouts\MonthlySavings;
use App\Http\Resources\MonthlySavingsResource;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The overview and the calendar behind it.
 *
 * Both read the same history, because they are two views of one question: how
 * much has actually been put by, month after month. The plan arrives separately
 * as a shared prop — it supplies the goal these figures are measured against.
 */
class DashboardController extends Controller
{
    public function __construct(private readonly MonthlySavings $monthlySavings) {}

    public function index(Request $request): Response
    {
        return Inertia::render('dashboard/index', [
            'savings' => $this->savings($request),
        ]);
    }

    /** Every month of every year, for the savings calendar. */
    public function months(Request $request): Response
    {
        return Inertia::render('months/index', [
            'savings' => $this->savings($request),
        ]);
    }

    /**
     * @return array<int, mixed>
     */
    private function savings(Request $request): array
    {
        // resolve(), not the collection itself: a resource handed to Inertia
        // arrives wrapped in a `data` key, which is not what the pages read.
        return MonthlySavingsResource::collection(
            $this->monthlySavings->handle($request->user())
        )->resolve($request);
    }
}
