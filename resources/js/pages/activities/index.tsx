import { Head, Link } from '@inertiajs/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { dashboard } from '@/routes';

const activities = [
  {
    title: 'Mortgage payment',
    category: 'Spending',
    type: 'Payment',
    amount: '-₱1,250',
    date: 'Today',
    status: 'Completed',
  },
  {
    title: 'Salary deposit',
    category: 'Savings',
    type: 'Income',
    amount: '+₱5,800',
    date: 'Yesterday',
    status: 'Completed',
  },
  {
    title: 'Groceries',
    category: 'Spending',
    type: 'Purchase',
    amount: '-₱620',
    date: '2 days ago',
    status: 'Completed',
  },
  {
    title: 'Spotify subscription',
    category: 'Spending',
    type: 'Subscription',
    amount: '-₱15',
    date: '3 days ago',
    status: 'Pending',
  },
  {
    title: 'Credit card payment',
    category: 'Spending',
    type: 'Payment',
    amount: '-₱420',
    date: '4 days ago',
    status: 'Completed',
  },
  {
    title: 'Emergency fund top-up',
    category: 'Savings',
    type: 'Transfer',
    amount: '+₱1,200',
    date: '6 days ago',
    status: 'Completed',
  },
];

const statusVariant = (status: string) => {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-500/10 text-emerald-500';
    case 'Pending':
      return 'bg-amber-500/10 text-amber-500';
    default:
      return 'bg-slate-500/10 text-slate-500';
  }
};

export default function ActivitiesPage() {
  return (
    <>
      <Head title="Activities" />

      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Activity log
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">Activities</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              A full transaction history with spendings, savings, and recent updates.
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
                  Filter and review every transaction in your account.
                </CardDescription>
              </div>
              <Badge variant="secondary">Latest</Badge>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[12%] px-3 py-3">Date</TableHead>
                  <TableHead className="w-[30%] px-6 py-3">Activity</TableHead>
                  <TableHead className="w-[16%] px-3 py-3">Category</TableHead>
                  <TableHead className="w-[16%] px-3 py-3">Type</TableHead>
                  <TableHead className="w-[14%] px-3 py-3 text-right">Amount</TableHead>
                  <TableHead className="w-[12%] px-3 py-3 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.title} className="group">
                    <TableCell className="p-2 text-sm text-muted-foreground whitespace-nowrap">
                      {activity.date}
                    </TableCell>
                    <TableCell className="px-6 py-4 font-medium text-foreground">{activity.title}</TableCell>
                    <TableCell className="px-3 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {activity.category}
                    </TableCell>
                    <TableCell className="px-3 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {activity.type}
                    </TableCell>
                    <TableCell
                      className={`px-3 py-4 text-right font-semibold ${
                        activity.amount.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
                      } whitespace-nowrap`}
                    >
                      {activity.amount}
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
