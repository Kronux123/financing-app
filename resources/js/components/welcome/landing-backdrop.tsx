import type { MotionValue } from 'motion/react';
import {
    motion,
    useMotionTemplate,
    useMotionValue,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
    wrap,
} from 'motion/react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * The landing page's background, in layers that move at different speeds.
 *
 * Back to front:
 *
 * 1. Light — the coloured glow and two slow auroras drifting through it.
 * 2. Stars — two fields of tiny dots, the far one barely moving.
 * 3. The ruled grid, and a jade copy of it lit in a spotlight at the mouse.
 * 4. Money moving — curves running from the left edge (in) to the right (out),
 *    with a packet of light travelling along each one.
 * 5. A savings curve along the bottom that draws itself in once, on load.
 * 6. Floaters — coins, pesos, ledger cards, charts and calendars, at depths.
 * 7. Bokeh — a few large, soft discs close to the camera that sweep past fast.
 *
 * Scrolling slides each layer by a fraction of the page offset, and the mouse
 * nudges it by a fraction of its distance from the centre. The nearer the
 * layer, the larger both fractions, which is what reads as depth.
 *
 * Nothing here holds text. Every shape is a box or an SVG path — the peso sign
 * included — so there is no text node for axe to measure, and the content above
 * keeps the contrast it was checked at.
 *
 * Under reduced motion the same layers render still: the page keeps its depth
 * and loses only the movement. Touch devices get the scroll parallax and never
 * the spotlight, which waits for a real mouse.
 *
 * `z-0` and `fixed`, for the same reason as `PageBackdrop` — the content above
 * has to sit at `relative z-10`.
 */
type FloaterKind =
    | 'coin'
    | 'peso'
    | 'ring'
    | 'ledger'
    | 'bars'
    | 'calendar'
    | 'receipt'
    | 'dot'
    | 'bokeh';

type Tone = 'met' | 'close' | 'behind';

type Floater = {
    kind: FloaterKind;
    /** Horizontal position, as a percentage of the viewport width. */
    left: number;
    /** Starting height, as a fraction of the viewport height. */
    top: number;
    /** Width in rem. Square shapes use it for both sides. */
    size: number;
    /** 0 is far away and barely moves; 1 is close; above 1 is past the glass. */
    depth: number;
    tone: Tone;
};

/**
 * Hand-placed rather than random, so the page looks the same on every visit.
 * The near, large shapes keep to the outer edges where the content is not.
 */
const floaters: Floater[] = [
    { kind: 'peso', left: 5, top: 0.16, size: 3, depth: 0.9, tone: 'met' },
    { kind: 'ring', left: 17, top: 0.74, size: 4.5, depth: 0.3, tone: 'close' },
    { kind: 'dot', left: 27, top: 0.08, size: 0.6, depth: 0.5, tone: 'met' },
    { kind: 'ledger', left: 35, top: 0.9, size: 5, depth: 0.45, tone: 'close' },
    {
        kind: 'coin',
        left: 46,
        top: 0.12,
        size: 1.6,
        depth: 0.35,
        tone: 'close',
    },
    { kind: 'dot', left: 52, top: 0.6, size: 0.45, depth: 0.7, tone: 'behind' },
    { kind: 'ring', left: 60, top: 0.03, size: 2.4, depth: 0.6, tone: 'met' },
    { kind: 'peso', left: 71, top: 0.94, size: 3.4, depth: 1, tone: 'met' },
    { kind: 'ledger', left: 79, top: 0.19, size: 4, depth: 0.25, tone: 'met' },
    { kind: 'dot', left: 86, top: 0.47, size: 0.7, depth: 0.9, tone: 'close' },
    { kind: 'coin', left: 92, top: 0.7, size: 2, depth: 0.55, tone: 'behind' },
    { kind: 'ring', left: 96, top: 0.3, size: 3.4, depth: 0.4, tone: 'behind' },
    { kind: 'dot', left: 12, top: 0.44, size: 0.5, depth: 0.2, tone: 'close' },
    {
        kind: 'receipt',
        left: 2,
        top: 0.57,
        size: 3.4,
        depth: 0.75,
        tone: 'behind',
    },
    { kind: 'bars', left: 88, top: 0.84, size: 4, depth: 0.65, tone: 'met' },
    {
        kind: 'calendar',
        left: 10,
        top: 0.96,
        size: 3.6,
        depth: 0.5,
        tone: 'close',
    },
    { kind: 'bars', left: 41, top: 0.36, size: 2.6, depth: 0.2, tone: 'close' },
    {
        kind: 'calendar',
        left: 66,
        top: 0.5,
        size: 2.6,
        depth: 0.28,
        tone: 'met',
    },
    { kind: 'coin', left: 24, top: 0.28, size: 1.2, depth: 0.22, tone: 'met' },
    {
        kind: 'receipt',
        left: 57,
        top: 0.82,
        size: 2.6,
        depth: 0.32,
        tone: 'close',
    },
    { kind: 'dot', left: 75, top: 0.66, size: 0.5, depth: 0.45, tone: 'met' },
    { kind: 'dot', left: 33, top: 0.55, size: 0.4, depth: 0.6, tone: 'close' },
    {
        kind: 'peso',
        left: 82,
        top: 0.04,
        size: 1.8,
        depth: 0.42,
        tone: 'close',
    },
    {
        kind: 'ring',
        left: 48,
        top: 0.88,
        size: 1.6,
        depth: 0.8,
        tone: 'behind',
    },
    { kind: 'bokeh', left: -4, top: 0.32, size: 12, depth: 1.5, tone: 'met' },
    { kind: 'bokeh', left: 90, top: 0.62, size: 16, depth: 1.8, tone: 'close' },
    {
        kind: 'bokeh',
        left: 60,
        top: 1.05,
        size: 10,
        depth: 1.6,
        tone: 'behind',
    },
];

/**
 * Money in, money out: each curve enters on the left and leaves on the right,
 * drawn in a 1440×900 box stretched to the viewport. The stroke opts out of
 * that stretch (`non-scaling-stroke`) so the lines stay a hairline everywhere.
 */
const flows: { path: string; tone: Tone; duration: number; delay: number }[] = [
    {
        path: 'M-40 210 C 300 120, 520 360, 760 260 S 1180 120, 1480 220',
        tone: 'met',
        duration: 9,
        delay: 0,
    },
    {
        path: 'M-40 520 C 260 600, 560 380, 820 480 S 1200 640, 1480 520',
        tone: 'close',
        duration: 11,
        delay: 2.5,
    },
    {
        path: 'M-40 760 C 340 700, 600 820, 900 720 S 1260 660, 1480 760',
        tone: 'behind',
        duration: 13,
        delay: 5,
    },
    {
        path: 'M-40 380 C 380 300, 640 520, 980 400 S 1300 300, 1480 360',
        tone: 'met',
        duration: 15,
        delay: 7,
    },
];

/** A savings balance that dips once and climbs, along the bottom of the view. */
const savingsCurve =
    'M0 830 C 120 820, 200 790, 300 800 S 460 760, 560 770 S 700 790, 780 740 S 940 690, 1040 700 S 1220 610, 1300 600 S 1400 560, 1440 540';

const toneColour: Record<Tone, string> = {
    met: 'var(--goal-met)',
    close: 'var(--goal-close)',
    behind: 'var(--goal-behind)',
};

const mixTone = (tone: Tone, percent: number): string =>
    `color-mix(in oklch, ${toneColour[tone]} ${percent}%, transparent)`;

/** How far, in px, a depth-1 layer travels for a full sweep of the mouse. */
const pointerReach = 46;

/** The fraction of the scroll offset a depth-1 floater moves by. */
const scrollReach = 0.55;

/** Room above and below the viewport a floater wraps through, in px. */
const wrapMargin = 260;

const pointerSpring = { stiffness: 60, damping: 20, mass: 0.8 } as const;

const easeOut = [0.22, 1, 0.36, 1] as const;

/** The peso sign as strokes, so it is a drawing rather than a character. */
function PesoGlyph({ tone }: { tone: Tone }) {
    return (
        <svg viewBox="0 0 24 24" className="size-[52%]" fill="none">
            <path
                d="M9 19V5h4.5a4 4 0 0 1 0 8H9M6 8.5h12M6 11h12"
                stroke={mixTone(tone, 80)}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function FloaterShape({ floater }: { floater: Floater }) {
    const { tone } = floater;
    const mix = (percent: number): string => mixTone(tone, percent);

    switch (floater.kind) {
        case 'coin':
        case 'peso':
            return (
                <span
                    className="relative flex aspect-square w-full items-center justify-center rounded-full border"
                    style={{
                        borderColor: mix(55),
                        background: `radial-gradient(circle at 32% 28%, ${mix(42)}, ${mix(10)} 70%)`,
                        boxShadow: `0 0 2.5rem -0.5rem ${mix(45)}, inset 0 1px 0 rgb(255 255 255 / 0.18)`,
                    }}
                >
                    {floater.kind === 'peso' ? (
                        <PesoGlyph tone={tone} />
                    ) : (
                        <span
                            className="size-[62%] rounded-full border border-dashed"
                            style={{ borderColor: mix(60) }}
                        />
                    )}
                </span>
            );

        case 'ring':
            return (
                <span
                    className="block aspect-square w-full rounded-full border-2"
                    style={{ borderColor: mix(35) }}
                />
            );

        case 'ledger':
            return (
                <span
                    className="flex w-full flex-col gap-1.5 rounded-md border p-2"
                    style={{ borderColor: mix(30), backgroundColor: mix(6) }}
                >
                    {[75, 50, 66].map((width, line) => (
                        <span
                            key={width}
                            className="flex items-center justify-between gap-2"
                        >
                            <span
                                className="h-1 rounded-full"
                                style={{
                                    width: `${width}%`,
                                    backgroundColor: mix(45 - line * 10),
                                }}
                            />
                            <span
                                className="h-1 w-3 rounded-full"
                                style={{ backgroundColor: mix(55) }}
                            />
                        </span>
                    ))}
                </span>
            );

        case 'bars':
            return (
                <span
                    className="flex aspect-[4/3] w-full items-end gap-[8%] rounded-md border p-[10%]"
                    style={{ borderColor: mix(28), backgroundColor: mix(5) }}
                >
                    {[40, 65, 50, 85, 100].map((height) => (
                        <span
                            key={height}
                            className="flex-1 rounded-sm"
                            style={{
                                height: `${height}%`,
                                backgroundColor: mix(25 + height * 0.3),
                            }}
                        />
                    ))}
                </span>
            );

        case 'calendar':
            return (
                <span
                    className="grid aspect-square w-full grid-cols-4 gap-[6%] rounded-md border p-[10%]"
                    style={{ borderColor: mix(28), backgroundColor: mix(5) }}
                >
                    {Array.from({ length: 12 }, (_, month) => (
                        <span
                            key={month}
                            className="rounded-[2px] border"
                            style={
                                month < 8
                                    ? {
                                          borderColor: 'transparent',
                                          backgroundColor: mix(
                                              month % 3 === 1 ? 30 : 55,
                                          ),
                                      }
                                    : { borderColor: mix(35) }
                            }
                        />
                    ))}
                </span>
            );

        case 'receipt':
            return (
                <span
                    className="flex w-full flex-col gap-1.5 px-[14%] pt-[14%] pb-[22%]"
                    style={{
                        backgroundColor: mix(10),
                        border: `1px solid ${mix(30)}`,
                        borderBottom: 'none',
                        clipPath:
                            'polygon(0 0, 100% 0, 100% 100%, 87.5% 94%, 75% 100%, 62.5% 94%, 50% 100%, 37.5% 94%, 25% 100%, 12.5% 94%, 0 100%)',
                    }}
                >
                    <span
                        className="h-1 w-1/2 self-center rounded-full"
                        style={{ backgroundColor: mix(50) }}
                    />
                    {[80, 60, 70].map((width) => (
                        <span
                            key={width}
                            className="h-0.5 rounded-full"
                            style={{
                                width: `${width}%`,
                                backgroundColor: mix(30),
                            }}
                        />
                    ))}
                    <span
                        className="mt-1 h-1 w-1/3 self-end rounded-full"
                        style={{ backgroundColor: mix(55) }}
                    />
                </span>
            );

        case 'bokeh':
            return (
                <span
                    className="block aspect-square w-full rounded-full blur-2xl"
                    style={{
                        background: `radial-gradient(circle, ${mix(22)}, transparent 70%)`,
                    }}
                />
            );

        case 'dot':
            return (
                <span
                    className="block aspect-square w-full rounded-full"
                    style={{
                        backgroundColor: mix(70),
                        boxShadow: `0 0 1rem ${mix(60)}`,
                    }}
                />
            );
    }
}

type PointerValues = {
    pointerX: MotionValue<number>;
    pointerY: MotionValue<number>;
};

type FloaterLayerProps = PointerValues & {
    floater: Floater;
    index: number;
    scrollY: MotionValue<number>;
    isStill: boolean;
};

/**
 * One floater, carried up the screen as the page scrolls down.
 *
 * The scroll offset is wrapped through a band a little taller than the
 * viewport, so a shape that leaves the top re-enters from the bottom out of
 * sight and the field never runs dry, however long the page gets.
 *
 * Three elements, because three things animate `transform`: the outer one takes
 * the scroll, the middle one the mouse, and the inner one the idle bob. On one
 * element they would overwrite each other.
 */
function FloaterLayer({
    floater,
    index,
    scrollY,
    pointerX,
    pointerY,
    isStill,
}: FloaterLayerProps) {
    const y = useTransform(scrollY, (offset) => {
        const height = typeof window === 'undefined' ? 900 : window.innerHeight;

        return wrap(
            -wrapMargin,
            height + wrapMargin,
            floater.top * height - offset * scrollReach * floater.depth,
        );
    });
    const nudgeX = useTransform(
        pointerX,
        (value) => value * pointerReach * floater.depth,
    );
    const nudgeY = useTransform(
        pointerY,
        (value) => value * pointerReach * floater.depth,
    );

    const isFar = floater.depth < 0.35;
    const isBokeh = floater.kind === 'bokeh';
    const tilts = !isBokeh && floater.kind !== 'dot' && floater.kind !== 'ring';

    return (
        <motion.div
            className="absolute top-0"
            style={{
                left: `${floater.left}%`,
                width: `${floater.size}rem`,
                y: isStill ? `${floater.top * 100}vh` : y,
            }}
        >
            <motion.div style={isStill ? undefined : { x: nudgeX, y: nudgeY }}>
                <motion.div
                    className={cn(isFar && 'blur-[1.5px]')}
                    style={{
                        opacity: isBokeh
                            ? 1
                            : 0.3 + Math.min(floater.depth, 1) * 0.5,
                    }}
                    animate={
                        isStill
                            ? undefined
                            : {
                                  y: [0, -10 - floater.depth * 8, 0],
                                  rotate: tilts
                                      ? [0, index % 2 ? 7 : -7, 0]
                                      : 0,
                              }
                    }
                    transition={{
                        duration: 6 + (index % 5) * 1.3,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        delay: (index % 4) * 0.7,
                    }}
                >
                    <FloaterShape floater={floater} />
                </motion.div>
            </motion.div>
        </motion.div>
    );
}

type ScrollLayerProps = PointerValues & {
    scrollY: MotionValue<number>;
    /** Fraction of the scroll offset this layer moves by. */
    scrollSpeed: number;
    /** Fraction of `pointerReach` the mouse moves it by; negative opposes. */
    pointerDepth: number;
    /** The furthest, in px, the scroll may carry it before it stops. */
    maxTravel?: number;
    isStill: boolean;
    className?: string;
    children: React.ReactNode;
};

/**
 * A full-viewport layer that slides with scroll and leans with the mouse. Used
 * for the layers that are one piece rather than a field of floaters — they are
 * oversized by `inset` so the slide never shows an edge.
 */
function ScrollLayer({
    scrollY,
    scrollSpeed,
    pointerDepth,
    maxTravel = Infinity,
    pointerX,
    pointerY,
    isStill,
    className,
    children,
}: ScrollLayerProps) {
    const x = useTransform(
        pointerX,
        (value) => value * pointerReach * pointerDepth,
    );
    const y = useTransform(
        [scrollY, pointerY] as MotionValue<number>[],
        ([offset, pointer]: number[]) =>
            -Math.min(offset * scrollSpeed, maxTravel) +
            pointer * pointerReach * pointerDepth,
    );

    return (
        <motion.div
            className={cn('absolute', className)}
            style={isStill ? undefined : { x, y }}
        >
            {children}
        </motion.div>
    );
}

/**
 * A `background-position` for a repeating pattern, drifting with scroll and
 * leaning away from the mouse.
 *
 * Patterns move their background rather than the element: they repeat, so
 * they never show an edge, and each fade-out mask stays pinned to the screen.
 */
function useBackgroundDrift(
    scrollY: MotionValue<number>,
    { pointerX, pointerY }: PointerValues,
    scrollSpeed: number,
    pointerDepth: number,
): MotionValue<string> {
    const x = useTransform(
        pointerX,
        (value) => value * -pointerReach * pointerDepth,
    );
    const y = useTransform(
        [scrollY, pointerY] as MotionValue<number>[],
        ([offset, lean]: number[]) =>
            offset * -scrollSpeed + lean * -pointerReach * pointerDepth,
    );

    return useMotionTemplate`${x}px ${y}px`;
}

export function LandingBackdrop() {
    const isStill = useReducedMotion() ?? false;
    const { scrollY } = useScroll();

    /*
     * The mouse as a fraction either side of the viewport's centre, and its
     * raw position for the spotlight. Both are motion values, so a mousemove
     * never re-renders the backdrop.
     */
    const rawPointerX = useMotionValue(0);
    const rawPointerY = useMotionValue(0);
    const pointerX = useSpring(rawPointerX, pointerSpring);
    const pointerY = useSpring(rawPointerY, pointerSpring);
    const pointer = { pointerX, pointerY };

    const spotX = useSpring(-1000, { stiffness: 300, damping: 40 });
    const spotY = useSpring(-1000, { stiffness: 300, damping: 40 });
    const spotOpacity = useSpring(0, { stiffness: 120, damping: 30 });

    useEffect(() => {
        if (isStill) {
            return;
        }

        const handleMove = (event: PointerEvent): void => {
            if (event.pointerType !== 'mouse') {
                return;
            }

            rawPointerX.set(event.clientX / window.innerWidth - 0.5);
            rawPointerY.set(event.clientY / window.innerHeight - 0.5);
            spotX.set(event.clientX);
            spotY.set(event.clientY);
            spotOpacity.set(1);
        };

        const handleLeave = (): void => {
            rawPointerX.set(0);
            rawPointerY.set(0);
            spotOpacity.set(0);
        };

        window.addEventListener('pointermove', handleMove, { passive: true });
        document.documentElement.addEventListener('pointerleave', handleLeave);

        return () => {
            window.removeEventListener('pointermove', handleMove);
            document.documentElement.removeEventListener(
                'pointerleave',
                handleLeave,
            );
        };
    }, [isStill, rawPointerX, rawPointerY, spotX, spotY, spotOpacity]);

    const farStars = useBackgroundDrift(scrollY, pointer, 0.04, 0.1);
    const nearStars = useBackgroundDrift(scrollY, pointer, 0.1, 0.25);
    const gridPosition = useBackgroundDrift(scrollY, pointer, 0.18, 0.4);

    const spotlight = useMotionTemplate`radial-gradient(circle 18rem at ${spotX}px ${spotY}px, black 0%, transparent 100%)`;
    const spotGlow = useMotionTemplate`radial-gradient(circle 26rem at ${spotX}px ${spotY}px, color-mix(in oklch, var(--goal-met) 16%, transparent), transparent 70%)`;

    return (
        <div
            aria-hidden
            data-test="landing-backdrop"
            className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        >
            {/* 1. Light */}
            <ScrollLayer
                {...pointer}
                scrollY={scrollY}
                scrollSpeed={0.08}
                maxTravel={120}
                pointerDepth={-0.6}
                isStill={isStill}
                className="-inset-[12%]"
            >
                <div className="absolute inset-0 page-glow" />
                <motion.div
                    className="absolute top-[18%] left-[8%] size-[38rem] rounded-full blur-3xl"
                    style={{
                        background: `radial-gradient(circle, ${mixTone('close', 18)}, transparent 65%)`,
                    }}
                    animate={
                        isStill
                            ? undefined
                            : { x: [0, 180, -60, 0], y: [0, 90, 160, 0] }
                    }
                    transition={{
                        duration: 38,
                        ease: 'easeInOut',
                        repeat: Infinity,
                    }}
                />
                <motion.div
                    className="absolute top-[30%] right-[6%] size-[32rem] rounded-full blur-3xl"
                    style={{
                        background: `radial-gradient(circle, ${mixTone('met', 16)}, transparent 65%)`,
                    }}
                    animate={
                        isStill
                            ? undefined
                            : { x: [0, -140, 40, 0], y: [0, -60, 120, 0] }
                    }
                    transition={{
                        duration: 46,
                        ease: 'easeInOut',
                        repeat: Infinity,
                    }}
                />
            </ScrollLayer>

            {/* 2. Stars */}
            <motion.div
                className="absolute inset-0 landing-stars-far"
                style={isStill ? undefined : { backgroundPosition: farStars }}
            />
            <motion.div
                className="absolute inset-0 landing-stars-near"
                style={isStill ? undefined : { backgroundPosition: nearStars }}
            />

            {/* 3. Grid, and the grid lit under the mouse */}
            <motion.div
                className="absolute inset-0 page-grid opacity-35"
                style={
                    isStill ? undefined : { backgroundPosition: gridPosition }
                }
            />
            {!isStill && (
                <>
                    <motion.div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: spotGlow,
                            opacity: spotOpacity,
                        }}
                    />
                    <motion.div
                        className="absolute inset-0 landing-grid-lit"
                        style={{
                            backgroundPosition: gridPosition,
                            maskImage: spotlight,
                            WebkitMaskImage: spotlight,
                            opacity: spotOpacity,
                        }}
                    />
                </>
            )}

            {/* 4. Money moving */}
            <ScrollLayer
                {...pointer}
                scrollY={scrollY}
                scrollSpeed={0.12}
                maxTravel={260}
                pointerDepth={0.35}
                isStill={isStill}
                className="-inset-x-[4%] -top-[4%] -bottom-[30%]"
            >
                <svg
                    viewBox="0 0 1440 900"
                    preserveAspectRatio="none"
                    className="size-full"
                    fill="none"
                >
                    {flows.map((flow) => (
                        <g key={flow.path}>
                            <path
                                d={flow.path}
                                stroke={mixTone(flow.tone, 22)}
                                strokeWidth={1}
                                vectorEffect="non-scaling-stroke"
                            />
                            {!isStill && (
                                <motion.path
                                    d={flow.path}
                                    stroke={mixTone(flow.tone, 85)}
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    vectorEffect="non-scaling-stroke"
                                    style={{
                                        filter: `drop-shadow(0 0 6px ${toneColour[flow.tone]})`,
                                    }}
                                    initial={{
                                        pathLength: 0.06,
                                        pathOffset: -0.06,
                                    }}
                                    animate={{ pathOffset: 1 }}
                                    transition={{
                                        duration: flow.duration,
                                        delay: flow.delay,
                                        ease: 'linear',
                                        repeat: Infinity,
                                        repeatDelay: 1.5,
                                    }}
                                />
                            )}
                        </g>
                    ))}
                </svg>
            </ScrollLayer>

            {/* 5. A savings curve, drawn in once */}
            <ScrollLayer
                {...pointer}
                scrollY={scrollY}
                scrollSpeed={0.22}
                maxTravel={420}
                pointerDepth={0.5}
                isStill={isStill}
                className="inset-x-0 -top-[2%] -bottom-[50%]"
            >
                <svg
                    viewBox="0 0 1440 900"
                    preserveAspectRatio="none"
                    className="h-[66.6%] w-full"
                    fill="none"
                >
                    <defs>
                        <linearGradient
                            id="landing-savings-fill"
                            x1="0"
                            x2="0"
                            y1="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor={toneColour.met}
                                stopOpacity={0.14}
                            />
                            <stop
                                offset="100%"
                                stopColor={toneColour.met}
                                stopOpacity={0}
                            />
                        </linearGradient>
                    </defs>
                    <motion.path
                        d={`${savingsCurve} L1440 900 L0 900 Z`}
                        fill="url(#landing-savings-fill)"
                        initial={isStill ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.6, delay: 1.2 }}
                    />
                    <motion.path
                        d={savingsCurve}
                        stroke={mixTone('met', 55)}
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                        initial={isStill ? false : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{
                            duration: 2.4,
                            delay: 0.6,
                            ease: easeOut,
                        }}
                    />
                </svg>
            </ScrollLayer>

            {/* 6 and 7. Floaters and bokeh */}
            {floaters.map((floater, index) => (
                <FloaterLayer
                    key={`${floater.kind}-${floater.left}-${floater.top}`}
                    {...pointer}
                    floater={floater}
                    index={index}
                    scrollY={scrollY}
                    isStill={isStill}
                />
            ))}
        </div>
    );
}
