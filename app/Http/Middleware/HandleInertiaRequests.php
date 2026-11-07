<?php

namespace App\Http\Middleware;

use App\Enums\WalkthroughPage;
use App\Http\Resources\BudgetPlanResource;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
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
     * Encrypts each page's props in the browser history wherever the browser
     * is able to, so that clearing the history when the signed-in user changes
     * leaves the back button nothing it can redraw — see
     * resources/js/lib/session-history.ts.
     *
     * Decided per request rather than switched on in config, because
     * encryption is all or nothing in the browser. Outside a secure context
     * there is no Web Crypto, Inertia cannot make a key, and it throws in the
     * middle of every visit instead of falling back: links on a plain http site
     * simply stop working.
     */
    public function handle(Request $request, Closure $next): mixed
    {
        Inertia::encryptHistory($this->browserCanEncrypt($request));

        return parent::handle($request, $next);
    }

    /**
     * The browser's own rule for a secure context: https, or this machine.
     *
     * Behind a load balancer that ends TLS, isSecure() is only true once the
     * proxy is trusted. Untrusted, this reads false and history simply goes
     * unencrypted, which is the safe way for it to be wrong.
     */
    private function browserCanEncrypt(Request $request): bool
    {
        $host = $request->getHost();

        return $request->isSecure()
            || in_array($host, ['localhost', '127.0.0.1', '[::1]', '::1'], true)
            || str_ends_with($host, '.localhost');
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
            /**
             * Pages whose current walkthrough is finished or skipped. Every
             * other page with one shows it on arrival.
             */
            'seenWalkthroughs' => fn (): array => $this->seenWalkthroughs($request),
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
     * @return list<string>
     */
    private function seenWalkthroughs(Request $request): array
    {
        return $request->user()?->walkthroughProgress()
            ->current()
            ->pluck('page')
            ->map(fn (WalkthroughPage $page): string => $page->value)
            ->values()
            ->all() ?? [];
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
