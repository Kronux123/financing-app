import { Head, Link, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    Check,
    ChevronDown,
    FileJson,
    FileSpreadsheet,
    History,
    KeyRound,
    Landmark,
    PiggyBank,
} from 'lucide-react';
import {
    motion,
    MotionConfig,
    useMotionValue,
    useReducedMotion,
    useSpring,
    useTransform,
} from 'motion/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Fragment, useCallback } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { LandingBackdrop } from '@/components/welcome/landing-backdrop';
import {
    CalendarPreview,
    ChartPreview,
    DebtPreview,
    PayoutPreview,
    PlanPreview,
} from '@/components/welcome/previews';
import {
    CountUp,
    easeOut,
    RevealHeading,
    revealFrom,
} from '@/components/welcome/reveal';

import { appName } from '@/lib/app';
import { formatPeso, formatPesoExact } from '@/lib/currency';
import { cn } from '@/lib/utils';
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

/** Under the hero buttons: the three things a first-time visitor asks first. */
const heroPoints = [
    'No bank login — you type it in',
    'SSS, PhilHealth, Pag-IBIG and tax worked out',
    'Excel and PDF exports',
];

/**
 * A ₱40,000 monthly gross, as `StatutoryDeductions` works it out at the rates in
 * config/payroll.php. Copied from the real calculation rather than recomputed
 * here: a second copy of the maths in TypeScript would drift the first time a
 * rate changed. If the rates move, rerun it and update these.
 */
const exampleGross = 40_000;

const exampleDeductions = [
    { label: 'SSS', amount: 1_750, fill: 'bg-goal-close' },
    { label: 'PhilHealth', amount: 1_000, fill: 'bg-goal-close/65' },
    { label: 'Pag-IBIG', amount: 200, fill: 'bg-goal-close/35' },
    { label: 'Withholding tax', amount: 2_618.4, fill: 'bg-goal-behind' },
];

const exampleTakeHome = 34_431.6;

/**
 * Semi-monthly: half the month's tax off each paycheck, and every contribution
 * off the end of the month — see `paycheckAmounts()`.
 */
const examplePaychecks = [
    { when: 'The 15th', amount: 18_690.8 },
    { when: 'End of month', amount: 15_740.8 },
];

const fileSlug = appName.toLowerCase();

const yoursToKeep = [
    {
        icon: FileSpreadsheet,
        title: 'Spreadsheets and PDFs',
        body: 'Download a month as an Excel sheet or a PDF, or a whole year as one workbook. Files are named by date, so a folder of them sorts itself.',
        files: [
            `${fileSlug}-2026-07.xlsx`,
            `${fileSlug}-2026-07.pdf`,
            `${fileSlug}-2026.xlsx`,
        ],
    },
    {
        icon: FileJson,
        title: 'Your plan as a file',
        body: 'Export the whole budget plan and import it back — to keep a copy somewhere safe, or to start again from one.',
        files: [`${fileSlug}-budget-plan-2026-11-01.json`],
    },
    {
        icon: History,
        title: 'An activity log',
        body: 'Every peso a payday brought in or paid out, newest first. Anything that was never on the plan is flagged as unplanned.',
        files: [],
    },
    {
        icon: KeyRound,
        title: 'More than a password',
        body: 'Sign in with a passkey, add two-factor codes from an authenticator app, and verify your email before anything opens.',
        files: [],
    },
];

/** The footer's jump links, matched to each section heading's `id`. */
const footerSections = [
    { id: 'gross-to-take-home', label: 'Gross to take-home' },
    { id: 'how-a-month-works', label: 'How a month works' },
    { id: 'the-record-holds', label: 'Why the record holds' },
    { id: 'yours-to-keep', label: 'Exports and security' },
    { id: 'questions', label: 'Questions' },
];

/** Answered from what the code does, not from what a finance app usually does. */
const questions = [
    {
        question: 'Does it connect to my bank?',
        answer: 'No. Nothing is pulled from a bank or an e-wallet, and you never hand over a login. You write the plan, and you correct each payday against your payslip.',
    },
    {
        question: 'I am paid once a month. Does it still work?',
        answer: 'Yes. Choose monthly or semi-monthly pay, and the plan, the paydays and the deductions all follow whichever you pick.',
    },
    {
        question: 'What happens when payday falls on a weekend?',
        answer: 'It is paid the Friday before, so that is when the record for it opens.',
    },
    {
        question: 'Can I change a month after I have settled it?',
        answer: 'No, and that is on purpose. A finalized record stops accepting edits, so what February cost stays what February cost — however your plan changes later.',
    },
    {
        question: 'Which deductions does it work out?',
        answer: 'For a Philippine monthly gross: SSS, PhilHealth and Pag-IBIG contributions, then withholding tax on what is left, each to the centavo the way a payslip shows it.',
    },
    {
        question: 'Can I get my data out?',
        answer: 'Yes. A month downloads as Excel or PDF, a year as one Excel workbook, and your plan as a file you can import again.',
    },
];

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
 * Scroll entrances move but never fade — `revealFrom()` in
 * `components/welcome/reveal.tsx` only accepts transforms. Fading a block that
 * holds `text-muted-foreground` puts it under the contrast floor for as long as
 * the animation runs; axe caught it on all six paragraphs of the stages list.
 * See `.ai/rules/js.md`.
 *
 * Each section arrives in its own way, picked to suit what it shows: the
 * stages tip forward like cards being dealt, the record section strikes the old
 * rent through and stamps February locked, the exports slide in from either
 * side. The headings all rise word by word, which is what ties them together.
 */

/** The perspective the 3D entrances (`rotateX`, `rotateY`) are seen through. */
const revealDepth = { perspective: 1200 } as const;

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

/**
 * A full-height section. It does not move itself — its intro and its content
 * each carry their own entrance, and a moving parent would add its offset to
 * every one of them.
 */
function RevealSection({ children, labelledBy }: RevealSectionProps) {
    return (
        <section
            aria-labelledby={labelledBy}
            className="flex min-h-svh flex-col justify-center py-20 sm:py-28"
        >
            {children}
        </section>
    );
}

type SectionIntroProps = {
    eyebrow: string;
    title: string;
    /** Becomes the heading's `id`, for `aria-labelledby` and the footer links. */
    id?: string;
    body?: string[];
    /** Extra classes for the heading, such as a width cap. */
    titleClassName?: string;
};

/**
 * The eyebrow, heading and lead paragraphs every section opens with. The
 * eyebrow rises first, the heading follows word by word, then the paragraphs.
 */
function SectionIntro({
    eyebrow,
    title,
    id,
    body = [],
    titleClassName,
}: SectionIntroProps) {
    return (
        <>
            <motion.p
                {...revealFrom({ y: 20 }, 0, 0.6)}
                className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase"
            >
                {eyebrow}
            </motion.p>
            <RevealHeading
                id={id}
                className={cn(
                    'mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl',
                    titleClassName,
                )}
            >
                {title}
            </RevealHeading>
            {body.map((paragraph, index) => (
                <motion.p
                    key={paragraph}
                    {...revealFrom({ y: 28 }, 0.25 + index * 0.1)}
                    className={cn(
                        'max-w-xl text-pretty text-muted-foreground',
                        index === 0 ? 'mt-5' : 'mt-4',
                    )}
                >
                    {paragraph}
                </motion.p>
            ))}
        </>
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
        <MotionConfig reducedMotion="user">
            <Head
                title={`${appName} — plan what comes in, record what goes out`}
            />

            <LandingBackdrop />

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

                            <motion.ul
                                {...riseAt(0.31)}
                                className="mt-10 flex flex-col gap-2.5 text-sm"
                            >
                                {heroPoints.map((point) => (
                                    <li
                                        key={point}
                                        className="flex items-center gap-2.5"
                                    >
                                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-jade/15">
                                            <Check
                                                aria-hidden
                                                className="size-3 text-jade"
                                            />
                                        </span>
                                        {point}
                                    </li>
                                ))}
                            </motion.ul>
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

                    <RevealSection labelledBy="gross-to-take-home">
                        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
                            <div>
                                <SectionIntro
                                    eyebrow="Before the plan"
                                    title="Start from the figure on your offer letter."
                                    id="gross-to-take-home"
                                    body={[
                                        'Type your monthly gross and the planner works out what your paychecks will actually be: SSS, PhilHealth and Pag-IBIG first, then withholding tax on what is left — to the centavo, the way a payslip shows it.',
                                        'Paid twice a month, the tax is split across both paychecks and the contributions all come off the end of the month, so the 15th is the bigger one.',
                                    ]}
                                />
                            </div>

                            {/*
                             * The card swings in from the right, the bar grows
                             * with scaleX, the rows follow it in, and the
                             * take-home counts up — all transforms or text, so
                             * nothing fades under the contrast floor.
                             */}
                            <motion.div
                                {...revealFrom({ x: 90, rotateY: -14 }, 0.1, 1)}
                                style={{ transformPerspective: 1200 }}
                                className="overflow-hidden rounded-xl border border-border bg-card"
                            >
                                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-6">
                                    <p className="text-sm font-medium">
                                        Example deductions
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Monthly gross{' '}
                                        <span className="font-medium text-foreground tabular-nums">
                                            {formatPeso(exampleGross)}
                                        </span>
                                    </p>
                                </div>

                                <div className="flex flex-col gap-5 p-5 sm:p-6">
                                    <motion.div
                                        aria-hidden
                                        initial={{ scaleX: 0 }}
                                        whileInView={{ scaleX: 1 }}
                                        viewport={{ once: true, amount: 0.6 }}
                                        transition={{
                                            duration: 1.1,
                                            ease: easeOut,
                                            delay: 0.25,
                                        }}
                                        className="flex h-3 origin-left overflow-hidden rounded-full bg-muted"
                                    >
                                        <span
                                            className="bg-goal-met"
                                            style={{
                                                width: `${(exampleTakeHome / exampleGross) * 100}%`,
                                            }}
                                        />
                                        {exampleDeductions.map((deduction) => (
                                            <span
                                                key={deduction.label}
                                                className={deduction.fill}
                                                style={{
                                                    width: `${(deduction.amount / exampleGross) * 100}%`,
                                                }}
                                            />
                                        ))}
                                    </motion.div>

                                    <div className="flex flex-col gap-2 text-sm">
                                        {exampleDeductions.map(
                                            (deduction, index) => (
                                                <motion.div
                                                    key={deduction.label}
                                                    {...revealFrom(
                                                        { x: 48 },
                                                        0.45 + index * 0.09,
                                                        0.6,
                                                    )}
                                                    className="flex items-baseline justify-between gap-3"
                                                >
                                                    <p className="flex items-center gap-2 text-muted-foreground">
                                                        <span
                                                            aria-hidden
                                                            className={`size-2 shrink-0 rounded-full ${deduction.fill}`}
                                                        />
                                                        {deduction.label}
                                                    </p>
                                                    <p className="tabular-nums">
                                                        −
                                                        {formatPesoExact(
                                                            deduction.amount,
                                                        )}
                                                    </p>
                                                </motion.div>
                                            ),
                                        )}
                                    </div>

                                    <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                                        <p className="flex items-center gap-2 text-sm">
                                            <span
                                                aria-hidden
                                                className="size-2 shrink-0 rounded-full bg-goal-met"
                                            />
                                            Take-home
                                        </p>
                                        <p className="text-lg font-semibold">
                                            <CountUp
                                                value={exampleTakeHome}
                                                format={formatPesoExact}
                                                delay={0.3}
                                            />
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 divide-x divide-border border-t border-border bg-muted/40">
                                    {examplePaychecks.map((paycheck) => (
                                        <div
                                            key={paycheck.when}
                                            className="px-5 py-4 sm:px-6"
                                        >
                                            <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                                                {paycheck.when}
                                            </p>
                                            <p className="mt-1 font-semibold">
                                                <CountUp
                                                    value={paycheck.amount}
                                                    format={formatPesoExact}
                                                    delay={0.5}
                                                />
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </RevealSection>

                    <RevealSection labelledBy="how-a-month-works">
                        <SectionIntro
                            eyebrow="The shape of a month"
                            title="A plan you write once, and a record that writes itself."
                            id="how-a-month-works"
                            titleClassName="max-w-3xl"
                            body={[
                                'Three states, in the order you meet them. Two of them are the words the payouts page uses — these are the screens, shrunk down.',
                            ]}
                        />

                        {/* Dealt onto the table: each card tips forward from its top edge. */}
                        <ol
                            className="mt-14 grid gap-5 lg:grid-cols-3"
                            style={revealDepth}
                        >
                            {monthStages.map((stage, index) => (
                                <motion.li
                                    key={stage.state}
                                    {...revealFrom(
                                        { y: 70, rotateX: 28 },
                                        0.1 + index * 0.16,
                                        0.9,
                                    )}
                                    style={{ transformOrigin: 'top center' }}
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
                                <SectionIntro
                                    eyebrow="Why the ledger is worth keeping"
                                    title="Raise your rent in March. February still says what February cost."
                                    id="the-record-holds"
                                    body={[
                                        'A payday copies your plan; it never points at it. Once a record is finalized it stops following the plan and stops accepting edits, so your ledger keeps saying what happened — not what you would plan today.',
                                    ]}
                                />
                            </div>

                            {/*
                             * The claim, demonstrated rather than asserted: the
                             * same line in two places, one edited and one not,
                             * with the arrow between them cut.
                             *
                             * Played as a short scene: the plan arrives, the
                             * old rent is struck through and the new one
                             * lands, the cut arrow opens, then February slides
                             * in from the other side and is stamped locked.
                             */}
                            <div className="flex flex-col gap-3">
                                <motion.div
                                    {...revealFrom({ x: 70 }, 0.1)}
                                    className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                                            Your plan, today
                                        </p>
                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium">
                                            Editable
                                        </span>
                                    </div>
                                    <p className="mt-4 flex items-baseline gap-3">
                                        {/*
                                         * The strike is drawn, not the
                                         * `line-through` decoration, so it can
                                         * be pulled across the figure.
                                         */}
                                        <span className="relative text-lg text-muted-foreground tabular-nums">
                                            {formatPeso(7_500)}
                                            <motion.span
                                                aria-hidden
                                                {...revealFrom(
                                                    { scaleX: 0 },
                                                    0.55,
                                                    0.45,
                                                )}
                                                className="absolute inset-x-0 top-1/2 h-px origin-left bg-current"
                                            />
                                        </span>
                                        <motion.span
                                            {...revealFrom(
                                                { y: 18, scale: 0.7 },
                                                0.85,
                                                0.55,
                                            )}
                                            className="inline-block text-2xl font-semibold tabular-nums"
                                        >
                                            {formatPeso(8_200)}
                                        </motion.span>
                                    </p>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        rent, raised in March
                                    </p>
                                </motion.div>

                                <div
                                    aria-hidden
                                    className="flex items-center gap-3 px-5 text-xs text-muted-foreground"
                                >
                                    <motion.span
                                        {...revealFrom(
                                            { scaleY: 0 },
                                            1.05,
                                            0.4,
                                        )}
                                        className="h-4 w-px origin-top bg-border"
                                    />
                                    <motion.span
                                        {...revealFrom({ x: -24 }, 1.15, 0.5)}
                                        className="rounded border border-dashed border-border px-2 py-0.5"
                                    >
                                        does not flow through
                                    </motion.span>
                                </div>

                                <motion.div
                                    {...revealFrom({ x: -70 }, 0.35)}
                                    className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                                            February, finalized
                                        </p>
                                        <motion.span
                                            {...revealFrom(
                                                { scale: 2.2, rotate: -14 },
                                                1.35,
                                                0.45,
                                            )}
                                            className="flex items-center gap-1.5 rounded-full bg-goal-met/15 px-2 py-0.5 text-[0.65rem] font-medium"
                                        >
                                            <span
                                                aria-hidden
                                                className="size-1.5 rounded-full bg-goal-met"
                                            />
                                            Locked
                                        </motion.span>
                                    </div>
                                    <p className="mt-4 text-2xl font-semibold tabular-nums">
                                        {formatPeso(7_500)}
                                    </p>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        what February actually cost
                                    </p>
                                </motion.div>
                            </div>
                        </div>
                    </RevealSection>

                    <RevealSection labelledBy="also-in-here">
                        <SectionIntro
                            eyebrow="Once a month has settled"
                            title="Everything downstream reads from the record."
                            id="also-in-here"
                            titleClassName="max-w-3xl"
                        />

                        {/* Rising up out of the record, slightly small, and settling to size. */}
                        <div className="mt-14 grid gap-5 lg:grid-cols-3">
                            {alsoInHere.map((feature, index) => (
                                <motion.div
                                    key={feature.title}
                                    {...revealFrom(
                                        { y: 80, scale: 0.88 },
                                        0.1 + index * 0.14,
                                        0.9,
                                    )}
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

                    <RevealSection labelledBy="yours-to-keep">
                        <SectionIntro
                            eyebrow="Your record, your files"
                            title="Take it with you. Lock it behind more than a password."
                            id="yours-to-keep"
                            titleClassName="max-w-3xl"
                        />

                        {/*
                         * The left column slides in from the left and the
                         * right from the right, a row at a time, then each
                         * file name pops onto its card.
                         */}
                        <div className="mt-14 grid gap-5 sm:grid-cols-2">
                            {yoursToKeep.map((item, index) => (
                                <motion.div
                                    key={item.title}
                                    {...revealFrom(
                                        { x: index % 2 === 0 ? -80 : 80 },
                                        0.1 + Math.floor(index / 2) * 0.18,
                                        0.85,
                                    )}
                                    className="flex flex-col gap-4 rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm sm:p-6"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-jade/12">
                                            <item.icon
                                                aria-hidden
                                                className="size-4 text-jade"
                                            />
                                        </span>
                                        <h3 className="font-semibold">
                                            {item.title}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-pretty text-muted-foreground">
                                        {item.body}
                                    </p>
                                    {item.files.length > 0 && (
                                        <ul className="mt-auto flex flex-wrap gap-2">
                                            {item.files.map(
                                                (file, fileIndex) => (
                                                    <motion.li
                                                        key={file}
                                                        {...revealFrom(
                                                            {
                                                                scale: 0.4,
                                                                y: 12,
                                                            },
                                                            0.6 +
                                                                Math.floor(
                                                                    index / 2,
                                                                ) *
                                                                    0.18 +
                                                                fileIndex * 0.1,
                                                            0.5,
                                                        )}
                                                        className="rounded-md border border-border bg-card px-2 py-1 font-mono text-xs"
                                                    >
                                                        {file}
                                                    </motion.li>
                                                ),
                                            )}
                                        </ul>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </RevealSection>

                    <RevealSection labelledBy="questions">
                        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
                            <div>
                                <SectionIntro
                                    eyebrow="Before you sign up"
                                    title="Questions worth asking."
                                    id="questions"
                                />
                            </div>

                            {/*
                             * Native <details>, so every answer opens with
                             * the keyboard and is in the page for find-in-page
                             * and search engines without any script.
                             */}
                            <div className="flex flex-col divide-y divide-border border-y border-border">
                                {questions.map((item, index) => (
                                    <motion.details
                                        key={item.question}
                                        {...revealFrom(
                                            { x: 60 },
                                            0.15 + index * 0.07,
                                            0.7,
                                        )}
                                        className="group py-1"
                                    >
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-4 font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                                            {item.question}
                                            <ChevronDown
                                                aria-hidden
                                                className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180"
                                            />
                                        </summary>
                                        <p className="max-w-2xl pb-5 text-pretty text-muted-foreground">
                                            {item.answer}
                                        </p>
                                    </motion.details>
                                ))}
                            </div>
                        </div>
                    </RevealSection>

                    {!auth.user && (
                        <RevealSection>
                            <motion.div
                                {...revealFrom({ scale: 0.86, y: 60 }, 0, 1.1)}
                                className="overflow-hidden rounded-2xl border border-border bg-card/50 page-glow backdrop-blur-sm"
                            >
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
                                    <RevealHeading className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                                        Keep more of what comes in. Keep the
                                        record of where it went.
                                    </RevealHeading>
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
                            </motion.div>
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
                    <div className="flex flex-col gap-10 border-t border-border py-12 sm:flex-row sm:justify-between">
                        <div className="max-w-sm">
                            <span className="flex items-center gap-2.5">
                                <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                    <AppLogoIcon className="size-3.5 fill-current" />
                                </span>
                                <span className="font-semibold tracking-tight">
                                    {appName}
                                </span>
                            </span>
                            <p className="mt-4 text-sm text-pretty text-muted-foreground">
                                A personal finance planner for tracking what
                                comes in and what goes out — built around pesos
                                and Philippine payroll.
                            </p>
                        </div>

                        <div className="flex gap-16 text-sm">
                            <nav aria-label="On this page">
                                <p className="font-medium">On this page</p>
                                <ul className="mt-3 flex flex-col gap-2 text-muted-foreground">
                                    {footerSections.map((section) => (
                                        <li key={section.id}>
                                            <a
                                                href={`#${section.id}`}
                                                className="hover:text-foreground"
                                            >
                                                {section.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                            <nav aria-label="Account">
                                <p className="font-medium">Account</p>
                                <ul className="mt-3 flex flex-col gap-2 text-muted-foreground">
                                    {auth.user ? (
                                        <li>
                                            <Link
                                                href={dashboard()}
                                                className="hover:text-foreground"
                                            >
                                                Dashboard
                                            </Link>
                                        </li>
                                    ) : (
                                        <>
                                            <li>
                                                <Link
                                                    href={login()}
                                                    className="hover:text-foreground"
                                                >
                                                    Log in
                                                </Link>
                                            </li>
                                            <li>
                                                <Link
                                                    href={register()}
                                                    className="hover:text-foreground"
                                                >
                                                    Create an account
                                                </Link>
                                            </li>
                                        </>
                                    )}
                                </ul>
                            </nav>
                        </div>
                    </div>
                </footer>
            </div>
        </MotionConfig>
    );
}
