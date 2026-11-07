<?php

use App\Models\User;

/*
 * The back button after the signed-in user changes. Inertia keeps each page's
 * props in the browser history, so without clearing it, back after signing out
 * redrew the dashboard without ever asking the server.
 */

test('back after signing out does not show the app again', function () {
    $this->actingAs(User::factory()->walkthroughsSeen()->create());

    $page = visit(route('dashboard'));

    $page->assertSee('Savings overview')
        ->click('@sidebar-menu-button')
        ->click('@logout-button')
        ->assertPathIs('/')
        ->back()
        ->assertSee('Log in to your account')
        ->assertPathIs('/login')
        ->assertDontSee('Savings overview')
        ->assertNoJavaScriptErrors();
});

test('back after signing in does not show the login page again', function () {
    User::factory()->walkthroughsSeen()->create([
        'email' => 'ana@example.com',
        'password' => 'password',
    ]);

    $page = visit(route('home'));

    $page->click('Log in')
        ->assertSee('Log in to your account')
        ->type('email', 'ana@example.com')
        ->type('password', 'password')
        ->click('@login-button')
        ->assertSee('Savings overview')
        ->back()
        // Signing in replaced the login page, so back is the page before it,
        // fetched again as somebody who is now signed in.
        ->assertSee('Go to your dashboard')
        ->assertPathIs('/')
        ->assertDontSee('Log in to your account')
        ->assertNoJavaScriptErrors();
});
