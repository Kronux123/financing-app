<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;

test('guests are redirected away from the budget plan', function () {
    $response = $this->get(route('finance.edit'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the budget plan', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('finance.edit'));

    $response->assertOk();
    $response->assertInertia(
        fn (AssertableInertia $page) => $page->component('finance/index')
    );
});
