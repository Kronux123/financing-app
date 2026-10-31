<?php

namespace App\Http\Middleware;

use App\Actions\Payouts\OpenPayoutsForPlan;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Opens any payday that is due before a page that reads the ledger is shown.
 *
 * The daily `payouts:open` run is no longer the only way a payday appears. With
 * nothing running the scheduler — Herd locally, or a scheduler container that
 * has died — the paydays page would otherwise sit empty with nothing anywhere
 * saying why. Opening is idempotent and only ever looks at this user's plan, so
 * doing it on the way in costs a handful of queries and can never double-post.
 * The scheduled run stays, for paydays nobody comes to look at.
 */
class OpenDuePayouts
{
    public function __construct(private readonly OpenPayoutsForPlan $openPayouts) {}

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Queried, not read off the relation, which caches on the user model.
        $plan = $request->user()?->budgetPlan()->first();

        if ($plan !== null) {
            $this->openPayouts->handle($plan, now());
        }

        return $next($request);
    }
}
