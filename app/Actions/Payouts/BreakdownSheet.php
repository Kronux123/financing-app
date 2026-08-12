<?php

namespace App\Actions\Payouts;

use DateTimeImmutable;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * A breakdown as a workbook somebody can actually work in.
 *
 * One row per income and per line, in ledger order, every payday subtotalled and
 * the month closed off — laid out flat, with no merged cells in the table and the
 * payday repeated on every row. That is deliberate: the first thing anyone does
 * with a spreadsheet is sort or filter it, and both destroy a layout that leans on
 * position to carry meaning. The autofilter is there because it is what the reader
 * was going to reach for anyway.
 *
 * A month is one sheet. A year is a summary sheet followed by a tab per month, so
 * the same builder writes both and the twelve tabs are the year's index.
 *
 * Reads resolved MonthBreakdownResource arrays, so the figures are already pesos
 * and match the pdf written from the same source.
 */
class BreakdownSheet
{
    /**
     * Whole pesos, as the app shows them everywhere else. The stored value keeps
     * its centavos — this rounds the display, not the number underneath.
     */
    private const MONEY = '"₱"#,##0';

    /**
     * Variance reads as a direction, so it carries its sign — and a dash where
     * there is none, because a column of ₱0 is noise the eye has to wade through
     * to find the figures that did move.
     */
    private const VARIANCE = '+"₱"#,##0;-"₱"#,##0;"—"';

    private const DATE = 'dd mmm yyyy';

    private const INK = '171717';

    private const MUTED = '737373';

    private const RULE = 'E5E5E5';

    private const BAND = 'F5F5F4';

    /** The one hue this document accents with, matching --goal-met in app.css. */
    private const ACCENT = '1BAF7A';

    private const OVERSPENT = 'BE123C';

    private const HEADINGS = ['Payday', 'Date', 'Type', 'Group', 'Item', 'Planned', 'Actual', 'Variance'];

    /** Where the table starts, once the title block above it has been written. */
    private const HEADER_ROW = 5;

    /**
     * @param  array<int, array<string, mixed>>  $months  Resolved MonthBreakdownResource arrays.
     * @param  string  $subtitle  Who it is for and when it was made.
     * @param  bool  $withSummary  Whether a year is being asked for.
     *
     * Told rather than inferred from the count: a year in which only one month was
     * ever settled is still a year, and it should open on the same index sheet as
     * any other — otherwise the file quietly changes shape with the data in it.
     */
    public function workbook(array $months, string $subtitle, bool $withSummary): Spreadsheet
    {
        $workbook = new Spreadsheet;

        $workbook->getProperties()
            ->setCreator((string) config('app.name'))
            ->setTitle($withSummary ? 'Savings breakdown' : "{$months[0]['label']} breakdown");

        if ($withSummary) {
            $this->summarySheet($workbook->getActiveSheet(), $months, $subtitle);
        }

        foreach ($months as $index => $month) {
            $sheet = ! $withSummary && $index === 0
                ? $workbook->getActiveSheet()
                : $workbook->createSheet();

            $this->monthSheet($sheet, $month, $subtitle);
        }

        $workbook->setActiveSheetIndex(0);

        return $workbook;
    }

    /**
     * The year at a glance: one row per month, and the tabs behind it for the
     * working.
     *
     * @param  array<int, array<string, mixed>>  $months
     */
    private function summarySheet(Worksheet $sheet, array $months, string $subtitle): void
    {
        $sheet->setTitle('Summary');

        $this->titleBlock($sheet, 'Savings breakdown', $subtitle, 'D');

        $sheet->fromArray(['Month', 'Income received', 'Total spending', 'Saved'], null, 'A'.self::HEADER_ROW, true);

        $row = self::HEADER_ROW + 1;

        foreach ($months as $month) {
            $sheet->fromArray([
                $month['label'],
                $month['income'],
                $month['spend'],
                $month['saved'],
            ], null, 'A'.$row, true);

            $row++;
        }

        $last = $row - 1;

        $sheet->fromArray([
            'Year to date',
            "=SUM(B{$this->firstRow()}:B{$last})",
            "=SUM(C{$this->firstRow()}:C{$last})",
            "=SUM(D{$this->firstRow()}:D{$last})",
        ], null, 'A'.$row, true);

        $this->headerRow($sheet, 'D', $row);
        $this->totalRow($sheet, "A{$row}:D{$row}");

        $sheet->getStyle("B{$this->firstRow()}:D{$row}")->getNumberFormat()->setFormatCode(self::MONEY);
        $sheet->getStyle("D{$this->firstRow()}:D{$row}")->getFont()->setBold(true);

        $this->columnWidths($sheet, ['A' => 18, 'B' => 17, 'C' => 17, 'D' => 14]);
        $this->finish($sheet, 'D', $row);
    }

    /**
     * One month, itemised.
     *
     * @param  array<string, mixed>  $month
     */
    private function monthSheet(Worksheet $sheet, array $month, string $subtitle): void
    {
        $sheet->setTitle($this->tabName($month));

        $this->titleBlock($sheet, "{$month['label']} breakdown", $subtitle, 'H');

        /*
         * The headline figures, read rather than computed. They are repeated as
         * real numbers in the closing block, which is where a formula would point.
         */
        $sheet->setCellValue('A3', sprintf(
            '%s received · %s spent · %s saved',
            $this->peso($month['income']),
            $this->peso($month['spend']),
            $this->peso($month['saved']),
        ));
        $sheet->getStyle('A3')->getFont()->setBold(true)->setSize(11)->getColor()->setRGB(self::INK);

        $sheet->fromArray(self::HEADINGS, null, 'A'.self::HEADER_ROW, true);

        $row = $this->firstRow();

        foreach ($month['paydays'] as $payday) {
            $opened = $row;

            foreach ($payday['incomes'] as $income) {
                $this->line($sheet, $row++, $payday, 'Income', $income['source'], $income['label'], $income);
            }

            foreach ($payday['spending'] as $group) {
                foreach ($group['lines'] as $line) {
                    $this->line(
                        $sheet,
                        $row,
                        $payday,
                        /** Its own type, so a filter can pull the surprises out. */
                        $line['unplanned'] ? 'Unplanned' : 'Expense',
                        $group['group'],
                        $line['name'],
                        $line,
                    );

                    if ($line['unplanned']) {
                        $sheet->getStyle("C{$row}")->getFont()->setBold(true)->getColor()->setRGB(self::OVERSPENT);
                    }

                    $row++;
                }
            }

            $this->subtotal($sheet, $row, $payday, $opened);
            $row++;
        }

        /*
         * The table stops here. No blank rows inside it — the autofilter would
         * offer them as a value to filter on, and the banded subtotals already do
         * the separating.
         */
        $tableLast = $row - 1;
        $closing = ++$row;

        foreach ([['Income received', $month['income']], ['Total spending', $month['spend']], ['Saved', $month['saved']]] as [$label, $amount]) {
            $sheet->setCellValue("E{$row}", $label);
            $sheet->setCellValue("G{$row}", $amount);
            $row++;
        }

        $last = $row - 1;

        $this->headerRow($sheet, 'H', $last);
        $this->totalRow($sheet, "A{$closing}:H{$last}");

        /** The month's own figure, in the accent this document keeps for saving. */
        $sheet->getStyle("E{$last}:G{$last}")->getFont()->getColor()
            ->setRGB($month['saved'] < 0 ? self::OVERSPENT : self::ACCENT);

        $sheet->getStyle('F'.$this->firstRow().":H{$last}")->getNumberFormat()->setFormatCode(self::MONEY);
        $sheet->getStyle('H'.$this->firstRow().":H{$last}")->getNumberFormat()->setFormatCode(self::VARIANCE);
        $sheet->getStyle('B'.$this->firstRow().':B'.$last)->getNumberFormat()->setFormatCode(self::DATE);

        $this->columnWidths($sheet, [
            'A' => 16, 'B' => 14, 'C' => 12, 'D' => 13, 'E' => 30, 'F' => 12, 'G' => 12, 'H' => 12,
        ]);

        $sheet->setAutoFilter('A'.self::HEADER_ROW.":H{$tableLast}");
        $this->finish($sheet, 'H', $last);
    }

    /**
     * One itemised row.
     *
     * @param  array<string, mixed>  $payday
     * @param  array<string, mixed>  $figures
     */
    private function line(Worksheet $sheet, int $row, array $payday, string $type, string $group, string $item, array $figures): void
    {
        $sheet->fromArray([
            $payday['label'],
            /** A real date, so the column sorts and filters as one. */
            ExcelDate::PHPToExcel(new DateTimeImmutable($payday['paidOn'])),
            $type,
            $group,
            $item,
            $figures['planned'],
            $figures['actual'],
            $figures['variance'],
            /*
             * Strict, on every fromArray in this file. Left loose, `0 == null` is
             * true and every nought is skipped as if it were an empty cell — so an
             * unplanned line would arrive with a blank where its nought planned
             * should be, and the column would not add up.
             */
        ], null, "A{$row}", true);

        $sheet->getStyle("A{$row}:H{$row}")->getBorders()->getBottom()
            ->setBorderStyle(Border::BORDER_HAIR)->getColor()->setRGB(self::RULE);

        /*
         * Over the forecast is the bad direction on money out and the good one on
         * money in, so the colour follows the meaning rather than the sign. The
         * number format supplies the minus; this supplies the reading.
         */
        $overspent = $type === 'Income'
            ? $figures['variance'] < 0
            : $figures['variance'] > 0;

        if ($figures['variance'] != 0) {
            $sheet->getStyle("H{$row}")->getFont()->getColor()
                ->setRGB($overspent ? self::OVERSPENT : self::ACCENT);
        }
    }

    /**
     * What one payday spent, summed in the sheet rather than in php.
     *
     * A formula, not a value: somebody who corrects a figure in here should see
     * the total follow it, which is the whole reason to hand over a spreadsheet
     * rather than a pdf.
     *
     * @param  array<string, mixed>  $payday
     */
    private function subtotal(Worksheet $sheet, int $row, array $payday, int $opened): void
    {
        $sheet->setCellValue("C{$row}", 'Subtotal');
        $sheet->setCellValue("E{$row}", "{$payday['label']} — {$this->paidOn($payday)}");

        foreach (['F', 'G', 'H'] as $column) {
            $sheet->setCellValue("{$column}{$row}", "=SUMIF(\$C\${$opened}:\$C\$".($row - 1).",\"<>Income\",{$column}{$opened}:{$column}".($row - 1).')');
        }

        $sheet->getStyle("A{$row}:H{$row}")->applyFromArray([
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::BAND]],
            'borders' => ['top' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => self::RULE]]],
        ]);
    }

    /**
     * The masthead. Merged across the table so a long title does not decide the
     * width of the first column.
     */
    private function titleBlock(Worksheet $sheet, string $title, string $subtitle, string $lastColumn): void
    {
        $sheet->setCellValue('A1', mb_strtoupper((string) config('app.name')).' · '.$title);
        $sheet->mergeCells("A1:{$lastColumn}1");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(15)->getColor()->setRGB(self::INK);
        $sheet->getRowDimension(1)->setRowHeight(26);

        $sheet->setCellValue('A2', $subtitle);
        $sheet->mergeCells("A2:{$lastColumn}2");
        $sheet->getStyle('A2')->getFont()->setSize(9)->getColor()->setRGB(self::MUTED);
    }

    private function headerRow(Worksheet $sheet, string $lastColumn, int $lastRow): void
    {
        $header = self::HEADER_ROW;

        $sheet->getStyle("A{$header}:{$lastColumn}{$header}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 9, 'color' => ['rgb' => self::MUTED]],
            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => self::INK]]],
        ]);

        $sheet->getRowDimension($header)->setRowHeight(20);

        /** Frozen, so the columns still have names three paydays down. */
        $sheet->freezePane('A'.$this->firstRow());

        /** Repeated at the top of every printed page, for the same reason. */
        $sheet->getPageSetup()->setRowsToRepeatAtTopByStartAndEnd($header, $header);
        $sheet->getPageSetup()->setPrintArea("A1:{$lastColumn}{$lastRow}");
    }

    private function totalRow(Worksheet $sheet, string $range): void
    {
        $sheet->getStyle($range)->applyFromArray([
            'font' => ['bold' => true],
            'borders' => ['top' => ['borderStyle' => Border::BORDER_DOUBLE, 'color' => ['rgb' => self::INK]]],
        ]);
    }

    /**
     * @param  array<string, int>  $widths
     */
    private function columnWidths(Worksheet $sheet, array $widths): void
    {
        foreach ($widths as $column => $width) {
            $sheet->getColumnDimension($column)->setWidth($width);
        }
    }

    /**
     * The finishing pass every sheet gets.
     *
     * Gridlines off: they are the default because a blank sheet needs them, and a
     * laid-out one is only competing with its own rules. The money columns are
     * right-aligned by being numbers, so only the headings above them need saying.
     */
    private function finish(Worksheet $sheet, string $lastColumn, int $lastRow): void
    {
        $sheet->setShowGridlines(false);
        $sheet->getTabColor()->setRGB(self::ACCENT);

        $numbers = chr(ord($lastColumn) - 2);

        $sheet->getStyle("{$numbers}".self::HEADER_ROW.":{$lastColumn}".self::HEADER_ROW)
            ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        $sheet->getStyle("A1:{$lastColumn}{$lastRow}")->getFont()->setName('Calibri');
        $sheet->getPageSetup()
            ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
            ->setFitToWidth(1)
            ->setFitToHeight(0);

        $sheet->setSelectedCell('A1');
    }

    /** Where the itemised rows begin — the row under the headings. */
    private function firstRow(): int
    {
        return self::HEADER_ROW + 1;
    }

    /**
     * `Jul 2026`, short enough for a tab and unambiguous across years.
     *
     * @param  array<string, mixed>  $month
     */
    private function tabName(array $month): string
    {
        return substr($month['label'], 0, 3).' '.substr($month['month'], 0, 4);
    }

    /**
     * @param  array<string, mixed>  $payday
     */
    private function paidOn(array $payday): string
    {
        return date('j M Y', strtotime($payday['paidOn']));
    }

    private function peso(float|int $amount): string
    {
        return '₱'.number_format($amount);
    }
}
