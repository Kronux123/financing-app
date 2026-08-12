import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { RowsPerPage } from '@/lib/activities';
import { pageWindow, rowsPerPageOptions } from '@/lib/activities';

type ActivityPaginationProps = {
    page: number;
    pageCount: number;
    /**
     * Plain `number` rather than `RowsPerPage`: this comes back from the server,
     * which is where the value is checked against the allowed set. Narrowing it
     * here would only be asserting something the client cannot know.
     */
    rowsPerPage: number;
    firstRow: number;
    lastRow: number;
    totalRows: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rowsPerPage: RowsPerPage) => void;
};

export function ActivityPagination({
    page,
    pageCount,
    rowsPerPage,
    firstRow,
    lastRow,
    totalRows,
    onPageChange,
    onRowsPerPageChange,
}: ActivityPaginationProps) {
    const steps = [
        {
            label: 'First page',
            icon: ChevronsLeft,
            target: 1,
            test: 'page-first',
            disabled: page === 1,
        },
        {
            label: 'Previous page',
            icon: ChevronLeft,
            target: page - 1,
            test: 'page-prev',
            disabled: page === 1,
        },
    ];

    const forward = [
        {
            label: 'Next page',
            icon: ChevronRight,
            target: page + 1,
            test: 'page-next',
            disabled: page === pageCount,
        },
        {
            label: 'Last page',
            icon: ChevronsRight,
            target: pageCount,
            test: 'page-last',
            disabled: page === pageCount,
        },
    ];

    return (
        <div className="flex flex-col gap-4 border-t border-border px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1">
                <p
                    data-test="pagination-summary"
                    className="text-sm text-muted-foreground tabular-nums"
                >
                    Showing {firstRow}&ndash;{lastRow} of {totalRows} activities
                </p>
                <p className="text-xs text-muted-foreground">
                    Page {page} of {pageCount}
                </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex items-center gap-3">
                    <Label
                        htmlFor="rows-per-page"
                        className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                    >
                        Rows per page
                    </Label>
                    <ToggleGroup
                        id="rows-per-page"
                        type="single"
                        variant="outline"
                        size="sm"
                        value={String(rowsPerPage)}
                        onValueChange={(value) => {
                            if (value) {
                                onRowsPerPageChange(
                                    Number(value) as RowsPerPage,
                                );
                            }
                        }}
                    >
                        {rowsPerPageOptions.map((option) => (
                            <ToggleGroupItem
                                key={option}
                                value={String(option)}
                                data-test={`rows-${option}`}
                                aria-label={`Show ${option} rows per page`}
                                className="px-3 tabular-nums"
                            >
                                {option}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>

                <nav
                    aria-label="Activities pages"
                    className="flex items-center gap-1"
                >
                    {steps.map((step) => (
                        <Button
                            key={step.test}
                            variant="outline"
                            size="icon"
                            className="size-8"
                            data-test={step.test}
                            aria-label={step.label}
                            disabled={step.disabled}
                            onClick={() => onPageChange(step.target)}
                        >
                            <step.icon aria-hidden />
                        </Button>
                    ))}

                    {pageWindow(page, pageCount).map((entry, index) =>
                        entry === 'gap' ? (
                            <span
                                key={`gap-${index}`}
                                aria-hidden
                                className="px-1 text-sm text-muted-foreground"
                            >
                                &hellip;
                            </span>
                        ) : (
                            <Button
                                key={entry}
                                variant={entry === page ? 'default' : 'ghost'}
                                size="icon"
                                className="size-8 tabular-nums"
                                data-test={`page-${entry}`}
                                aria-label={`Page ${entry}`}
                                aria-current={
                                    entry === page ? 'page' : undefined
                                }
                                onClick={() => onPageChange(entry)}
                            >
                                {entry}
                            </Button>
                        ),
                    )}

                    {forward.map((step) => (
                        <Button
                            key={step.test}
                            variant="outline"
                            size="icon"
                            className="size-8"
                            data-test={step.test}
                            aria-label={step.label}
                            disabled={step.disabled}
                            onClick={() => onPageChange(step.target)}
                        >
                            <step.icon aria-hidden />
                        </Button>
                    ))}
                </nav>
            </div>
        </div>
    );
}
