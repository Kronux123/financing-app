<?php

/*
 * History is encrypted only where the browser can do it. Turned on for a plain
 * http site, Inertia throws partway through every visit and links stop
 * working — which is what happened on http://financing-app.test.
 */

/** Whether the page sent for this url asks the browser to encrypt its history. */
function asksToEncryptHistory(string $url): bool
{
    $page = test()->get($url)->assertOk()->viewData('page');

    return $page['encryptHistory'] ?? false;
}

test('history is encrypted over https', function () {
    expect(asksToEncryptHistory('https://financing-app.test/login'))->toBeTrue();
});

test('history is encrypted on this machine, which browsers treat as secure', function (string $host) {
    expect(asksToEncryptHistory("http://{$host}/login"))->toBeTrue();
})->with(['localhost', '127.0.0.1', 'kept.localhost']);

test('history is left alone over plain http, where encrypting would break every link', function () {
    expect(asksToEncryptHistory('http://financing-app.test/login'))->toBeFalse();
});
