<?php

use App\Enums\ExpenseGroup;
use App\Enums\PayoutStatus;
use App\Models\ExpenseItem;
use App\Models\Payout;
use App\Models\User;
use Database\Seeders\DemoUserSeeder;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Spatie\LaravelPdf\Facades\Pdf;
use Spatie\LaravelPdf\PdfBuilder;

/*
 * Time is frozen, because the seeder is written relative to today: it backdates
 * the plan to the start of this year and settles every payday that has come round
 * since. On a Wednesday in August that is January through July, fourteen paydays
 * of a semi-monthly plan, and the figures below are that arithmetic.
 */
beforeEach(function () {
    $this->travelTo('2026-08-12 09:00:00');

    $this->seed(DemoUserSeeder::class);

    $this->demo = User::query()->where('email', DemoUserSeeder::EMAIL)->sole();
});

test('the demo user can sign in with the documented password', function () {
    expect($this->demo->email_verified_at)->not->toBeNull()
        ->and(Hash::check('password', $this->demo->password))->toBeTrue();

    /** Verified, so the app behind the login is actually reachable. */
    $this->actingAs($this->demo)->get(route('dashboard'))->assertOk();
});

test('the plan arrives hydrated, both paychecks and every group', function () {
    $this->actingAs($this->demo)
        ->get(route('finance.edit'))
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('plan.cadence', 'semi-monthly')
                ->has('plan.paychecks', 2)
                ->where('plan.paychecks.0.id', 'mid-month')
                ->where('plan.paychecks.0.amount', 25_000)
                /** The sweep is on the second one, which is the case worth showing. */
                ->where('plan.paychecks.1.savesRemainder', true)
                ->has('plan.groups', 3)
                ->has('plan.groups.0.items', 10)
                ->has('plan.groups.1.items', 2)
                ->has('plan.groups.2.items', 1)
                ->where('plan.emergencyFund.monthsOfCover', 6)
                ->where('plan.emergencyFund.balance', 120_000)
                ->where('plan.savingsPot.balance', 45_000)
                ->etc()
        );
});

test('the plan carries debts the debt page can count', function () {
    $debts = ExpenseItem::query()->debts()->get();

    expect($debts)->toHaveCount(2)
        ->and($debts->pluck('name')->all())->toContain('Laptop installment', 'Credit card')
        /** Six paid and six to go, so the page reads halfway through. */
        ->and($debts->firstWhere('name', 'Laptop installment')->monthsRemaining(now()))->toBe(6);
});

test('every payday since January is opened and settled', function () {
    $paydays = Payout::query()->reorder('paid_on')->get();

    /** Seven months, twice a month. August has no payday until the 15th. */
    expect($paydays)->toHaveCount(14)
        ->and($paydays->first()->paid_on->toDateString())->toBe('2026-01-15')
        ->and($paydays->last()->paid_on->toDateString())->toBe('2026-07-31')
        ->and($paydays->every(fn (Payout $payday) => $payday->status === PayoutStatus::Finalized))->toBeTrue()
        /** Dated to the payday rather than to the seeding run. */
        ->and($paydays->first()->finalized_at->toDateString())->toBe('2026-01-15');
});

test('a payday lands on the Friday before a weekend, as the app would have opened it', function () {
    /** 31 May 2026 is a Sunday, so payroll pays on the 29th. */
    expect(Payout::query()->whereDate('paid_on', '2026-05-29')->exists())->toBeTrue()
        ->and(Payout::query()->whereDate('paid_on', '2026-05-31')->exists())->toBeFalse();
});

// The figures the whole demo hangs on: ₱50,000 a month in, ₱41,000 of living
// costs planned, so a month that went to plan puts ₱9,000 by.
test('the calendar reads a month for every month, with the plan seven months behind it', function () {
    $this->actingAs($this->demo)
        ->get(route('dashboard.months'))
        ->assertOk()
        ->assertInertia(
            fn (AssertableInertia $page) => $page
                ->has('savings', 7)
                /** Electricity under by 200, groceries over by 400. */
                ->where('savings.0.month', '2026-01')
                ->where('savings.0.saved', 8_800)
                /** Everything under the forecast, so the goal is met. */
                ->where('savings.1.saved', 9_500)
                /** The bonus month, which the summary reads as the best one. */
                ->where('savings.5.month', '2026-06')
                ->where('savings.5.saved', 20_100)
                /** The bad month: allowance over on both halves and a repair. */
                ->where('savings.6.saved', 1_450)
                ->etc()
        );
});

test('the demo history holds spending nobody forecast', function () {
    $unplanned = Payout::query()->with('lines')->get()
        ->flatMap->lines
        ->filter->isUnplanned();

    expect($unplanned->pluck('name')->all())->toContain('Dental work', 'Aircon repair')
        ->and($unplanned->every(fn ($line) => $line->planned === 0))->toBeTrue();
});

test('the demo history holds income the plan never expected', function () {
    $bonus = Payout::query()->whereDate('paid_on', '2026-06-30')->sole()->incomes;

    expect($bonus)->toHaveCount(2)
        ->and($bonus->last()->label)->toBe('Mid-year bonus')
        ->and($bonus->last()->planned)->toBe(0);
});

test('a seeded month exports as both a sheet and a pdf', function () {
    $response = $this->actingAs($this->demo)
        ->get(route('dashboard.months.sheet', '2026-03'))
        ->assertDownload('kept-2026-03.xlsx');

    /*
     * Loaded rather than inspected as bytes, and read from the one cell that
     * summarises the month: ₱50,000 in, ₱44,900 of living costs including the
     * dental work nobody forecast, and ₱4,000 earmarked on top of that.
     */
    $path = tempnam(sys_get_temp_dir(), 'kept').'.xlsx';
    file_put_contents($path, $response->streamedContent());
    $sheet = IOFactory::load($path)->getSheet(0);
    unlink($path);

    expect($sheet->getTitle())->toBe('Mar 2026')
        ->and($sheet->getCell('A3')->getValue())
        ->toBe('₱50,000 received · ₱48,900 spent · ₱5,100 saved');

    /*
     * Faked, so the suite never needs a browser on the machine running it. That
     * the document itself renders is settled in MonthExportTest; what is being
     * checked here is that the seeded month reaches it.
     */
    $pdf = Pdf::fake();

    $this->actingAs($this->demo)->get(route('dashboard.months.pdf', '2026-03'))->assertOk();

    $pdf->assertRespondedWithPdf(function (PdfBuilder $pdf) {
        expect($pdf->viewData['month']['label'])->toBe('March 2026')
            ->and($pdf->viewData['month']['saved'])->toBe(5_100);

        return true;
    });
});

test('seeding twice leaves one demo user and one history', function () {
    $this->seed(DemoUserSeeder::class);

    expect(User::query()->where('email', DemoUserSeeder::EMAIL)->count())->toBe(1)
        ->and(Payout::query()->count())->toBe(14)
        ->and(ExpenseItem::query()->count())->toBe(13);
});

test('the demo plan allocates the 15th to the centavo and sweeps the rest of the month', function () {
    $plan = $this->demo->budgetPlan()->with(['paychecks', 'expenseItems'])->sole();
    $paychecks = $plan->paychecks;

    $allocated = fn (int $index): int => $plan->expenseItems
        ->where('paycheck_id', $paychecks[$index]->id)
        ->sum('amount');

    expect($allocated(0))->toBe($paychecks[0]->amount)
        /** ₱20,000 committed of ₱25,000, so ₱5,000 a month is swept. */
        ->and($paychecks[1]->amount - $allocated(1))->toBe(500_000)
        /** ₱4,000 earmarked plus the ₱5,000 sweep is the ₱9,000 monthly goal. */
        ->and($plan->expenseItems->where('group', ExpenseGroup::Savings)->sum('amount'))->toBe(400_000);
});
