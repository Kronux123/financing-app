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
import { dashboard } from '@/routes';

const savingsCalendar = [
  { month: 'Apr 2025', amount: '₱6,250', pct: 0.88, status: 'On track' },
  { month: 'Mar 2025', amount: '₱6,120', pct: 0.85, status: 'On track' },
  { month: 'Feb 2025', amount: '₱5,980', pct: 0.83, status: 'Stable' },
  { month: 'Jan 2025', amount: '₱6,450', pct: 0.90, status: 'Strong' },
  { month: 'Dec 2024', amount: '₱6,100', pct: 0.85, status: 'On track' },
  { month: 'Nov 2024', amount: '₱5,200', pct: 0.75, status: 'Needs review' },
  { month: 'Oct 2024', amount: '₱5,980', pct: 0.82, status: 'Stable' },
  { month: 'Sep 2024', amount: '₱5,720', pct: 0.79, status: 'Stable' },
  { month: 'Aug 2024', amount: '₱6,050', pct: 0.86, status: 'On track' },
  { month: 'Jul 2024', amount: '₱5,890', pct: 0.81, status: 'Stable' },
  { month: 'Jun 2024', amount: '₱5,980', pct: 0.83, status: 'Stable' },
  { month: 'May 2024', amount: '₱6,140', pct: 0.87, status: 'On track' },
];

const summaryCards = [
  { label: 'Total last 12 months', value: '₱72,860' },
  { label: 'Best month', value: 'Jan 2025' },
  { label: 'Worst month', value: 'Nov 2024' },
];

export default function DashboardMonths() {
  return (
    <>
      <Head title="Savings history" />

      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Savings calendar
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">All months</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              A calendar-style overview of monthly savings, so you can spot trends and keep every month in view.
            </p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href={dashboard()}>Back to dashboard</Link>
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>12-month savings calendar</CardTitle>
                  <CardDescription>
                    Review every month in a clean, calendar-style grid.
                  </CardDescription>
                </div>
                <Badge variant="secondary">12 months</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {savingsCalendar.map((item) => (
                <div key={item.month} className="rounded-3xl border border-border bg-background p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{item.month}</p>
                    <Badge variant={item.status === 'Needs review' ? 'destructive' : item.status === 'Strong' ? 'secondary' : 'outline'}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-foreground">{item.amount}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.pct * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Yearly summary</CardTitle>
              <CardDescription>Key metrics from the last 12 months.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {summaryCards.map((card) => (
                <div key={card.label} className="rounded-3xl border border-border bg-background p-4">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
                </div>
              ))}
              <div className="rounded-3xl border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Best trend</p>
                <p className="mt-2 text-lg font-semibold text-foreground">Steady growth after February</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

DashboardMonths.layout = {
  breadcrumbs: [
    {
      title: 'Dashboard',
      href: dashboard(),
    },
    {
      title: 'All months',
    },
  ],
}
