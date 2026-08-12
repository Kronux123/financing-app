<?php

use App\Http\Controllers\ActivityController;
use App\Models\Payout;
use App\Models\PayoutIncome;
use App\Models\PayoutLine;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

/** A payday with `$lines` lines on it, so a log can be made long enough to page. */
function recordPayday(User $user, int $monthsBack, int $lines = 4): Payout
{
    $payout = Payout::factory()->for($user)->finalized()->create([
        'paycheck_label' => "Payday {$monthsBack}",
        'paid_on' => now()->subMonths($monthsBack)->startOfMonth()->toDateString(),
    ]);

    PayoutIncome::factory()->for($payout)->create([
        'label' => "Paycheck {$monthsBack}",
    ]);

    foreach (range(0, $lines - 1) as $position) {
        PayoutLine::factory()->for($payout)->create([
            'name' => "Bill {$monthsBack}-{$position}",
            'position' => $position,
        ]);
    }

    return $payout;
}

test('the log is empty until a payday has been recorded', function () {
    $response = $this->get(route('dashboard.activities'));

    $response->assertOk();
    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->component('activities/index')
            ->has('activities', 0)
            ->where('pagination.totalRows', 0)
            // Never zero, so the page never reads "Page 1 of 0".
            ->where('pagination.pageCount', 1)
            ->where('pagination.firstRow', 0)
            ->where('pagination.lastRow', 0)
    );
});

test('a payday contributes its income and every line it paid', function () {
    $payout = Payout::factory()->for($this->user)->create([
        'paycheck_label' => 'End of month',
    ]);

    PayoutIncome::factory()->for($payout)->create(['label' => 'Monthly pay']);
    PayoutLine::factory()->for($payout)->create(['name' => 'Rent']);
    PayoutLine::factory()->for($payout)->savings()->create(['position' => 1]);

    $response = $this->get(route('dashboard.activities'));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->has('activities', 3)
            ->where('activities.0.title', 'Monthly pay')
            ->where('activities.0.category', 'Income')
            ->where('activities.1.title', 'Rent')
            ->where('activities.1.category', 'Payables')
            ->where('activities.2.category', 'Savings')
            // Every row is stamped with the payday it belongs to, which is what
            // makes a figure traceable back to the record that holds it.
            ->where('activities.0.payday', 'End of month')
            ->where('activities.0.date', $payout->paid_on->toDateString())
    );
});

test('money in is positive and money out negative, both in pesos', function () {
    $payout = Payout::factory()->for($this->user)->create();

    PayoutIncome::factory()->for($payout)->create(['actual' => 2_500_000]);
    PayoutLine::factory()->for($payout)->create(['actual' => 850_000]);

    $response = $this->get(route('dashboard.activities'));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->where('activities.0.amount', 25_000)
            ->where('activities.1.amount', -8_500)
    );
});

test('centavos survive the crossing to pesos', function () {
    $payout = Payout::factory()->for($this->user)->create();

    PayoutLine::factory()->for($payout)->create(['actual' => 12_345]);

    $response = $this->get(route('dashboard.activities'));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page->where('activities.0.amount', -123.45)
    );
});

test('spending the plan never saw coming is marked as unplanned', function () {
    $payout = Payout::factory()->for($this->user)->create();

    PayoutLine::factory()->for($payout)->create(['name' => 'Rent']);
    PayoutLine::factory()->for($payout)->unplanned()->create(['position' => 1]);

    $response = $this->get(route('dashboard.activities'));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->where('activities.0.isUnplanned', false)
            ->where('activities.1.title', 'Hospital visit')
            ->where('activities.1.isUnplanned', true)
    );
});

/*
 * Unlike the savings charts, a pending payday belongs in the log. It carries its
 * status through so the row can say what it is, rather than being dropped and
 * leaving a gap the reader has no way to account for.
 */
test('a pending payday appears and carries its status', function () {
    $pending = Payout::factory()->for($this->user)->create([
        'paid_on' => now()->subMonth()->toDateString(),
    ]);
    $finalized = Payout::factory()->for($this->user)->finalized()->create([
        'paid_on' => now()->subMonths(2)->toDateString(),
    ]);

    PayoutLine::factory()->for($pending)->create();
    PayoutLine::factory()->for($finalized)->create();

    $response = $this->get(route('dashboard.activities'));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->has('activities', 2)
            ->where('activities.0.status', 'pending')
            ->where('activities.1.status', 'finalized')
    );
});

test('the newest payday comes first', function () {
    $older = Payout::factory()->for($this->user)->create([
        'paid_on' => now()->subMonths(3)->toDateString(),
    ]);
    $newer = Payout::factory()->for($this->user)->create([
        'paid_on' => now()->subMonth()->toDateString(),
    ]);

    PayoutLine::factory()->for($older)->create(['name' => 'Older bill']);
    PayoutLine::factory()->for($newer)->create(['name' => 'Newer bill']);

    $response = $this->get(route('dashboard.activities'));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->where('activities.0.title', 'Newer bill')
            ->where('activities.1.title', 'Older bill')
    );
});

test('the log holds nobody else’s ledger', function () {
    $stranger = User::factory()->create();
    $theirs = Payout::factory()->for($stranger)->create();

    PayoutLine::factory()->for($theirs)->create(['name' => 'Their rent']);

    $mine = Payout::factory()->for($this->user)->create();
    PayoutLine::factory()->for($mine)->create(['name' => 'My rent']);

    $response = $this->get(route('dashboard.activities'));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->has('activities', 1)
            ->where('activities.0.title', 'My rent')
    );
});

test('a deleted payday leaves the log', function () {
    $payout = Payout::factory()->for($this->user)->create();

    PayoutLine::factory()->for($payout)->create();

    $payout->delete();

    $response = $this->get(route('dashboard.activities'));

    $response->assertInertia(fn (AssertableInertia $page) => $page->has('activities', 0));
});

/*
 * The point of the rework: a page is a slice taken by the database, so the
 * response carries ten rows however long the ledger runs.
 */
test('only the rows for the page asked for are sent', function () {
    collect(range(0, 5))->each(fn (int $monthsBack) => recordPayday($this->user, $monthsBack));

    $response = $this->get(route('dashboard.activities'));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->has('activities', 10)
            ->where('pagination.totalRows', 30)
            ->where('pagination.pageCount', 3)
            ->where('pagination.page', 1)
            ->where('pagination.firstRow', 1)
            ->where('pagination.lastRow', 10)
    );
});

test('the page comes from the url', function () {
    collect(range(0, 5))->each(fn (int $monthsBack) => recordPayday($this->user, $monthsBack));

    $response = $this->get(route('dashboard.activities', ['page' => 2]));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->has('activities', 10)
            ->where('pagination.page', 2)
            ->where('pagination.firstRow', 11)
            ->where('pagination.lastRow', 20)
            // Page 2 opens on the third payday: two paydays of five rows fit
            // ahead of it.
            ->where('activities.0.title', 'Paycheck 2')
    );
});

test('the last page holds the remainder', function () {
    // Five paydays of five rows, less one line, so the last page is short.
    collect(range(0, 3))->each(fn (int $monthsBack) => recordPayday($this->user, $monthsBack));
    recordPayday($this->user, 4, lines: 2);

    $response = $this->get(route('dashboard.activities', ['page' => 3]));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->has('activities', 3)
            ->where('pagination.totalRows', 23)
            ->where('pagination.firstRow', 21)
            ->where('pagination.lastRow', 23)
    );
});

test('the page size is read off the cookie', function () {
    collect(range(0, 5))->each(fn (int $monthsBack) => recordPayday($this->user, $monthsBack));

    $response = $this
        ->withUnencryptedCookie(ActivityController::ROWS_COOKIE, '25')
        ->get(route('dashboard.activities'));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->has('activities', 25)
            ->where('pagination.rowsPerPage', 25)
            ->where('pagination.pageCount', 2)
    );
});

/*
 * The cookie is written by the client, so it is worth nothing until it has been
 * checked. An arbitrary size is a way to ask the database for the whole table.
 */
test('a page size nobody offered falls back to the default', function (string $rows) {
    collect(range(0, 5))->each(fn (int $monthsBack) => recordPayday($this->user, $monthsBack));

    $response = $this
        ->withUnencryptedCookie(ActivityController::ROWS_COOKIE, $rows)
        ->get(route('dashboard.activities'));

    $response->assertInertia(
        fn (AssertableInertia $page) => $page
            ->has('activities', 10)
            ->where('pagination.rowsPerPage', 10)
    );
})->with([
    'an unoffered size' => '30',
    'the whole table' => '100000',
    'nonsense' => 'all',
    'nothing' => '',
    'zero' => '0',
    'negative' => '-5',
]);

/*
 * What paging in the database buys, stated as a test: reading one page costs the
 * same whether the ledger holds thirty rows or three hundred. Held here because
 * the cheap mistake — fetching everything and slicing in PHP — passes every
 * other test in this file.
 */
test('the cost of a page does not grow with the ledger', function () {
    $queriesFor = function (int $paydays): int {
        DB::flushQueryLog();
        DB::enableQueryLog();

        $this->get(route('dashboard.activities'))->assertOk();

        $count = count(DB::getRawQueryLog());

        DB::disableQueryLog();

        return $count;
    };

    collect(range(0, 5))->each(fn (int $monthsBack) => recordPayday($this->user, $monthsBack));
    $small = $queriesFor(6);

    collect(range(6, 59))->each(fn (int $monthsBack) => recordPayday($this->user, $monthsBack));
    $large = $queriesFor(60);

    expect($large)->toBe($small);

    // And the page itself is still ten rows out of three hundred.
    $this->get(route('dashboard.activities'))->assertInertia(
        fn (AssertableInertia $page) => $page
            ->has('activities', 10)
            ->where('pagination.totalRows', 300)
    );
});
