import { Head, Link } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { dashboard } from '@/routes';
import dashboardRoutes from '@/routes/dashboard';

const metrics = [
  {
    label: 'Total Savings',
    value: '₱82,400',
    note: 'Saved this year',
    accent: 'bg-emerald-500/10 text-emerald-400',
  },
  {
    label: 'Monthly Expenses',
    value: '₱4,125',
    note: 'Outgoing this month',
    accent: 'bg-rose-500/10 text-rose-400',
  },
  {
    label: 'Outstanding Debt',
    value: '₱16,780',
    note: 'Remaining balance',
    accent: 'bg-amber-500/10 text-amber-400',
  },
  {
    label: 'Projected Cashflow',
    value: '+₱1,320',
    note: 'Next 30 days',
    accent: 'bg-sky-500/10 text-sky-400',
  },
];

const spendingCategories = [
  { name: 'Housing', amount: '₱1,450', color: 'bg-cyan-500' },
  { name: 'Utilities', amount: '₱630', color: 'bg-violet-500' },
  { name: 'Groceries', amount: '₱540', color: 'bg-amber-500' },
  { name: 'Transport', amount: '₱305', color: 'bg-emerald-500' },
];

const categoryColors = [
  'bg-cyan-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-fuchsia-500',
];

const monthlySavings = [
  { month: 'Nov', amount: '₱5,200', pct: 0.75 },
  { month: 'Dec', amount: '₱6,100', pct: 0.85 },
  { month: 'Jan', amount: '₱6,450', pct: 0.90 },
  { month: 'Feb', amount: '₱5,980', pct: 0.83 },
  { month: 'Mar', amount: '₱6,120', pct: 0.85 },
];

const recentActivity = [
  { title: 'Mortgage payment', amount: '-₱1,250', when: 'Today' },
  { title: 'Spotify subscription', amount: '-₱15', when: 'Yesterday' },
  { title: 'Salary deposit', amount: '+₱5,800', when: '2 days ago' },
  { title: 'Credit card payment', amount: '-₱420', when: '4 days ago' },
];

export default function Dashboard() {
  const [categoryList, setCategoryList] = useState(spendingCategories);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmount, setNewCategoryAmount] = useState('');

  useEffect(() => {
    if (!drawerOpen) {
      setShowCreateCategory(false);
      setNewCategoryName('');
      setNewCategoryAmount('');
    }
  }, [drawerOpen]);

  const handleAddCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newCategoryName.trim()) {
      return;
    }

    const rawAmount = Number(newCategoryAmount.replace(/[^0-9.]/g, '')) || 0;
    const formattedAmount = `₱${rawAmount.toLocaleString('en-US')}`;
    const nextColor = categoryColors[categoryList.length % categoryColors.length];

    setCategoryList([
      ...categoryList,
      {
        name: newCategoryName.trim(),
        amount: formattedAmount,
        color: nextColor,
      },
    ]);

    setShowCreateCategory(false);
    setNewCategoryName('');
    setNewCategoryAmount('');
  };

  return (
    <>
      <Head title="Dashboard" />

      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Financing overview
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">Your money at a glance</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              See your savings, monthly outflows, debt status, and the most important finance activity in one
              place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
              March 2026
            </div>
            <div className="inline-flex rounded-full border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
              Renewal due in 12 days
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="overflow-hidden">
              <CardHeader className="px-4 pt-4">
                <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${metric.accent}`}>
                  {metric.label}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-3xl font-semibold">{metric.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{metric.note}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Saving progress</CardTitle>
                  <CardDescription>Track your move toward the next safety milestone.</CardDescription>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                  76% funded
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm text-muted-foreground">
                  <span>Goal: ₱108,000</span>
                  <span>Saved: ₱82,400</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-border">
                  <div className="h-full w-3/4 rounded-full bg-emerald-500 transition-all duration-300" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm text-muted-foreground">Average monthly save</p>
                  <p className="mt-2 text-xl font-semibold">₱6,880</p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm text-muted-foreground">Emergency buffer</p>
                  <p className="mt-2 text-xl font-semibold">₱18,200</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Latest 5 months</p>
                      <p className="text-xs text-muted-foreground">
                        Compare your progress across the last five months.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={dashboardRoutes.months()}>View all months</Link>
                      </Button>
                      <Badge variant="secondary">On track</Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-sm text-muted-foreground">Current month</p>
                      <p className="mt-2 text-xl font-semibold">₱6,120</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-sm text-muted-foreground">Average</p>
                      <p className="mt-2 text-xl font-semibold">₱6,150</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-sm text-muted-foreground">Progress</p>
                      <p className="mt-2 text-xl font-semibold">85%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Recent monthly savings</p>
                      <p className="text-xs text-muted-foreground">
                        Your last five months of savings performance, shown with momentum and outcome.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-400">
                        Best: Jan
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                        March: ₱6,120
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {monthlySavings.map((item) => {
                      const variant = item.pct >= 0.85 ? 'bg-emerald-500' : item.pct >= 0.8 ? 'bg-sky-500' : 'bg-amber-500';
                      const status = item.pct >= 0.85 ? 'Strong month' : item.pct >= 0.8 ? 'Solid pace' : 'Needs review';

                      return (
                        <div key={item.month} className="rounded-3xl border border-border bg-background p-4 shadow-sm transition-colors duration-200 hover:bg-muted">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold">{item.month}</p>
                              <p className="text-xs text-muted-foreground">{status}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-foreground">{item.amount}</p>
                              <p className="text-xs text-muted-foreground">{Math.round(item.pct * 100)}% of goal</p>
                            </div>
                          </div>

                          <div className="mt-4 h-3 overflow-hidden rounded-full bg-border">
                            <div className={`h-full rounded-full ${variant}`} style={{ width: `${item.pct * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Spending categories</CardTitle>
                    <CardDescription>Expenses that matter most this month.</CardDescription>
                  </div>
                  <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        View all
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="flex h-full min-h-screen w-full max-w-md flex-col gap-6 bg-background">
                      <SheetHeader>
                        <SheetTitle>Spending categories</SheetTitle>
                        <SheetDescription>
                          Manage categories and quickly add a new one without leaving the dashboard.
                        </SheetDescription>
                      </SheetHeader>

                      <div className="space-y-4 px-4">
                        {categoryList.length ? (
                          categoryList.map((item) => (
                            <div key={item.name} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex h-3.5 w-3.5 rounded-full ${item.color}`} />
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">{item.amount}</p>
                                </div>
                              </div>
                              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                {Math.floor((Math.random() * 20) + 10)}%
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                            No spending categories yet.
                          </div>
                        )}
                      </div>

                      <SheetFooter className="flex flex-col gap-3 px-4 pb-4 pt-2">
                        {showCreateCategory ? (
                          <form className="space-y-4" onSubmit={handleAddCategory}>
                            <div className="grid gap-2">
                              <Label htmlFor="category-name">Category name</Label>
                              <Input
                                id="category-name"
                                value={newCategoryName}
                                onChange={(event) => setNewCategoryName(event.target.value)}
                                placeholder="e.g. Insurance"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="category-amount">Monthly amount</Label>
                              <Input
                                id="category-amount"
                                value={newCategoryAmount}
                                onChange={(event) => setNewCategoryAmount(event.target.value)}
                                placeholder="e.g. 2800"
                                inputMode="numeric"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button type="submit" className="flex-1">
                                Add category
                              </Button>
                              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateCategory(false)}>
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Create a new spending category to keep your budget organized.
                            </p>
                            <Button type="button" onClick={() => setShowCreateCategory(true)}>
                              Create new category
                            </Button>
                          </div>
                        )}
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryList.slice(0, 4).map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex h-3.5 w-3.5 rounded-full ${item.color}`} />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.amount}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {Math.floor((Math.random() * 20) + 10)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Latest transactions and updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.map((item) => (
                  <div key={item.title} className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.when}</p>
                    </div>
                    <p className={`font-semibold ${item.amount.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.amount}
                    </p>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
                <span>Updated 8 minutes ago</span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={dashboardRoutes.activities()}>Show all</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

Dashboard.layout = {
  breadcrumbs: [
    {
      title: 'Dashboard',
      href: dashboard(),
    },
  ],
};
