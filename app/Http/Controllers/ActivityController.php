<?php

namespace App\Http\Controllers;

use App\Actions\Payouts\ActivityLog;
use App\Http\Resources\ActivityResource;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The activity log.
 *
 * The page is a url — `?page=3` is a place you can link somebody to and step
 * back out of. The page size is a preference rather than a place, so it rides in
 * a cookie instead: the browser sends it with the request, which is what lets
 * the server slice correctly on the first render rather than guessing ten and
 * correcting itself once the client has read its own storage. That is also why
 * it is a cookie and not local storage, which never reaches the server at all.
 */
class ActivityController extends Controller
{
    /**
     * Unencrypted, because the client writes it. Registered as such in
     * bootstrap/app.php alongside `appearance` and `sidebar_state`.
     */
    public const ROWS_COOKIE = 'activities_rows';

    /**
     * Kept in step with `rowsPerPageOptions` in resources/js/lib/activities.ts.
     * Anything else is somebody typing in the cookie jar, so it falls back
     * rather than being honoured — an unbounded page size is a way to ask the
     * database for the whole table.
     *
     * @var list<int>
     */
    public const ROWS_PER_PAGE = [10, 25, 50, 100];

    public const DEFAULT_ROWS_PER_PAGE = 10;

    public function __construct(private readonly ActivityLog $activityLog) {}

    public function index(Request $request): Response
    {
        $activities = $this->activityLog->handle(
            $request->user(),
            $this->rowsPerPage($request),
        );

        return Inertia::render('activities/index', [
            // resolve(), not the collection itself: a resource handed to Inertia
            // arrives wrapped in a `data` key, which is not what the page reads.
            'activities' => ActivityResource::collection($activities->items())->resolve($request),
            /*
             * The counts the page would otherwise have worked out by holding
             * every row. Named for what the paginator component reads.
             */
            'pagination' => [
                'page' => $activities->currentPage(),
                'pageCount' => max(1, $activities->lastPage()),
                'rowsPerPage' => $activities->perPage(),
                /** Null on an empty page, where nothing is first or last. */
                'firstRow' => $activities->firstItem() ?? 0,
                'lastRow' => $activities->lastItem() ?? 0,
                'totalRows' => $activities->total(),
            ],
        ]);
    }

    /**
     * @return int<1, max>
     */
    private function rowsPerPage(Request $request): int
    {
        $rows = (int) $request->cookie(self::ROWS_COOKIE);

        if (! in_array($rows, self::ROWS_PER_PAGE, strict: true)) {
            return self::DEFAULT_ROWS_PER_PAGE;
        }

        return $rows;
    }
}
