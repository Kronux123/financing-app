<?php

namespace App\Http\Controllers;

use App\Enums\WalkthroughPage;
use App\Http\Requests\Walkthroughs\WalkthroughUpdateRequest;
use Illuminate\Http\RedirectResponse;

/**
 * Records that a page's walkthrough was finished or skipped, so it is not shown
 * again until its version moves on.
 */
class WalkthroughController extends Controller
{
    public function __invoke(WalkthroughUpdateRequest $request, WalkthroughPage $page): RedirectResponse
    {
        $isCompleted = $request->wasCompleted();

        $request->user()->walkthroughProgress()->updateOrCreate(
            ['page' => $page, 'version' => $page->version()],
            [
                'completed_at' => $isCompleted ? now() : null,
                'dismissed_at' => $isCompleted ? null : now(),
            ],
        );

        return back();
    }
}
