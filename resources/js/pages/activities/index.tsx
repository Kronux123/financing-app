import { Head, Link, router } from '@inertiajs/react';
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
import type {
    Activity,
    ActivityPagination as Pagination,
    RowsPerPage,
} from '@/lib/activities';
import {
    formatActivityDate,
    saveRowsPerPage,
    statusLabel,
} from '@/lib/activities';
import { formatSigned } from '@/lib/currency';
import { dashboard } from '@/routes';
import { activities as activitiesRoute } from '@/routes/dashboard';
import { index as payoutsRoute } from '@/routes/payouts';

/*
 * `text-muted-foreground` on the header's own tint lands just under the contrast
 * floor at this size, so the columns carry their own step.
 */
const columns = [
    { label: 'Date', className: 'w-[13%]' },
    { label: 'Activity', className: 'w-[29%] px-6' },
    { label: 'Category', className: 'w-[15%]' },
    { label: 'Payday', className: 'w-[17%]' },
    { label: 'Amount', className: 'w-[14%] text-right' },
    { label: 'Status', className: 'w-[12%] text-right' },
];

/*
 * The tints stay put across themes, so each status carries a darker step for
 * light mode and a lighter one for dark. The mid steps alone read at roughly
 * 2:1 against their own tint, which is well under the contrast floor.
 */
const statusVariant = (status: Activity['status']) =>
    status === 'finalized'
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
        : 'bg-amber-500/10 text-amber-800 dark:text-amber-300';

type ActivitiesPageProps = {
    activities: Activity[];
    pagination: Pagination;
};

export default function ActivitiesPage({
    activities,
    pagination,
}: ActivitiesPageProps) {
    /*
     * The page is a url, so stepping through the log is ordinary navigation:
     * shareable, and something the back button can undo. `activities` is only
     * ever the rows for the page asked for — the server did the slicing.
     */
    const goToPage = (page: number): void => {
        router.visit(activitiesRoute({ query: { page } }), {
            preserveScroll: true,
        });
    };

    /** Keeps the first visible row in view when the page size changes. */
    const changeRowsPerPage = (next: RowsPerPage): void => {
        saveRowsPerPage(next);

        // The cookie is read on the next request, so this is a visit rather
        // than local state: the new size only exists once the server has it.
        goToPage(Math.floor((pagination.firstRow - 1) / next) + 1);
    };

    return (
        <>
            <Head title="Activities" />

            <div className="flex w-full flex-1 flex-col gap-6 overflow-x-auto p-4 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase">
                            Activity log
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold text-foreground">
                            Activities
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            Every payday you have recorded, read end to end —
                            what came in, what went out, and what is still open
                            to correction.
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

                    {/*
                     * Nothing recorded is the honest answer here, not a spinner
                     * and not a table of zeroes. Paydays are opened by the
                     * daily command, so the way out of this state is time or a
                     * plan, which is what the link goes to.
                     */}
                    {pagination.totalRows === 0 ? (
                        <CardContent
                            data-test="activities-empty"
                            className="flex flex-col items-start gap-3 border-t border-border py-10"
                        >
                            <p className="text-sm font-medium text-foreground">
                                No paydays recorded yet.
                            </p>
                            <p className="max-w-prose text-sm text-muted-foreground">
                                Every activity here comes from a payday. Once
                                one has been opened and settled, what it brought
                                in and sent out shows up in this log.
                            </p>
                            <Button asChild variant="outline" size="sm">
                                <Link href={payoutsRoute()}>Go to paydays</Link>
                            </Button>
                        </CardContent>
                    ) : (
                        <>
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
                                        {activities.map((activity) => (
                                            <TableRow
                                                key={activity.key}
                                                data-test="activity-row"
                                                className="group"
                                            >
                                                <TableCell className="p-2 text-sm whitespace-nowrap text-muted-foreground">
                                                    {formatActivityDate(
                                                        activity.date,
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 font-medium text-foreground">
                                                    {activity.title}
                                                    {activity.isUnplanned && (
                                                        <span className="ml-2 inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                                                            Unplanned
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                                                    {activity.category}
                                                </TableCell>
                                                <TableCell className="px-3 py-4 text-sm whitespace-nowrap text-muted-foreground">
                                                    {activity.payday}
                                                </TableCell>
                                                <TableCell
                                                    className={`px-3 py-4 text-right font-semibold ${
                                                        activity.amount > 0
                                                            ? 'text-emerald-700 dark:text-emerald-400'
                                                            : 'text-rose-600 dark:text-rose-400'
                                                    } whitespace-nowrap tabular-nums`}
                                                >
                                                    {formatSigned(
                                                        activity.amount,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusVariant(
                                                            activity.status,
                                                        )}`}
                                                    >
                                                        {statusLabel(
                                                            activity.status,
                                                        )}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>

                            <ActivityPagination
                                {...pagination}
                                onPageChange={goToPage}
                                onRowsPerPageChange={changeRowsPerPage}
                            />
                        </>
                    )}
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
