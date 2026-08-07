import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { ActivityPagination } from '@/components/activities/activity-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { saveRowsPerPage, useRowsPerPage } from '@/hooks/use-rows-per-page';
import type { RowsPerPage } from '@/lib/activities';
import { activities, relativeDay } from '@/lib/activities';
import { formatSigned } from '@/lib/currency';
import { dashboard } from '@/routes';

/*
 * `text-muted-foreground` on the header's own tint lands just under the contrast
 * floor at this size, so the columns carry their own step.
 */
const columns = [
    { label: 'Date', className: 'w-[12%]' },
    { label: 'Activity', className: 'w-[30%] px-6' },
    { label: 'Category', className: 'w-[16%]' },
    { label: 'Type', className: 'w-[16%]' },
    { label: 'Amount', className: 'w-[14%] text-right' },
    { label: 'Status', className: 'w-[12%] text-right' },
];

/*
 * The tints stay put across themes, so each status carries a darker step for
 * light mode and a lighter one for dark. The mid steps alone read at roughly
 * 2:1 against their own tint, which is well under the contrast floor.
 */
const statusVariant = (status: string) => {
    switch (status) {
        case 'Completed':
            return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
        case 'Pending':
            return 'bg-amber-500/10 text-amber-800 dark:text-amber-300';
        default:
            return 'bg-slate-500/10 text-slate-700 dark:text-slate-300';
    }
};

export default function ActivitiesPage() {
    const rowsPerPage = useRowsPerPage();
    const [page, setPage] = useState(1);

    const totalRows = activities.length;
    const pageCount = Math.max(1, Math.ceil(totalRows / rowsPerPage));

    /*
     * Clamped rather than corrected in an effect: a smaller page size can leave
     * `page` past the end, and deriving the truth here keeps the render honest
     * without a second pass.
     */
    const currentPage = Math.min(page, pageCount);
    const firstIndex = (currentPage - 1) * rowsPerPage;
    const rows = activities.slice(firstIndex, firstIndex + rowsPerPage);

    /** Keeps the first visible row in view when the page size changes. */
    const changeRowsPerPage = (next: RowsPerPage): void => {
        setPage(Math.floor(firstIndex / next) + 1);
        saveRowsPerPage(next);
    };

    return (
        <>
            <Head title="Activities" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase">
                            Activity log
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold text-foreground">
                            Activities
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            A full transaction history with spendings, savings,
                            and recent updates.
                        </p>
                    </div>

                    <Button asChild variant="secondary" size="sm">
                        <Link href={dashboard()}>Back to dashboard</Link>
                    </Button>
                </div>

                <Card className="overflow-hidden">
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>All activities</CardTitle>
                                <CardDescription>
                                    Page through every transaction in your
                                    account. How many rows you show is
                                    remembered for next time.
                                </CardDescription>
                            </div>
                            <Badge variant="secondary">Latest</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto px-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columns.map((column) => (
                                        <TableHead
                                            key={column.label}
                                            className={`px-3 py-3 text-foreground/80 ${column.className}`}
                                        >
                                            {column.label}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((activity) => (
                                    <TableRow
                                        key={activity.id}
                                        data-test="activity-row"
                                        className="group"
                                    >
                                        <TableCell className="p-2 text-sm whitespace-nowrap text-muted-foreground">
                                            {relativeDay(activity.daysAgo)}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 font-medium text-foreground">
                                            {activity.title}
                                        </TableCell>
                                        <TableCell className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                                            {activity.category}
                                        </TableCell>
                                        <TableCell className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                                            {activity.type}
                                        </TableCell>
                                        <TableCell
                                            className={`px-3 py-4 text-right font-semibold ${
                                                activity.amount > 0
                                                    ? 'text-emerald-700 dark:text-emerald-400'
                                                    : 'text-rose-600 dark:text-rose-400'
                                            } whitespace-nowrap tabular-nums`}
                                        >
                                            {formatSigned(activity.amount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span
                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusVariant(
                                                    activity.status,
                                                )}`}
                                            >
                                                {activity.status}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>

                    <ActivityPagination
                        page={currentPage}
                        pageCount={pageCount}
                        rowsPerPage={rowsPerPage}
                        firstRow={firstIndex + 1}
                        lastRow={firstIndex + rows.length}
                        totalRows={totalRows}
                        onPageChange={setPage}
                        onRowsPerPageChange={changeRowsPerPage}
                    />
                </Card>
            </div>
        </>
    );
}

ActivitiesPage.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Activities',
        },
    ],
};
