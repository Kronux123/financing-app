<?php

use App\Actions\Payouts\MonthBreakdown;
use App\Enums\ExpenseGroup;
use App\Http\Resources\MonthBreakdownResource;
use App\Models\Payout;
use App\Models\PayoutIncome;
use App\Models\PayoutLine;
use App\Models\User;
use Illuminate\Testing\TestResponse;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Spatie\LaravelPdf\Facades\Pdf;
use Spatie\LaravelPdf\PdfBuilder;

/**
 * A settled payday carrying a paycheck and whatever lines are named, in centavos.
 *
 * Named apart from `settledPayday` in MonthlySavingsTest on purpose: a function
 * declared in a Pest file is global once that file loads, so two of them would
 * collide on whichever suite ran second.
 */
function exportedPayday(User $user, string $paidOn, string $label, int $income, array $lines = []): Payout
{
    $payout = Payout::factory()->for($user)->finalized()->withPaycheckIncome($income)
        ->create(['paid_on' => $paidOn, 'paycheck_label' => $label]);

    foreach ($lines as $position => [$group, $name, $actual]) {
        PayoutLine::factory()->for($payout)->create([
            'group' => $group,
            'name' => $name,
            'planned' => $actual,
            'actual' => $actual,
            'position' => $position,
        ]);
    }

    return $payout;
}

/** July: 25,000 in, 9,000 payables, 4,000 allowance, 3,000 earmarked savings. */
function settledJuly(User $user): void
{
    exportedPayday($user, '2026-07-31', 'Monthly pay', 2_500_000, [
        [ExpenseGroup::Payables, 'Rent', 900_000],
        [ExpenseGroup::Allowance, 'Allowance', 400_000],
        [ExpenseGroup::Savings, 'Savings', 300_000],
    ]);
}

/**
 * The downloaded workbook, read back as a workbook.
 *
 * Written to a file and loaded rather than inspected as bytes: an xlsx is a zip of
 * xml, so the only assertion worth making is what a spreadsheet program would
 * actually see when it opens the thing.
 */
function workbook(TestResponse $response): Spreadsheet
{
    $path = tempnam(sys_get_temp_dir(), 'kept').'.xlsx';

    file_put_contents($path, $response->streamedContent());

    try {
        return IOFactory::load($path);
    } finally {
        unlink($path);
    }
}

/**
 * Raw cell values, formulas left as formulas.
 *
 * @return array<int, array<int, mixed>>
 */
function cells(Worksheet $sheet): array
{
    return $sheet->toArray(null, false, false);
}

/**
 * The row holding `$item` in the Item column, raw.
 *
 * @return array<int, mixed>
 */
function rowFor(Worksheet $sheet, string $item, int $column = 4): array
{
    foreach (cells($sheet) as $row) {
        if (($row[$column] ?? null) === $item) {
            return $row;
        }
    }

    return [];
}

test('the month workbook is one sheet, named and titled for its month', function () {
    $user = User::factory()->create();
    settledJuly($user);

    $book = workbook($this->actingAs($user)->get(route('dashboard.months.sheet', '2026-07')));

    expect($book->getSheetCount())->toBe(1)
        ->and($book->getSheet(0)->getTitle())->toBe('Jul 2026')
        ->and($book->getSheet(0)->getCell('A1')->getValue())->toBe('KEPT · July 2026 breakdown')
        /** The headline figures, readable before a single column is widened. */
        ->and($book->getSheet(0)->getCell('A3')->getValue())
        ->toBe('₱25,000 received · ₱16,000 spent · ₱12,000 saved');
});

test('the workbook arrives as a download Excel will recognise', function () {
    $user = User::factory()->create();
    settledJuly($user);

    $this->actingAs($user)
        ->get(route('dashboard.months.sheet', '2026-07'))
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        ->assertDownload('kept-2026-07.xlsx');
});

test('the table is headed, frozen and filterable', function () {
    $user = User::factory()->create();
    settledJuly($user);

    $sheet = workbook($this->actingAs($user)->get(route('dashboard.months.sheet', '2026-07')))->getSheet(0);

    expect(cells($sheet)[4])
        ->toBe(['Payday', 'Date', 'Type', 'Group', 'Item', 'Planned', 'Actual', 'Variance'])
        /** Frozen under the headings, so a long month keeps its column names. */
        ->and($sheet->getFreezePane())->toBe('A6')
        ->and($sheet->getAutoFilter()->getRange())->toStartWith('A5:H')
        ->and($sheet->getStyle('A5')->getFont()->getBold())->toBeTrue()
        /** Gridlines off: the sheet has its own rules. */
        ->and($sheet->getShowGridlines())->toBeFalse();
});

test('every income and line is a row, itemised and grouped', function () {
    $user = User::factory()->create();
    settledJuly($user);

    $sheet = workbook($this->actingAs($user)->get(route('dashboard.months.sheet', '2026-07')))->getSheet(0);

    /** The date is a serial here — its formatting has a test of its own. */
    expect(array_slice(rowFor($sheet, 'Rent'), 2))
        ->toBe(['Expense', 'Payables', 'Rent', 9000, 9000, 0])
        ->and(rowFor($sheet, 'Rent')[0])->toBe('Monthly pay')
        ->and(rowFor($sheet, 'Allowance')[3])->toBe('Allowance')
        ->and(rowFor($sheet, 'Savings')[3])->toBe('Savings')
        ->and(rowFor($sheet, 'Monthly pay')[2])->toBe('Income');
});

test('money is formatted as pesos rather than left as bare numbers', function () {
    $user = User::factory()->create();
    settledJuly($user);

    $sheet = workbook($this->actingAs($user)->get(route('dashboard.months.sheet', '2026-07')))->getSheet(0);

    expect($sheet->getCell('G6')->getFormattedValue())->toBe('₱25,000')
        /** A real date, so the column sorts as one. */
        ->and($sheet->getCell('B6')->getFormattedValue())->toBe('31 Jul 2026');
});

test('a payday subtotals in the sheet, not in php', function () {
    $user = User::factory()->create();
    settledJuly($user);

    $sheet = workbook($this->actingAs($user)->get(route('dashboard.months.sheet', '2026-07')))->getSheet(0);
    $subtotal = rowFor($sheet, 'Subtotal', 2);

    /*
     * A formula rather than a figure: somebody who corrects a number in here
     * should watch the total follow it, which is the reason to hand over a
     * spreadsheet at all.
     */
    expect($subtotal[5])->toStartWith('=SUMIF(')
        ->and($subtotal[4])->toBe('Monthly pay — 31 Jul 2026');
});

test('the month closes on the figure the calendar shows', function () {
    $user = User::factory()->create();
    settledJuly($user);

    $sheet = workbook($this->actingAs($user)->get(route('dashboard.months.sheet', '2026-07')))->getSheet(0);

    /*
     * 25,000 less 9,000 payables and 4,000 allowance. The 3,000 earmarked as
     * savings is inside that figure, not subtracted from it — the same sum
     * MonthlySavings reports to the tile this file was downloaded from.
     */
    expect(rowFor($sheet, 'Income received')[6])->toBe(25000)
        ->and(rowFor($sheet, 'Total spending')[6])->toBe(16000)
        ->and(rowFor($sheet, 'Saved')[6])->toBe(12000);
});

test('spending the plan never forecast is typed as its own kind', function () {
    $user = User::factory()->create();
    $payout = exportedPayday($user, '2026-07-31', 'Monthly pay', 2_500_000);

    PayoutLine::factory()->for($payout)->unplanned(200_000)->create();

    $sheet = workbook($this->actingAs($user)->get(route('dashboard.months.sheet', '2026-07')))->getSheet(0);

    /** Nought planned, and written as a nought rather than left blank. */
    expect(array_slice(rowFor($sheet, 'Hospital visit'), 2))
        ->toBe(['Unplanned', 'Payables', 'Hospital visit', 0, 2000, 2000]);
});

test('the year is a summary sheet with a tab behind every month', function () {
    $user = User::factory()->create();

    exportedPayday($user, '2026-05-29', 'Monthly pay', 2_000_000, [
        [ExpenseGroup::Payables, 'Rent', 900_000],
    ]);
    settledJuly($user);

    $book = workbook($this->actingAs($user)->get(route('dashboard.years.sheet', 2026))
        ->assertDownload('kept-2026.xlsx'));

    expect($book->getSheetNames())->toBe(['Summary', 'May 2026', 'Jul 2026']);

    $summary = $book->getSheetByName('Summary');

    expect(cells($summary)[4])->toBe(['Month', 'Income received', 'Total spending', 'Saved'])
        ->and(rowFor($summary, 'May 2026', 0))->toBe(['May 2026', 20000, 9000, 11000])
        ->and(rowFor($summary, 'July 2026', 0))->toBe(['July 2026', 25000, 16000, 12000])
        /** The year totals itself, so a correction in a tab is not stranded. */
        ->and(rowFor($summary, 'Year to date', 0)[3])->toStartWith('=SUM(');
});

test('a year sheet leaves out a month from another year', function () {
    $user = User::factory()->create();

    settledJuly($user);
    exportedPayday($user, '2025-07-31', 'Monthly pay', 2_500_000);

    $book = workbook($this->actingAs($user)->get(route('dashboard.years.sheet', 2026)));

    expect($book->getSheetNames())->toBe(['Summary', 'Jul 2026']);
});

// A pending payday still carries the figures the plan gave it when it opened, and
// an export is exactly the document somebody reads back later as fact.
test('a payday still pending is in neither file', function () {
    $user = User::factory()->create();

    Payout::factory()->for($user)->withPaycheckIncome(2_500_000)
        ->create(['paid_on' => '2026-07-31']);

    $this->actingAs($user)->get(route('dashboard.months.sheet', '2026-07'))->assertNotFound();
    $this->actingAs($user)->get(route('dashboard.years.sheet', 2026))->assertNotFound();
});

test('a month with nothing settled is not a file', function () {
    $user = User::factory()->create();
    settledJuly($user);

    $this->actingAs($user)->get(route('dashboard.months.sheet', '2026-08'))->assertNotFound();
    $this->actingAs($user)->get(route('dashboard.months.pdf', '2026-08'))->assertNotFound();
});

test('a month that names no month is refused', function () {
    $user = User::factory()->create();
    settledJuly($user);

    $this->actingAs($user)->get('/dashboard/months/2026-13/sheet')->assertNotFound();
    $this->actingAs($user)->get('/dashboard/months/2026-00/sheet')->assertNotFound();
    /** Not the shape the route accepts at all. */
    $this->actingAs($user)->get('/dashboard/months/july/sheet')->assertNotFound();
});

test('somebody elses month is not yours to download', function () {
    $user = User::factory()->create();
    settledJuly(User::factory()->create());

    $this->actingAs($user)->get(route('dashboard.months.sheet', '2026-07'))->assertNotFound();
    $this->actingAs($user)->get(route('dashboard.months.pdf', '2026-07'))->assertNotFound();
    $this->actingAs($user)->get(route('dashboard.years.sheet', 2026))->assertNotFound();
});

test('guests are turned away from every export', function () {
    $this->get(route('dashboard.months.sheet', '2026-07'))->assertRedirect(route('login'));
    $this->get(route('dashboard.months.pdf', '2026-07'))->assertRedirect(route('login'));
    $this->get(route('dashboard.years.sheet', 2026))->assertRedirect(route('login'));
});

test('the pdf is written from the same breakdown, named for its month', function () {
    $user = User::factory()->create();
    settledJuly($user);

    $pdf = Pdf::fake();

    $this->actingAs($user)->get(route('dashboard.months.pdf', '2026-07'))->assertOk();

    $pdf->assertRespondedWithPdf(function (PdfBuilder $pdf) {
        expect($pdf->viewName)->toBe('exports.month')
            ->and($pdf->downloadName)->toBe('kept-2026-07.pdf')
            ->and($pdf->viewData['month']['label'])->toBe('July 2026')
            ->and($pdf->viewData['month']['saved'])->toBe(12_000)
            /** Chromium prints its own header unless an empty one displaces it. */
            ->and($pdf->headerHtml)->toBe('<span></span>')
            ->and($pdf->footerHtml)->toContain('pageNumber');

        return true;
    });
});

/*
 * The fake records the view and its data without rendering either, so nothing
 * above would notice a broken template. This renders it for real — everything but
 * the Chromium pass, which is the one part that cannot break silently.
 */
test('the pdf document reports the month it was asked for', function () {
    $user = User::factory()->create(['name' => 'Rey Fuentes']);
    settledJuly($user);

    $html = renderedMonth($user, 2026, 7);

    expect($html)
        ->toContain('July 2026')
        ->toContain('Rey Fuentes')
        ->toContain('Monthly pay')
        ->toContain('Rent')
        ->toContain('₱25,000')
        /** The label says which direction it is, so the figure needs no sign. */
        ->toContain('<dt>Saved</dt>')
        ->toContain('₱12,000')
        /** The three segments of the proportion bar, by width and by label. */
        ->toContain('--tone: var(--payables); width: 36%')
        ->toContain('--tone: var(--allowance); width: 16%')
        ->toContain('--tone: var(--saved); width: 48%')
        ->toContain('Where the ₱25,000 went');
});

test('the document groups its spending and subtotals each group', function () {
    $user = User::factory()->create();
    settledJuly($user);

    $months = MonthBreakdownResource::collection(
        app(MonthBreakdown::class)->handle($user, 2026, 7)
    )->resolve(request());

    $spending = $months[0]['paydays'][0]['spending'];

    /** Walked in case order, whatever order the lines were entered in. */
    expect(array_column($spending, 'group'))->toBe(['Payables', 'Allowance', 'Savings'])
        ->and(array_column($spending, 'total'))->toBe([9_000, 4_000, 3_000]);
});

// A month that outran its income has no whole to divide into three.
test('a month that overspent says so instead of drawing a bar it cannot', function () {
    $user = User::factory()->create();

    exportedPayday($user, '2026-07-31', 'Monthly pay', 2_500_000, [
        [ExpenseGroup::Payables, 'Rent', 2_000_000],
        [ExpenseGroup::Allowance, 'Allowance', 800_000],
    ]);

    $html = renderedMonth($user, 2026, 7);

    expect($html)
        ->toContain('Overspent by')
        ->toContain('More went out than came in')
        /** Two segments off the outgoings, and no negative third. */
        ->toContain('--tone: var(--payables); width: 71.43%')
        ->not->toContain('var(--saved); width');
});

test('a bonus nobody forecast reads as unplanned income in both files', function () {
    $user = User::factory()->create();
    $payout = exportedPayday($user, '2026-07-31', 'Monthly pay', 2_500_000);

    PayoutIncome::factory()->for($payout)->bonus(500_000)->create();

    $sheet = workbook($this->actingAs($user)->get(route('dashboard.months.sheet', '2026-07')))->getSheet(0);
    $bonus = rowFor($sheet, 'Bonus', 3);

    /** Nothing planned against it, so the whole 5,000 is variance. */
    expect($bonus[2])->toBe('Income')
        ->and(array_slice($bonus, 5))->toBe([0, 5000, 5000])
        ->and($bonus[4])->toBe('Bonus');
});

/** The pdf document as Chromium would receive it, without launching Chromium. */
function renderedMonth(User $user, int $year, int $month): string
{
    $months = MonthBreakdownResource::collection(
        app(MonthBreakdown::class)->handle($user, $year, $month)
    )->resolve(request());

    return view('exports.month', [
        'month' => $months[0],
        'user' => $user,
        'generatedOn' => 'Wed, Aug 12, 2026 9:00 AM',
    ])->render();
}
