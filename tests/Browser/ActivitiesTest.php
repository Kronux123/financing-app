<?php

use App\Models\User;

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

test('the activity log opens on the first page of ten rows', function () {
    $page = visit(route('dashboard.activities'));

    $page->assertSee('Activities')
        ->assertSeeIn('@pagination-summary', 'Showing 1–10 of 26 activities')
        ->assertSee('Page 1 of 3')
        ->assertSee('Mortgage payment')
        ->assertDontSee('Fuel')
        ->assertNoJavaScriptErrors();
});

test('the next page shows the following rows', function () {
    $page = visit(route('dashboard.activities'));

    $page->click('@page-next')
        ->assertSeeIn('@pagination-summary', 'Showing 11–20 of 26 activities')
        ->assertSee('Fuel')
        ->assertDontSee('Mortgage payment');
});

test('the last page holds the remainder', function () {
    $page = visit(route('dashboard.activities'));

    $page->click('@page-last')
        ->assertSeeIn('@pagination-summary', 'Showing 21–26 of 26 activities')
        ->assertSee('Streaming bundle');
});

test('a page can be jumped to by number', function () {
    $page = visit(route('dashboard.activities'));

    $page->click('@page-3')
        ->assertSeeIn('@pagination-summary', 'Showing 21–26 of 26 activities')
        ->click('@page-1')
        ->assertSeeIn('@pagination-summary', 'Showing 1–10 of 26 activities');
});

test('the steps are disabled at either end of the log', function () {
    $page = visit(route('dashboard.activities'));

    $page->assertDisabled('@page-first')
        ->assertDisabled('@page-prev')
        ->assertEnabled('@page-next')
        ->click('@page-last')
        ->assertDisabled('@page-next')
        ->assertDisabled('@page-last')
        ->assertEnabled('@page-prev');
});

test('showing more rows per page collapses the page count', function () {
    $page = visit(route('dashboard.activities'));

    $page->click('@rows-25')
        ->assertSeeIn('@pagination-summary', 'Showing 1–25 of 26 activities')
        ->assertSee('Page 1 of 2')
        ->click('@rows-50')
        ->assertSeeIn('@pagination-summary', 'Showing 1–26 of 26 activities')
        ->assertSee('Page 1 of 1')
        ->assertDisabled('@page-next');
});

test('changing the page size keeps the first visible row in view', function () {
    $page = visit(route('dashboard.activities'));

    $page->click('@page-3')
        ->assertSee('Transport card reload')
        ->click('@rows-25')
        ->assertSeeIn('@pagination-summary', 'Showing 1–25 of 26 activities')
        ->assertSee('Transport card reload');
});

test('the chosen page size becomes the default on the next visit', function () {
    $page = visit(route('dashboard.activities'));

    $page->click('@rows-25')
        ->assertSeeIn('@pagination-summary', 'Showing 1–25 of 26 activities');

    // refresh() reloads in the same browser context, so local storage survives.
    $page->refresh()
        ->assertPathIs('/dashboard/activities')
        ->assertSeeIn('@pagination-summary', 'Showing 1–25 of 26 activities')
        ->assertSee('Page 1 of 2');
});

test('the paginated activity log has no accessibility issues', function () {
    $page = visit(route('dashboard.activities'));

    $page->click('@page-2')
        ->assertNoAccessibilityIssues();
});

// The status tints and amount colours carry separate dark steps, so the table
// has to be checked against the dark card as well as the light one.
test('the paginated activity log has no accessibility issues in dark mode', function () {
    $page = visit(route('dashboard.activities'))->inDarkMode();

    $page->click('@page-2')
        ->assertNoAccessibilityIssues();
});
