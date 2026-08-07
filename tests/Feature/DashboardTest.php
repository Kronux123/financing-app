<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('guests are redirected away from the activity log', function () {
    $response = $this->get(route('dashboard.activities'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the activity log', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard.activities'));

    $response->assertOk();
    $response->assertInertia(
        fn (AssertableInertia $page) => $page->component('activities/index')
    );
});

test('guests are redirected away from the debt page', function () {
    $response = $this->get(route('debt.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the debt page', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('debt.index'));

    $response->assertOk();
    $response->assertInertia(
        fn (AssertableInertia $page) => $page->component('debt/index')
    );
});

test('guests are redirected away from the payouts page', function () {
    $response = $this->get(route('payouts.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the payouts page', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('payouts.index'));

    $response->assertOk();
    $response->assertInertia(
        fn (AssertableInertia $page) => $page->component('payouts/index')
    );
});

test('guests are redirected away from the savings calendar', function () {
    $response = $this->get(route('dashboard.months'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the savings calendar', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard.months'));

    $response->assertOk();
    $response->assertInertia(
        fn (AssertableInertia $page) => $page->component('months/index')
    );
});
