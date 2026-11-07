<?php

use App\Enums\WalkthroughPage;
use App\Models\User;
use Database\Seeders\DemoUserSeeder;

/*
 * The screenshots in the README, taken from the demo account so no real
 * figures are ever published. Not part of the suite — it only writes images.
 * To refresh them after a UI change:
 *
 *     npm run build
 *     $env:README_SCREENSHOTS='1'; php artisan test tests/Browser/ReadmeScreenshotsTest.php
 *
 * Each page is taken in light and dark, so the README can show whichever the
 * reader's GitHub theme is.
 */

const README_IMAGES = '.github/readme';

/** Shots taken at the size a laptop shows, not the whole scrolling page. */
const README_WIDTH = 1440;
const README_HEIGHT = 900;

beforeEach(function () {
    $this->seed(DemoUserSeeder::class);

    $this->demo = User::query()->where('email', DemoUserSeeder::EMAIL)->sole();

    foreach (WalkthroughPage::cases() as $page) {
        $this->demo->walkthroughProgress()->create([
            'page' => $page,
            'version' => $page->version(),
            'completed_at' => now(),
        ]);
    }

    $this->actingAs($this->demo);

    if (! is_dir(base_path(README_IMAGES))) {
        mkdir(base_path(README_IMAGES), 0755, true);
    }
});

/** Moves a screenshot Pest saved into the folder the README reads from. */
function keepForReadme(string $name): void
{
    rename(
        base_path("tests/Browser/Screenshots/{$name}.png"),
        base_path(README_IMAGES."/{$name}.png"),
    );
}

test('readme screenshots of each page', function (string $route, string $name, string $waitFor) {
    foreach (['light', 'dark'] as $mode) {
        $page = visit(route($route));

        if ($mode === 'dark') {
            $page = $page->inDarkMode();
        }

        // Long enough for the charts' rise-in to finish.
        $page->resize(README_WIDTH, README_HEIGHT)
            ->assertSee($waitFor)
            ->wait(1.5)
            ->screenshot(fullPage: false, filename: "{$name}-{$mode}");

        keepForReadme("{$name}-{$mode}");
    }
})->with([
    'dashboard' => ['dashboard', 'dashboard', 'Savings overview'],
    'budget plan' => ['finance.edit', 'plan', 'Budget plan'],
    'payouts' => ['payouts.index', 'payouts', 'Payouts'],
    'savings calendar' => ['dashboard.months', 'calendar', 'Savings calendar'],
    'debt' => ['debt.index', 'debt', 'Total owed'],
    'activities' => ['dashboard.activities', 'activities', 'All activities'],
])->skip(fn (): bool => ! getenv('README_SCREENSHOTS'), 'Writes README images; set README_SCREENSHOTS=1 to refresh them.');

test('readme screenshot of a walkthrough', function () {
    foreach (['light', 'dark'] as $mode) {
        $page = visit(route('dashboard'));

        if ($mode === 'dark') {
            $page = $page->inDarkMode();
        }

        $page->resize(README_WIDTH, README_HEIGHT)
            ->click('@walkthrough-replay')
            ->click('@walkthrough-next')
            ->assertSee('Where your pay goes')
            ->wait(1)
            ->screenshot(fullPage: false, filename: "walkthrough-{$mode}");

        keepForReadme("walkthrough-{$mode}");
    }
})->skip(fn (): bool => ! getenv('README_SCREENSHOTS'), 'Writes README images; set README_SCREENSHOTS=1 to refresh them.');
