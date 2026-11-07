<?php

use App\Enums\WalkthroughPage;
use App\Models\User;
use App\Models\WalkthroughProgress;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->create();

    $this->actingAs($this->user);
});

test('a new user has seen no walkthroughs', function () {
    $this->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('seenWalkthroughs', []));
});

test('finishing a walkthrough records it against the current version', function () {
    $this->from(route('dashboard'))
        ->put(route('walkthroughs.update', 'dashboard'), ['outcome' => 'completed'])
        ->assertRedirect(route('dashboard'));

    $progress = $this->user->walkthroughProgress()->sole();

    expect($progress->page)->toBe(WalkthroughPage::Dashboard)
        ->and($progress->version)->toBe(WalkthroughPage::Dashboard->version())
        ->and($progress->completed_at)->not->toBeNull()
        ->and($progress->dismissed_at)->toBeNull();

    $this->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('seenWalkthroughs', ['dashboard']));
});

test('skipping a walkthrough records it as dismissed', function () {
    $this->put(route('walkthroughs.update', 'dashboard'), ['outcome' => 'dismissed']);

    $progress = $this->user->walkthroughProgress()->sole();

    expect($progress->dismissed_at)->not->toBeNull()
        ->and($progress->completed_at)->toBeNull();
});

test('taking a walkthrough again updates the same row', function () {
    $this->put(route('walkthroughs.update', 'dashboard'), ['outcome' => 'dismissed']);
    $this->put(route('walkthroughs.update', 'dashboard'), ['outcome' => 'completed']);

    $progress = $this->user->walkthroughProgress()->sole();

    expect($progress->completed_at)->not->toBeNull()
        ->and($progress->dismissed_at)->toBeNull();
});

test('a walkthrough seen at an older version shows again', function () {
    WalkthroughProgress::factory()->for($this->user)->outdated()->create();

    $this->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('seenWalkthroughs', []));
});

test('another user\'s progress does not count', function () {
    WalkthroughProgress::factory()->create();

    $this->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page->where('seenWalkthroughs', []));
});

test('every page with a walkthrough can record one', function (WalkthroughPage $page) {
    $this->put(route('walkthroughs.update', $page->value), ['outcome' => 'completed'])
        ->assertSessionHasNoErrors();

    expect($this->user->walkthroughProgress()->sole()->page)->toBe($page);
})->with(WalkthroughPage::cases());

test('a user past every walkthrough has seen them all', function () {
    $this->actingAs(User::factory()->walkthroughsSeen()->create());

    $everyPage = collect(WalkthroughPage::cases())->pluck('value')->sort()->values();

    $this->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page->where(
            'seenWalkthroughs',
            fn ($seen): bool => collect($seen)->sort()->values()->all() === $everyPage->all(),
        ));
});

test('a page without a walkthrough is not found', function () {
    $this->put(route('walkthroughs.update', 'nowhere'), ['outcome' => 'completed'])
        ->assertNotFound();
});

test('the outcome must be completed or dismissed', function (mixed $outcome) {
    $this->put(route('walkthroughs.update', 'dashboard'), ['outcome' => $outcome])
        ->assertSessionHasErrors('outcome');

    expect($this->user->walkthroughProgress()->exists())->toBeFalse();
})->with([null, 'finished', '']);

test('guests cannot record a walkthrough', function () {
    auth()->logout();

    $this->put(route('walkthroughs.update', 'dashboard'), ['outcome' => 'completed'])
        ->assertRedirect(route('login'));
});
