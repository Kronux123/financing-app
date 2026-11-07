<?php

use App\Models\User;

beforeEach(function () {
    $this->actingAs(User::factory()->walkthroughsSeen()->create());
});

test('the sidebar is branded with the application name', function () {
    $page = visit(route('dashboard'));

    $page->assertSee(config('app.name'))
        ->assertDontSee('Laravel Starter Kit')
        ->assertNoJavaScriptErrors();
});

test('the sidebar links to the application, not to the starter kit', function () {
    $page = visit(route('dashboard'));

    $page->assertSee('Dashboard')
        ->assertSee('Activities')
        ->assertSee('Finance')
        ->assertDontSee('Repository')
        ->assertDontSee('Documentation')
        ->assertDontSeeLink('Repository')
        ->assertDontSeeLink('Documentation');
});
