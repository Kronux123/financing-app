<?php

namespace App\Http\Controllers;

use App\Actions\Payouts\BreakdownSheet;
use App\Actions\Payouts\MonthBreakdown;
use App\Http\Resources\MonthBreakdownResource;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Spatie\LaravelPdf\Facades\Pdf;
use Spatie\LaravelPdf\PdfBuilder;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The savings calendar as something you can keep: a spreadsheet to work in and a
 * pdf to send on.
 *
 * Both are written from the same MonthBreakdown, so the two files always agree
 * with each other and with the tile they were downloaded from. Neither carries
 * the monthly goal — that is worked out from the plan in the browser
 * (`savingsPerMonth` in lib/budget.ts), and copying the sum onto the server to
 * print it here would be a second definition of the target waiting to drift from
 * the first.
 *
 * A month with no settled payday is a 404 rather than an empty document. There
 * is no such file, and a pdf of nothing looks like a bug in the ledger.
 */
class MonthExportController extends Controller
{
    public function __construct(
        private readonly MonthBreakdown $monthBreakdown,
        private readonly BreakdownSheet $breakdownSheet,
    ) {}

    /** One month, itemised, as a workbook. */
    public function monthSheet(Request $request, string $month): StreamedResponse
    {
        [$year, $ordinal] = $this->parse($month);

        return $this->sheet(
            $request,
            $this->breakdown($request, $year, $ordinal),
            $this->filename($month, 'xlsx'),
            withSummary: false,
        );
    }

    /** The year as a summary sheet with a tab behind it for every month. */
    public function yearSheet(Request $request, string $year): StreamedResponse
    {
        return $this->sheet(
            $request,
            $this->breakdown($request, (int) $year),
            $this->filename($year, 'xlsx'),
            withSummary: true,
        );
    }

    /**
     * One month as a pdf.
     *
     * Chromium renders it — see the `chrome` driver in config — so the document
     * is written in ordinary css and needs no print-specific dialect.
     */
    public function monthPdf(Request $request, string $month): PdfBuilder
    {
        [$year, $ordinal] = $this->parse($month);

        $months = $this->breakdown($request, $year, $ordinal);

        return Pdf::view('exports.month', [
            'month' => $months[0],
            'user' => $request->user(),
            'generatedOn' => now()->toDayDateTimeString(),
        ])
            ->format('a4')
            ->margins(14, 12, 16, 12)
            /*
             * Chromium prints its own header — the url and today's date — the
             * moment either template is set, so the empty one is what suppresses
             * it. Footer templates get no stylesheet and default to unreadably
             * small, hence the inline size, and `pageNumber`/`totalPages` are
             * Chromium's own classes rather than anything of ours.
             */
            ->headerHtml('<span></span>')
            ->footerHtml(
                '<div style="width:100%;padding:0 12mm;font:8pt \'Liberation Sans\',Arial,sans-serif;color:#737373;'
                .'display:flex;justify-content:space-between;">'
                .'<span>'.e($months[0]['label']).' · '.e((string) config('app.name')).'</span>'
                .'<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>'
                .'</div>'
            )
            ->name($this->filename($month, 'pdf'))
            ->download();
    }

    /**
     * The year and month behind `2026-07`.
     *
     * The route pattern already refuses anything that is not four digits, a
     * dash and two more, which leaves `2026-00` and `2026-13` — shapes that
     * parse and then name no month. Those are a 404, not an exception.
     *
     * @return array{0: int, 1: int}
     */
    private function parse(string $month): array
    {
        [$year, $ordinal] = array_map('intval', explode('-', $month));

        abort_if($ordinal < 1 || $ordinal > 12, 404);

        return [$year, $ordinal];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function breakdown(Request $request, int $year, ?int $month = null): array
    {
        $months = $this->monthBreakdown->handle($request->user(), $year, $month);

        abort_if($months->isEmpty(), 404);

        // resolve(), not the collection itself: a resource collection carries a
        // `data` wrapper that neither document reads.
        return MonthBreakdownResource::collection($months)->resolve($request);
    }

    /**
     * @param  array<int, array<string, mixed>>  $months
     */
    private function sheet(Request $request, array $months, string $filename, bool $withSummary): StreamedResponse
    {
        $workbook = $this->breakdownSheet->workbook($months, $this->provenance($request), $withSummary);

        return response()->streamDownload(function () use ($workbook): void {
            /*
             * Straight to the output stream, and the workbook is released after.
             * PhpSpreadsheet holds every cell in memory as an object, so a year of
             * paydays across thirteen sheets is worth handing back rather than
             * leaving to the end of the request.
             */
            $writer = new Xlsx($workbook);
            $writer->save('php://output');

            $workbook->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            /** Excel will serve a stale copy from cache without this. */
            'Cache-Control' => 'max-age=0, no-store',
        ]);
    }

    /** Whose figures these are and when they were taken. */
    private function provenance(Request $request): string
    {
        return sprintf(
            '%s · Settled paydays only · Generated %s',
            (string) $request->user()->name,
            now()->isoFormat('D MMMM YYYY'),
        );
    }

    /** `kept-2026-07.xlsx`. Dated rather than named, so a folder of them sorts. */
    private function filename(string $period, string $extension): string
    {
        return Str::slug((string) config('app.name'))."-{$period}.{$extension}";
    }
}
