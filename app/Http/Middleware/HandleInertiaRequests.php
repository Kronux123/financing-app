<?php

namespace App\Http\Middleware;

use App\Http\Resources\BudgetPlanResource;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            /**
             * Shared rather than passed per page. Four pages read the plan, and
             * every one of them wants the whole of it, so handing it to each
             * controller separately would only be the same query written out
             * four times.
             */
            'plan' => fn (): ?array => $this->plan($request),
            /**
             * Paydays waiting for review: the badge on Payouts and the banner
             * on the dashboard. Counted, not stored as a notification, so it
             * can never disagree with the payouts themselves. A closure, so it
             * is read after OpenDuePayouts has opened anything due on this
             * request.
             */
            'pendingPaydays' => fn (): int => $this->pendingPaydays($request),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * reorder() drops the relation's newest-first ordering, which Postgres
     * refuses alongside count(*).
     */
    private function pendingPaydays(Request $request): int
    {
        return $request->user()?->payouts()->reorder()->pending()->count() ?? 0;
    }

    /**
     * Null until a plan is saved, which every page already treats as "nothing
     * to show yet".
     */
    private function plan(Request $request): ?array
    {
        $plan = $request->user()?->budgetPlan()
            ->with(['paychecks', 'expenseItems.paycheck'])
            ->first();

        // resolve(), not the resource itself: a JsonResource handed to Inertia
        // arrives wrapped in a `data` key, which is not what the pages read.
        return $plan === null ? null : (new BudgetPlanResource($plan))->resolve($request);
    }
}
