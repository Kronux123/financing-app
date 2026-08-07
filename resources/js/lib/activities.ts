/**
 * The activity log is still sample data — nothing writes transactions yet. It is
 * long enough to page through so the paginator has something to do.
 */
export type Activity = {
    id: number;
    title: string;
    category: 'Spending' | 'Savings';
    type: string;
    amount: number;
    daysAgo: number;
    status: 'Completed' | 'Pending';
};

export const rowsPerPageOptions = [10, 25, 50, 100] as const;

export type RowsPerPage = (typeof rowsPerPageOptions)[number];

export const defaultRowsPerPage: RowsPerPage = 10;

/** Relative labels read better than dates for a log that is always recent. */
export function relativeDay(daysAgo: number): string {
    if (daysAgo === 0) {
        return 'Today';
    }

    if (daysAgo === 1) {
        return 'Yesterday';
    }

    return `${daysAgo} days ago`;
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

export const activities: Activity[] = [
    {
        id: 1,
        title: 'Mortgage payment',
        category: 'Spending',
        type: 'Payment',
        amount: -1_250,
        daysAgo: 0,
        status: 'Completed',
    },
    {
        id: 2,
        title: 'Salary deposit',
        category: 'Savings',
        type: 'Income',
        amount: 5_800,
        daysAgo: 1,
        status: 'Completed',
    },
    {
        id: 3,
        title: 'Groceries',
        category: 'Spending',
        type: 'Purchase',
        amount: -620,
        daysAgo: 2,
        status: 'Completed',
    },
    {
        id: 4,
        title: 'Spotify subscription',
        category: 'Spending',
        type: 'Subscription',
        amount: -15,
        daysAgo: 3,
        status: 'Pending',
    },
    {
        id: 5,
        title: 'Credit card payment',
        category: 'Spending',
        type: 'Payment',
        amount: -420,
        daysAgo: 4,
        status: 'Completed',
    },
    {
        id: 6,
        title: 'Emergency fund top-up',
        category: 'Savings',
        type: 'Transfer',
        amount: 1_200,
        daysAgo: 6,
        status: 'Completed',
    },
    {
        id: 7,
        title: 'Electricity bill',
        category: 'Spending',
        type: 'Payment',
        amount: -2_340,
        daysAgo: 7,
        status: 'Completed',
    },
    {
        id: 8,
        title: 'Water bill',
        category: 'Spending',
        type: 'Payment',
        amount: -480,
        daysAgo: 8,
        status: 'Completed',
    },
    {
        id: 9,
        title: 'Internet plan',
        category: 'Spending',
        type: 'Subscription',
        amount: -1_699,
        daysAgo: 9,
        status: 'Completed',
    },
    {
        id: 10,
        title: 'Savings pot transfer',
        category: 'Savings',
        type: 'Transfer',
        amount: 3_000,
        daysAgo: 10,
        status: 'Completed',
    },
    {
        id: 11,
        title: 'Fuel',
        category: 'Spending',
        type: 'Purchase',
        amount: -1_100,
        daysAgo: 11,
        status: 'Completed',
    },
    {
        id: 12,
        title: 'Pharmacy',
        category: 'Spending',
        type: 'Purchase',
        amount: -365,
        daysAgo: 12,
        status: 'Completed',
    },
    {
        id: 13,
        title: 'Laptop installment',
        category: 'Spending',
        type: 'Payment',
        amount: -2_500,
        daysAgo: 13,
        status: 'Completed',
    },
    {
        id: 14,
        title: 'Freelance invoice',
        category: 'Savings',
        type: 'Income',
        amount: 12_000,
        daysAgo: 14,
        status: 'Pending',
    },
    {
        id: 15,
        title: 'Mobile load',
        category: 'Spending',
        type: 'Purchase',
        amount: -299,
        daysAgo: 15,
        status: 'Completed',
    },
    {
        id: 16,
        title: 'Health insurance',
        category: 'Spending',
        type: 'Payment',
        amount: -1_850,
        daysAgo: 16,
        status: 'Completed',
    },
    {
        id: 17,
        title: 'Groceries',
        category: 'Spending',
        type: 'Purchase',
        amount: -740,
        daysAgo: 17,
        status: 'Completed',
    },
    {
        id: 18,
        title: 'Cloud storage',
        category: 'Spending',
        type: 'Subscription',
        amount: -129,
        daysAgo: 18,
        status: 'Completed',
    },
    {
        id: 19,
        title: 'Emergency fund top-up',
        category: 'Savings',
        type: 'Transfer',
        amount: 1_200,
        daysAgo: 20,
        status: 'Completed',
    },
    {
        id: 20,
        title: 'Dining out',
        category: 'Spending',
        type: 'Purchase',
        amount: -890,
        daysAgo: 21,
        status: 'Completed',
    },
    {
        id: 21,
        title: 'Salary deposit',
        category: 'Savings',
        type: 'Income',
        amount: 5_800,
        daysAgo: 22,
        status: 'Completed',
    },
    {
        id: 22,
        title: 'Transport card reload',
        category: 'Spending',
        type: 'Purchase',
        amount: -500,
        daysAgo: 23,
        status: 'Completed',
    },
    {
        id: 23,
        title: 'Gym membership',
        category: 'Spending',
        type: 'Subscription',
        amount: -1_500,
        daysAgo: 25,
        status: 'Completed',
    },
    {
        id: 24,
        title: 'Interest earned',
        category: 'Savings',
        type: 'Income',
        amount: 145,
        daysAgo: 27,
        status: 'Completed',
    },
    {
        id: 25,
        title: 'Home repairs',
        category: 'Spending',
        type: 'Purchase',
        amount: -3_200,
        daysAgo: 28,
        status: 'Completed',
    },
    {
        id: 26,
        title: 'Streaming bundle',
        category: 'Spending',
        type: 'Subscription',
        amount: -549,
        daysAgo: 30,
        status: 'Pending',
    },
];
