import { Head, Link, usePage } from '@inertiajs/react';
import { CalendarDays, Landmark, PiggyBank } from 'lucide-react';
import {
    motion,
    useMotionValue,
    useReducedMotion,
    useSpring,
    useTransform,
} from 'motion/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Fragment, useCallback } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { PageBackdrop } from '@/components/page-backdrop';
import { Button } from '@/components/ui/button';

import {
    CalendarPreview,
    ChartPreview,
    DebtPreview,
    PayoutPreview,
    PlanPreview,
} from '@/components/welcome/previews';
import { appName } from '@/lib/app';
import { formatPeso } from '@/lib/currency';
import { dashboard, login, register } from '@/routes';

/**
 * The figures in the hero are an illustration, not anybody's data, and the card
 * says so on its face. They are laid out the way the planner really works: the
 * 15th carries the rent and comes out tight, the end of the month is lighter and
 * sweeps what is left into savings.
 */
type ExampleLine = {
    /** The group heading, for the single-amount groups that have no rows. */
    group?: string;
    label: string;
    /** Absent where the line is a sweep, which has no figure of its own. */
    amount?: number;
    note?: string;
};

type ExampleColumn = {
    when: string;
    takeHome: number;
    lines: ExampleLine[];
    footLabel: string;
    footAmount: number;
};

const exampleColumns: ExampleColumn[] = [
    {
        when: 'The 15th',
        takeHome: 16_500,
        lines: [
            { group: 'Payables', label: 'Rent', amount: 7_500 },
            { label: 'Internet', amount: 1_699 },
            { group: 'Allowance', label: 'Groceries and fares', amount: 4_500 },
            { group: 'Savings', label: 'Set aside', amount: 2_000 },
        ],
        footLabel: 'Left over',
        footAmount: 801,
    },
    {
        when: 'End of month',
        takeHome: 16_500,
        lines: [
            { group: 'Payables', label: 'Electricity', amount: 2_340 },
            { label: 'Water', amount: 480 },
            { label: 'Laptop installment', amount: 2_500 },
            { group: 'Allowance', label: 'Groceries and fares', amount: 6_000 },
            { group: 'Savings', label: 'Whatever is left', note: 'swept' },
        ],
        footLabel: 'Saved',
        footAmount: 5_180,
    },
];

/**
 * The three states a month passes through, named with the words the app itself
 * uses. `Pending` and `Finalized` are the real payout statuses, so the sequence
 * doubles as the vocabulary you meet on the payouts page.
 */
const monthStages = [
    {
        state: 'Plan',
        title: 'Say which paycheck covers what',
        body: 'Put every bill on the payday that funds it. Payables stay itemised; allowance and savings are one figure each. Allocate more than a paycheck holds and the page says so before you save.',
        preview: <PlanPreview />,
    },
    {
        state: 'Pending',
        title: 'A payday opens itself',
        body: 'On the 15th and the last day, a record opens with the plan copied into it as figures of its own. A payday landing on a weekend is paid the Friday before.',
        preview: <PayoutPreview />,
    },
    {
        state: 'Finalized',
        title: 'You record what actually came out',
        body: 'Correct the amounts against your payslip and settle it. The record stops following the plan from then on, and the month reaches your dashboard.',
        preview: <PayoutPreview isFinalized />,
    },
];

const alsoInHere = [
    {
        icon: PiggyBank,
        title: 'Dashboard',
        body: 'Savings progress, monthly metrics and where the money went — read from your plan and the months you have settled.',
        preview: <ChartPreview />,
    },
    {
        icon: CalendarDays,
        title: 'Savings calendar',
        body: 'January to December against your monthly goal, with the gap in pesos. Months you never recorded are drawn as outlines, not as bad months.',
        preview: <CalendarPreview />,
    },
    {
        icon: Landmark,
        title: 'Debt',
        body: 'Payables you have ticked as debt: what is left on each, the order worth clearing them in, and how long until the last one is gone.',
        preview: <DebtPreview />,
    },
];

/** True of the app as it stands — each one is a decision made in the codebase. */
const closingPoints = [
    'Monthly or semi-monthly pay',
    'Paydays open on their own',
    'Light, dark and system',
];

const easeOut = [0.22, 1, 0.36, 1] as const;

/**
 * The load entrance, as props to spread onto a `motion` element.
 *
 * Each element carries its own `initial`/`animate` and its own delay rather
 * than inheriting a variant from a staggering parent. Explicit delays are
 * easier to follow than propagation through `React.Children` anyway, and they
 * do not depend on how React Compiler (see `vite.config.ts`) memoises this
 * tree.
 *
 * Worth knowing if you change any of this: the browser suite cannot catch a
 * broken entrance. Playwright counts a fully transparent element as visible, so
 * a hero pinned at `opacity: 0` still passes every `assertSee` on the page.
 * Check it by eye.
 */
const riseAt = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.65, ease: easeOut, delay },
});

/**
 * The scroll reveal moves but never fades.
 *
 * Fading a block that holds `text-muted-foreground` puts it under the contrast
 * floor for as long as the animation runs — the token is #737373, 4.6:1 on
 * white, and part-opacity blends it to #898989 at 3.49:1. axe caught it on all
 * six paragraphs of the stages list. Translating alone never touches a computed
 * colour, so this costs nothing in contrast. See `.ai/rules/js.md`.
 */
const settleIn = {
    initial: { y: 40 },
    whileInView: { y: 0 },
    viewport: { once: true, amount: 0.12 } as const,
    transition: { duration: 0.8, ease: easeOut },
};

/**
 * Cards inside a section, arriving one after another as it comes into view.
 * Same no-fade rule as above — the stagger does the work instead, which is why
 * the offsets here are larger than they would be with an opacity ramp to hide
 * behind.
 */
const revealAt = (index: number) => ({
    initial: { y: 34 },
    whileInView: { y: 0 },
    viewport: { once: true, amount: 0.1 } as const,
    transition: {
        duration: 0.7,
        ease: easeOut,
        delay: 0.08 + index * 0.11,
    },
});

/** Degrees of tilt at the very corner of the card. */
const maxTilt = 6;

const tiltSpring = { stiffness: 220, damping: 26, mass: 0.6 } as const;

type PaycheckColumnProps = {
    column: ExampleColumn;
    delay: number;
};

function PaycheckColumn({ column, delay }: PaycheckColumnProps) {
    return (
        <motion.div
            {...riseAt(delay)}
            className="flex flex-col gap-4 p-5 sm:p-6"
        >
            <div>
                <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                    {column.when}
                </p>
                <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
                    {formatPeso(column.takeHome)}
                </p>
                <p className="text-xs text-muted-foreground">take-home</p>
            </div>

            {/*
             * Plain rows rather than a description list. Grouping the headings
             * with their lines needs a wrapper per group, which would put two
             * divs between the <dl> and its terms — a shape a description list
             * is not allowed to take. The same trap is noted on the dashboard.
             */}
            <div className="flex flex-1 flex-col gap-1.5 text-sm">
                {column.lines.map((line) => (
                    <Fragment key={line.label}>
                        {line.group && (
                            <p className="mt-2.5 text-[0.65rem] font-medium tracking-[0.14em] text-muted-foreground uppercase first:mt-0">
                                {line.group}
                            </p>
                        )}
                        <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 truncate text-muted-foreground">
                                {line.label}
                            </p>
                            <p className="shrink-0 tabular-nums">
                                {line.amount === undefined ? (
                                    <span className="text-xs text-muted-foreground">
                                        {line.note}
                                    </span>
                                ) : (
                                    formatPeso(line.amount)
                                )}
                            </p>
                        </div>
                    </Fragment>
                ))}
            </div>

            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                <p className="flex items-center gap-2 text-sm">
                    <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full bg-goal-met"
                    />
                    {column.footLabel}
                </p>
                <p className="text-lg font-semibold tabular-nums">
                    {formatPeso(column.footAmount)}
                </p>
            </div>
        </motion.div>
    );
}

type RevealSectionProps = {
    children: React.ReactNode;
    labelledBy?: string;
};

/** A full-height section that settles into place the first time you reach it. */
function RevealSection({ children, labelledBy }: RevealSectionProps) {
    return (
        <motion.section
            aria-labelledby={labelledBy}
            {...settleIn}
            className="flex min-h-svh flex-col justify-center py-20 sm:py-28"
        >
            {children}
        </motion.section>
    );
}

export default function Welcome() {
    const { auth } = usePage().props;
    const prefersReducedMotion = useReducedMotion();

    /*
     * Pointer position as a fraction either side of the card's centre. Motion
     * values are written outside React's render cycle, so a mousemove drives
     * the springs without re-rendering the hero on every frame.
     */
    const pointerX = useMotionValue(0);
    const pointerY = useMotionValue(0);
    const rotateX = useSpring(
        useTransform(pointerY, [-0.5, 0.5], [maxTilt, -maxTilt]),
        tiltSpring,
    );
    const rotateY = useSpring(
        useTransform(pointerX, [-0.5, 0.5], [-maxTilt, maxTilt]),
        tiltSpring,
    );

    const handleTilt = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>): void => {
            if (event.pointerType !== 'mouse') {
                return;
            }

            const bounds = event.currentTarget.getBoundingClientRect();

            pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
            pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
        },
        [pointerX, pointerY],
    );

    const handleTiltEnd = useCallback((): void => {
        pointerX.set(0);
        pointerY.set(0);
    }, [pointerX, pointerY]);

    return (
        <>
            <Head
                title={`${appName} — plan what comes in, record what goes out`}
            />

            <PageBackdrop variant="landing" />

            <div className="relative z-10 flex min-h-screen flex-col text-foreground">
                <header className="mx-auto flex w-full max-w-[96rem] items-center justify-between gap-4 px-5 py-6 sm:px-8">
                    <span className="flex items-center gap-2.5">
                        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <AppLogoIcon className="size-4 fill-current" />
                        </span>
                        <span className="font-semibold tracking-tight">
                            {appName}
                        </span>
                    </span>

                    <nav className="flex items-center gap-1.5">
                        {auth.user ? (
                            <Button size="sm" asChild>
                                <Link href={dashboard()}>Dashboard</Link>
                            </Button>
                        ) : (
                            <>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={login()}>Log in</Link>
                                </Button>
                                <Button size="sm" asChild>
                                    <Link href={register()}>Get started</Link>
                                </Button>
                            </>
                        )}
                    </nav>
                </header>

                <main className="mx-auto w-full max-w-[96rem] flex-1 px-5 sm:px-8">
                    <section className="grid min-h-[calc(100svh-5.5rem)] items-center gap-14 pb-16 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
                        <div>
                            <motion.p
                                {...riseAt(0)}
                                className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase"
                            >
                                Money in, money out
                            </motion.p>
                            <motion.h1
                                {...riseAt(0.07)}
                                className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
                            >
                                Plan what comes in. Record what goes out.
                            </motion.h1>
                            <motion.p
                                {...riseAt(0.15)}
                                className="mt-6 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg"
                            >
                                A personal finance planner that keeps both
                                halves: what you expect to earn each month and
                                what it has to cover, then an honest record of
                                what actually left your account when payday
                                came. Paid once a month or twice, either works.
                            </motion.p>

                            <motion.div
                                {...riseAt(0.23)}
                                className="mt-10 flex flex-wrap items-center gap-3"
                            >
                                <Button size="lg" asChild>
                                    <Link
                                        href={
                                            auth.user ? dashboard() : register()
                                        }
                                    >
                                        {auth.user
                                            ? 'Go to your dashboard'
                                            : 'Build your plan'}
                                    </Link>
                                </Button>
                                {!auth.user && (
                                    <Button variant="ghost" size="lg" asChild>
                                        <Link href={login()}>
                                            I already have an account
                                        </Link>
                                    </Button>
                                )}
                            </motion.div>
                        </div>

                        {/*
                         * The signature: the split is the product's whole idea,
                         * so the page opens with it rather than describing it.
                         * Labelled as an example on its face — invented pesos
                         * must never read as somebody's balance.
                         *
                         * The tilt sits on the inner element and the entrance on
                         * the outer one. Both animate `transform`, and one would
                         * otherwise overwrite the other.
                         */}
                        <motion.div
                            {...riseAt(0.18)}
                            style={{ perspective: 1400 }}
                        >
                            <motion.div
                                onPointerMove={
                                    prefersReducedMotion
                                        ? undefined
                                        : handleTilt
                                }
                                onPointerLeave={handleTiltEnd}
                                style={
                                    prefersReducedMotion
                                        ? undefined
                                        : { rotateX, rotateY }
                                }
                                className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                            >
                                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-6">
                                    <p className="text-sm font-medium">
                                        Example plan
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Semi-monthly
                                    </p>
                                </div>

                                <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-border">
                                    {exampleColumns.map((column, index) => (
                                        <PaycheckColumn
                                            key={column.when}
                                            column={column}
                                            delay={0.31 + index * 0.13}
                                        />
                                    ))}
                                </div>

                                <motion.div
                                    {...riseAt(0.57)}
                                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border bg-muted/40 px-5 py-4 sm:px-6"
                                >
                                    <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                                        Monthly rollup
                                    </p>
                                    <p className="flex items-baseline gap-5 text-sm">
                                        <span className="text-muted-foreground">
                                            <span className="font-semibold text-foreground tabular-nums">
                                                {formatPeso(33_000)}
                                            </span>{' '}
                                            in
                                        </span>
                                        <span className="text-muted-foreground">
                                            <span className="font-semibold text-foreground tabular-nums">
                                                {formatPeso(7_180)}
                                            </span>{' '}
                                            put by
                                        </span>
                                    </p>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </section>

                    <RevealSection labelledBy="how-a-month-works">
                        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                            The shape of a month
                        </p>
                        <h2
                            id="how-a-month-works"
                            className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
                        >
                            A plan you write once, and a record that writes
                            itself.
                        </h2>
                        <p className="mt-5 max-w-2xl text-pretty text-muted-foreground">
                            Three states, in the order you meet them. Two of
                            them are the words the payouts page uses — these are
                            the screens, shrunk down.
                        </p>

                        <ol className="mt-14 grid gap-5 lg:grid-cols-3">
                            {monthStages.map((stage, index) => (
                                <motion.li
                                    key={stage.state}
                                    {...revealAt(index)}
                                    className="flex flex-col gap-5 rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm sm:p-6"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium tabular-nums">
                                            {index + 1}
                                        </span>
                                        <span className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                                            {stage.state}
                                        </span>
                                    </div>

                                    <div className="min-h-[8.5rem]">
                                        {stage.preview}
                                    </div>

                                    <div className="mt-auto border-t border-border pt-4">
                                        <h3 className="font-semibold text-balance">
                                            {stage.title}
                                        </h3>
                                        <p className="mt-2 text-sm text-pretty text-muted-foreground">
                                            {stage.body}
                                        </p>
                                    </div>
                                </motion.li>
                            ))}
                        </ol>
                    </RevealSection>

                    <RevealSection labelledBy="the-record-holds">
                        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
                            <div>
                                <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                                    Why the ledger is worth keeping
                                </p>
                                <h2
                                    id="the-record-holds"
                                    className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
                                >
                                    Raise your rent in March. February still
                                    says what February cost.
                                </h2>
                                <p className="mt-5 max-w-xl text-pretty text-muted-foreground">
                                    A payday copies your plan; it never points
                                    at it. Once a record is finalized it stops
                                    following the plan and stops accepting
                                    edits, so your ledger keeps saying what
                                    happened — not what you would plan today.
                                </p>
                            </div>

                            {/*
                             * The claim, demonstrated rather than asserted: the
                             * same line in two places, one edited and one not,
                             * with the arrow between them cut.
                             */}
                            <div className="flex flex-col gap-3">
                                <div className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                                            Your plan, today
                                        </p>
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium">
                                            Editable
                                        </span>
                                    </div>
                                    <p className="mt-4 flex items-baseline gap-3">
                                        <span className="text-lg text-muted-foreground tabular-nums line-through">
                                            {formatPeso(7_500)}
                                        </span>
                                        <span className="text-2xl font-semibold tabular-nums">
                                            {formatPeso(8_200)}
                                        </span>
                                    </p>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        rent, raised in March
                                    </p>
                                </div>

                                <div
                                    aria-hidden
                                    className="flex items-center gap-3 px-5 text-xs text-muted-foreground"
                                >
                                    <span className="h-4 w-px bg-border" />
                                    <span className="rounded border border-dashed border-border px-2 py-0.5">
                                        does not flow through
                                    </span>
                                </div>

                                <div className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                                            February, finalized
                                        </p>
                                        <span className="flex items-center gap-1.5 rounded-full bg-goal-met/15 px-2 py-0.5 text-[0.65rem] font-medium">
                                            <span
                                                aria-hidden
                                                className="size-1.5 rounded-full bg-goal-met"
                                            />
                                            Locked
                                        </span>
                                    </div>
                                    <p className="mt-4 text-2xl font-semibold tabular-nums">
                                        {formatPeso(7_500)}
                                    </p>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        what February actually cost
                                    </p>
                                </div>
                            </div>
                        </div>
                    </RevealSection>

                    <RevealSection labelledBy="also-in-here">
                        <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                            Once a month has settled
                        </p>
                        <h2
                            id="also-in-here"
                            className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
                        >
                            Everything downstream reads from the record.
                        </h2>

                        <div className="mt-14 grid gap-5 lg:grid-cols-3">
                            {alsoInHere.map((feature, index) => (
                                <motion.div
                                    key={feature.title}
                                    {...revealAt(index)}
                                    className="flex flex-col gap-5 rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm sm:p-6"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <feature.icon
                                            aria-hidden
                                            className="size-4 text-muted-foreground"
                                        />
                                        <h3 className="font-semibold">
                                            {feature.title}
                                        </h3>
                                    </div>

                                    <div className="min-h-[6rem]">
                                        {feature.preview}
                                    </div>

                                    <p className="mt-auto border-t border-border pt-4 text-sm text-pretty text-muted-foreground">
                                        {feature.body}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </RevealSection>

                    {!auth.user && (
                        <RevealSection>
                            <div className="overflow-hidden rounded-2xl border border-border bg-card/50 page-glow backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-8 px-6 py-14 text-center sm:px-12 sm:py-20">
                                    {/*
                                     * The closing line is where the name earns
                                     * itself: what you keep is the money, and
                                     * what is kept is the record. The app does
                                     * both, and neither half means much alone.
                                     */}
                                    <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                                        One month is enough to start
                                    </p>
                                    <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                                        Keep more of what comes in. Keep the
                                        record of where it went.
                                    </h2>
                                    <p className="max-w-xl text-pretty text-muted-foreground">
                                        Set out the paychecks you are expecting
                                        and what each one has to cover. Your
                                        next payday opens itself — and once you
                                        settle it, the figures stop moving.
                                        February keeps saying what February
                                        cost, however the plan changes later.
                                    </p>

                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                        <Button size="lg" asChild>
                                            <Link href={register()}>
                                                Build your plan
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="lg"
                                            asChild
                                        >
                                            <Link href={login()}>
                                                I already have an account
                                            </Link>
                                        </Button>
                                    </div>

                                    {/*
                                     * Three things that are true of the app as
                                     * it stands, not claims about it. Each one
                                     * is a decision made elsewhere in the
                                     * codebase, which is why they can be
                                     * promised here.
                                     */}
                                    <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
                                        {closingPoints.map((point) => (
                                            <li
                                                key={point}
                                                className="flex items-center gap-2"
                                            >
                                                <span
                                                    aria-hidden
                                                    className="size-1.5 shrink-0 rounded-full bg-goal-met"
                                                />
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </RevealSection>
                    )}
                </main>

                {/*
                 * The rule lives on the inner element, not the footer. On the
                 * footer it would stretch across the horizontal padding too and
                 * sit wider than every divider in <main>, which carries its
                 * padding on the parent.
                 */}
                <footer className="mx-auto w-full max-w-[96rem] px-5 sm:px-8">
                    <p className="border-t border-border py-10 text-sm text-muted-foreground">
                        {appName} — a personal finance planner for tracking what
                        comes in and what goes out.
                    </p>
                </footer>
            </div>
        </>
    );
}
