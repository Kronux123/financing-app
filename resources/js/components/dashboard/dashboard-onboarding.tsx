import { Link } from '@inertiajs/react';
import { ArrowRight, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { edit as financeRoute } from '@/routes/finance';

/**
 * The path from nothing to a full overview. Only the first step is a link: the
 * other two happen on their own pages once there is a plan to work from.
 */
const steps = [
    {
        title: 'Build your budget plan',
        body: 'How you get paid, what goes out, and what you put by.',
    },
    {
        title: 'Check each payday',
        body: 'Paydays open from your plan. Correct anything that came out different.',
    },
    {
        title: 'Settle it',
        body: 'A finalized payday lands here as a month of real savings.',
    },
];

/** Heights of the ghost chart, as a share of its frame. A gentle climb. */
const previewBars = [38, 52, 44, 63, 58, 76];

/**
 * A picture of the dashboard to come, drawn in shapes only. It carries no text,
 * so nothing in it has a contrast floor to clear, and it is hidden from
 * assistive tech because it says nothing the copy beside it does not.
 */
function OverviewPreview() {
    return (
        <div
            aria-hidden
            className="relative rounded-xl border border-border bg-background/60 p-4 shadow-sm"
        >
            <div className="flex items-end justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-2 w-16 rounded-full bg-muted" />
                    <div className="h-5 w-28 rounded-md bg-emerald-500/25" />
                </div>
                <div className="flex gap-3">
                    <div className="h-4 w-10 rounded-md bg-muted" />
                    <div className="h-4 w-10 rounded-md bg-muted" />
                </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((tile) => (
                    <div
                        key={tile}
                        className="space-y-1.5 rounded-lg border border-border p-2"
                    >
                        <div className="h-1.5 w-8 rounded-full bg-muted" />
                        <div className="h-3 w-12 rounded bg-muted" />
                    </div>
                ))}
            </div>

            <div className="relative mt-4 flex h-24 items-end gap-2 rounded-lg border border-border px-3 pb-2">
                <div
                    className="absolute inset-x-3 border-t border-dashed border-muted-foreground/40"
                    style={{ bottom: '62%' }}
                />
                {previewBars.map((height, index) => (
                    <div
                        key={index}
                        className={`flex-1 rounded-t-sm ${
                            index === previewBars.length - 1
                                ? 'bg-emerald-500/60'
                                : 'bg-emerald-500/20'
                        }`}
                        style={{ height: `${height}%` }}
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * Stands in for the whole overview until a plan exists. Every figure on the
 * dashboard is read from the plan or from settled paydays, so without one there
 * is nothing honest to show — and sample numbers read as somebody's real money.
 */
export function DashboardOnboarding() {
    return (
        <Card data-test="dashboard-empty" className="relative overflow-hidden">
            <div
                aria-hidden
                className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-emerald-500/10 blur-3xl"
            />

            <CardContent className="relative grid gap-10 p-6 md:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center">
                <div className="flex flex-col items-start">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        <PiggyBank aria-hidden className="size-5" />
                    </span>

                    <h2 className="mt-5 text-xl font-semibold tracking-tight text-balance">
                        Your overview fills in as you go
                    </h2>
                    <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                        Nothing here is guessed. Every figure comes from your
                        budget plan and the paydays you settle, so the first
                        step is the plan.
                    </p>

                    <ol className="mt-6 w-full max-w-md space-y-4">
                        {steps.map((step, index) => (
                            <li key={step.title} className="flex gap-3">
                                <span
                                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                                        index === 0
                                            ? 'bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950'
                                            : 'border border-border text-muted-foreground'
                                    }`}
                                >
                                    {index + 1}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">
                                        {step.title}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {step.body}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    <div className="mt-8">
                        <Button asChild>
                            <Link href={financeRoute()} data-test="build-plan">
                                Build your plan
                                <ArrowRight aria-hidden />
                            </Link>
                        </Button>
                    </div>
                </div>

                <OverviewPreview />
            </CardContent>
        </Card>
    );
}
