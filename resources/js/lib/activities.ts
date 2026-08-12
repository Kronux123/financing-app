/**
 * The activity log reads the ledger: a row is one of a payday's incomes or one
 * of its lines, sent by ActivityLog and shaped by ActivityResource. Amounts are
 * pesos and already signed — money in positive, money out negative.
 */
export type Activity = {
    key: string;
    /** `2026-07-31`. */
    date: string;
    title: string;
    /** `Payables`, `Allowance`, `Savings`, or `Income`. */
    category: string;
    payday: string;
    amount: number;
    isUnplanned: boolean;
    status: 'pending' | 'finalized';
};

/** What the paginator holds. Worked out by the server, which does the slicing. */
export type ActivityPagination = {
    page: number;
    pageCount: number;
    rowsPerPage: number;
    firstRow: number;
    lastRow: number;
    totalRows: number;
};

/** Kept in step with `ActivityController::ROWS_PER_PAGE`. */
export const rowsPerPageOptions = [10, 25, 50, 100] as const;

export type RowsPerPage = (typeof rowsPerPageOptions)[number];

export const defaultRowsPerPage: RowsPerPage = 10;

export const rowsPerPageCookie = 'activities_rows';

/**
 * A cookie rather than local storage, because the server has to know the page
 * size before it renders: it is what decides how much to ask the database for.
 * Local storage never leaves the browser, so it could only ever have arrived one
 * render too late. Unencrypted and client-written, the way `appearance` and
 * `sidebar_state` already are — see bootstrap/app.php.
 */
export function saveRowsPerPage(rowsPerPage: RowsPerPage): void {
    const year = 365 * 24 * 60 * 60;

    document.cookie = `${rowsPerPageCookie}=${rowsPerPage};path=/;max-age=${year};SameSite=Lax`;
}

/**
 * A payday is placed rather than counted back from: history runs to years, and
 * "412 days ago" tells you nothing an actual date does not tell you better.
 *
 * Built from the parts rather than `new Date(iso)`, which reads a bare `Y-m-d`
 * as UTC midnight and lands on the day before anywhere west of Greenwich.
 */
export function formatActivityDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);

    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

/** A payday is settled, or it is still open to correction. */
export function statusLabel(status: Activity['status']): string {
    return status === 'finalized' ? 'Completed' : 'Pending';
}

/**
 * The page numbers to show, with `'gap'` standing in for the runs that are
 * elided. Short logs list every page; longer ones keep the first, the last, and
 * a window around wherever you are.
 */
export function pageWindow(
    currentPage: number,
    pageCount: number,
): (number | 'gap')[] {
    if (pageCount <= 7) {
        return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    const start = Math.max(2, Math.min(currentPage - 1, pageCount - 3));
    const end = Math.min(pageCount - 1, Math.max(currentPage + 1, 4));

    const pages: (number | 'gap')[] = [1];

    if (start > 2) {
        pages.push('gap');
    }

    for (let page = start; page <= end; page += 1) {
        pages.push(page);
    }

    if (end < pageCount - 1) {
        pages.push('gap');
    }

    pages.push(pageCount);

    return pages;
}
