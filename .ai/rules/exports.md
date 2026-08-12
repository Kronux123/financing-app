---
paths:
  - 'app/Http/Controllers/MonthExportController.php'
  - 'app/Actions/Payouts/MonthBreakdown.php'
  - 'app/Actions/Payouts/BreakdownSheet.php'
  - 'app/Http/Resources/MonthBreakdownResource.php'
  - 'resources/views/exports/**'
---

# Breakdown exports

## Both documents are written from one breakdown, and `saved` is not recomputed
The workbook and the pdf read the same resolved `MonthBreakdownResource`, and the month's saving comes from `MonthlySavings::savedOn()`. A file that disagreed with the calendar tile it was downloaded from would be worse than no file, and income-less-living-costs has exactly one home — see savings.md.

Sums the documents *display* also live behind that boundary: per-group subtotals are grouped and totalled in the resource, and the proportion bar's shares are worked out in `MonthBreakdown::allocation()`. A sum computed in a Blade template is a sum no test can see, and both documents wanted the same ones.

Finalized paydays only, like the calendar. An export is the document somebody reads back a year later as fact, so a pending payday's plan-time figures must not reach it.

The monthly goal is deliberately absent from both. It is `savingsPerMonth()` in `lib/budget.ts`, worked out in the browser from the stored plan; copying that sum into PHP to print it would be a second definition waiting to drift.

## The pdf renders in headless Chromium through chrome-php, not Browsershot
`spatie/laravel-pdf` is configured with the `chrome` driver (`LARAVEL_PDF_DRIVER=chrome`), backed by `chrome-php/chrome`. Browsershot is the package default and was rejected on purpose: it shells out to Node at request time, and the production image is FrankenPHP with Node only in the build stage. chrome-php needs a Chromium binary and nothing else.

So the runtime needs `LARAVEL_PDF_CHROME_BINARY` pointing at a Chrome, Chromium or Edge executable, a font package in the container (a missing font turns every ₱ into a hollow box), and `LARAVEL_PDF_CHROME_NO_SANDBOX=true` where the process runs as root.

Note `chrome-php/chrome` must be `^1.16` or newer — 1.14 caps `symfony/process` at ^7 and will not resolve against Laravel 13.

The view is self-contained css with its own `<style>` block. The app stylesheet is built for a screen with a sidebar, and `@vite` assets are served over http, which a page rendered from an html string cannot fetch.

Chromium prints its own header — url and date — the moment either template is set, so the empty `headerHtml` is what suppresses it.

## Tests fake the pdf and render the view separately
`Pdf::fake()` records the view name and data without rendering either, so it cannot catch a broken template. `tests/Feature/MonthExportTest.php` therefore also renders `exports.month` directly and asserts against the html. Nothing in the suite launches Chromium, which is what keeps the tests runnable where no browser is installed.

## Download controls are plain anchors
An Inertia `<Link>` to an export asks the page to render a spreadsheet as a component. The calendar tiles and the year button use `<a href>` with a Wayfinder `.url()`, and the browser tests assert the hrefs rather than clicking them — a click hands off to the browser's download machinery, and a browser test that waits has no deadline of its own.

## The sheet is an xlsx, and PhpSpreadsheet has two traps in it
`BreakdownSheet` builds a `Spreadsheet` with phpoffice/phpspreadsheet — pure PHP, nothing extra in the image. A month is one sheet; a year is a Summary sheet plus a tab per month, and which of the two it is gets **passed in** rather than inferred from the month count, so a year in which one month was settled still opens on its index.

**`fromArray()` needs `strictNullComparison: true`.** Left at its default, it compares each value loosely against the null placeholder, `0 == null` is true, and every nought is skipped as an empty cell — an unplanned line arrives with a blank where its nought planned belongs and the column stops adding up. Every call in that file passes it.

**Gridlines are `$sheet->setShowGridlines(false)`,** on the worksheet. `SheetView::setShowGridLines()` does not exist, and the mistake only surfaces at write time.

Payday subtotals and the year totals are written as **formulas, not figures**. Somebody who corrects a number in the file should watch the totals follow it; that is the reason to hand over a spreadsheet instead of a second pdf.

Tests read the download back with `IOFactory::load()` rather than asserting on bytes — an xlsx is a zip of xml, so the only assertion worth making is what a spreadsheet program would see. `toArray(null, false, false)` keeps formulas as formulas and numbers as numbers.

## The pdf's proportion bar reuses the calendar's validated hues
`--payables` / `--allowance` / `--saved` in the pdf are `--goal-behind` / `--goal-close` / `--goal-met` from app.css. Reusing status hues as categorical ones is normally wrong, but every alternative trio tried failed colour-blind separation or the chroma floor, and these three pass together. The relief the check asks for is present: each segment is named, percentaged and totalled in the key beneath the bar, and the itemised table follows — nothing in the document is carried by colour alone.

A month that spent more than it earned has no whole to divide. `MonthBreakdown` drops the saved segment, shares the bar across the outgoings instead, and sets `overspent`, which is what makes the document say so in words.
