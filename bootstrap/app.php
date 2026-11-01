<?php

use App\Http\Controllers\ActivityController;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: [
            'appearance',
            'sidebar_state',
            // The activity log's page size. Written by the client, read by
            // ActivityController — see the note on ActivityController::ROWS_COOKIE.
            ActivityController::ROWS_COOKIE,
        ]);

        /*
         * A mail client's one-click unsubscribe POSTs to the link in the email
         * with no session and no token. The link is signed, which is the check
         * that matters here — see routes/web.php.
         */
        $middleware->validateCsrfTokens(except: [
            'payday-reminders/*/unsubscribe',
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
