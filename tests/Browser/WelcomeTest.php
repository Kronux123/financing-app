<?php

/*
 * The landing page is the only page in the app a guest sees, so every test here
 * runs without authenticating. `auth.user` drives the header and the closing
 * call to action, which is why the signed-in variant is worth its own test.
 */

use App\Models\User;

test('the landing page tells a guest what the app is for', function () {
    $page = visit(route('home'));

    $page->assertSee('Plan what comes in. Record what goes out.')
        ->assertSee('A plan you write once, and a record that writes itself.')
        ->assertSee('Everything downstream reads from the record.')
        ->assertNoJavaScriptErrors();
});

/*
 * Each section carries a miniature of the screen it describes rather than a
 * paragraph about it. These assert the previews are actually rendering — the
 * status words come from PayoutStatus, and the two figures either side of the
 * strike-through are the point of the "record holds" section.
 */
test('the sections show the screens they describe', function () {
    $page = visit(route('home'));

    $page->assertSee('Pending')
        ->assertSee('Finalized')
        ->assertSee('Locked')
        ->assertSee('does not flow through')
        ->assertSee('₱8,200');
});

test('the landing page opens on the split that is the whole idea', function () {
    $page = visit(route('home'));

    $page->assertSee('The 15th')
        ->assertSee('End of month')
        ->assertSee('₱16,500')
        ->assertSee('₱801')
        ->assertSee('₱5,180');
});

/*
 * The hero figures are invented. A visitor has no way to know that from the
 * numbers themselves, so the card has to say it — and keep saying it.
 */
test('the example figures are labelled as an example', function () {
    $page = visit(route('home'));

    $page->assertSee('Example plan');
});

test('a guest is offered both registering and logging in', function () {
    $page = visit(route('home'));

    $page->assertSee('Get started')
        ->assertSee('Log in')
        ->assertSee('Build your plan')
        ->assertDontSee('Go to your dashboard');
});

test('a signed-in visitor is sent to the dashboard instead', function () {
    $this->actingAs(User::factory()->create());

    $page = visit(route('home'));

    $page->assertSee('Go to your dashboard')
        ->assertDontSee('I already have an account')
        ->assertDontSee('Keep more of what comes in.');
});

test('nothing on the landing page points back at the starter kit', function () {
    $page = visit(route('home'));

    $page->assertDontSee('Laracasts')
        ->assertDontSee('Deploy now')
        ->assertDontSee("Let's get started");
});

test('the landing page has no accessibility issues', function () {
    $page = visit(route('home'));

    $page->assertNoAccessibilityIssues();
});

// The goal-scale dots and the muted rollup strip carry their own dark steps, so
// the dark page has to be checked alongside the light one.
test('the landing page has no accessibility issues in dark mode', function () {
    $page = visit(route('home'))->inDarkMode();

    $page->assertNoAccessibilityIssues();
});
