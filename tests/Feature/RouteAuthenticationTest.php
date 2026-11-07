<?php

use Illuminate\Routing\Route as RouteDefinition;
use Illuminate\Support\Facades\Route;

/*
 * A safety net over the whole route table, packages included: a route added
 * outside the signed-in group, or a public route arriving with a package
 * upgrade, fails here until somebody has looked at it.
 */

/**
 * Routes that are deliberately reachable without signing in, by URI.
 *
 * @var array<string, string>
 */
const PUBLIC_ROUTES = [
    '/' => 'The landing page. Shows a signed-in visitor a link to their dashboard, nothing of theirs.',
    'up' => 'The health check, for the load balancer.',
    'payday-reminders/{user}/unsubscribe' => 'Opened from an email. Signed instead — asserted below.',
    'storage/{path}' => 'Laravel serving the local disk. Refuses anything not signed for it.',
    '_boost/browser-logs' => 'Laravel Boost, registered only while developing.',
];

/**
 * @return list<string>
 */
function middlewareOf(RouteDefinition $route): array
{
    return $route->gatherMiddleware();
}

function requiresSignIn(RouteDefinition $route): bool
{
    return collect(middlewareOf($route))->contains(
        fn (string $middleware): bool => $middleware === 'auth' || str_starts_with($middleware, 'auth:'),
    );
}

/**
 * Login, registration and the like: for signed-out people only, and a signed-in
 * one is sent away from them.
 */
function isForGuestsOnly(RouteDefinition $route): bool
{
    return collect(middlewareOf($route))->contains(
        fn (string $middleware): bool => $middleware === 'guest' || str_starts_with($middleware, 'guest:'),
    );
}

test('every route needs a signed-in user unless it is meant to be public', function () {
    $unprotected = collect(Route::getRoutes()->getRoutes())
        ->reject(fn (RouteDefinition $route): bool => requiresSignIn($route) || isForGuestsOnly($route))
        ->reject(fn (RouteDefinition $route): bool => array_key_exists($route->uri(), PUBLIC_ROUTES))
        ->map(fn (RouteDefinition $route): string => implode('|', $route->methods()).' '.$route->uri())
        ->values()
        ->all();

    expect($unprotected)->toBe([]);
});

test('the public routes that act on an account are signed', function () {
    $unsubscribe = collect(Route::getRoutes()->getRoutes())
        ->filter(fn (RouteDefinition $route): bool => $route->uri() === 'payday-reminders/{user}/unsubscribe');

    expect($unsubscribe)->not->toBeEmpty();

    $unsubscribe->each(
        fn (RouteDefinition $route) => expect(middlewareOf($route))->toContain('signed'),
    );
});

test('the app\'s own pages also need a verified email', function (string $uri) {
    $route = collect(Route::getRoutes()->getRoutes())
        ->first(fn (RouteDefinition $route): bool => $route->uri() === $uri);

    expect($route)->not->toBeNull()
        ->and(middlewareOf($route))->toContain('auth', 'verified');
})->with([
    'dashboard',
    'dashboard/months',
    'dashboard/activities',
    'dashboard/months/{month}/sheet',
    'dashboard/months/{month}/pdf',
    'dashboard/years/{year}/sheet',
    'finance',
    'finance/export',
    'finance/import',
    'debt',
    'payouts',
    'payouts/{payout}',
    'payouts/{payout}/status',
    'walkthroughs/{page}',
]);

test('guests are sent to the login page from every page of the app', function (string $routeName) {
    $this->get(route($routeName))->assertRedirect(route('login'));
})->with([
    'dashboard',
    'dashboard.months',
    'dashboard.activities',
    'finance.edit',
    'debt.index',
    'payouts.index',
    'profile.edit',
    'security.edit',
    'appearance.edit',
    'notifications.edit',
]);
