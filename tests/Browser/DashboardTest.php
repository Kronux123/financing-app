<?php

use App\Models\User;

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

test('the dashboard renders every card', function () {
    $page = visit(route('dashboard'));

    $page->assertSee('Savings overview')
        ->assertSee('Total saved')
        ->assertSee('Monthly expenses')
        ->assertSee('Outstanding debt')
        ->assertSee('Projected cashflow')
        ->assertSee('Monthly savings')
        ->assertSee('Spending categories')
        ->assertSee('Recent activity')
        ->assertNoJavaScriptErrors();
});

test('the dashboard has no accessibility issues', function () {
    $page = visit(route('dashboard'));

    $page->assertNoAccessibilityIssues();
});

// The card icons sit on tinted surfaces that carry their own dark steps, so the
// dark card has to be checked alongside the light one.
test('the dashboard has no accessibility issues in dark mode', function () {
    $page = visit(route('dashboard'))->inDarkMode();

    $page->assertNoAccessibilityIssues();
});
