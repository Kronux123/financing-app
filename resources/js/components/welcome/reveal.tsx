import type { TargetAndTransition } from 'motion/react';
import {
    animate,
    motion,
    useInView,
    useMotionValue,
    useReducedMotion,
    useTransform,
} from 'motion/react';
import { Fragment, useEffect, useRef } from 'react';

/**
 * Scroll entrances for the landing page.
 *
 * None of these fade. Part-opacity blends `text-muted-foreground` under the
 * 4.5:1 floor for as long as the animation runs, and a scroll entrance can sit
 * mid-flight for as long as the reader takes to scroll — see `.ai/rules/js.md`.
 * Everything here moves, scales, tilts, masks or counts instead: none of those
 * touch a computed colour.
 *
 * Under reduced motion, `MotionConfig reducedMotion="user"` on the page turns
 * every transform here into an instant jump to its end state.
 */
export const easeOut = [0.22, 1, 0.36, 1] as const;

/** The pose an element arrives from. Any transform, never opacity. */
export type RevealFrom = Pick<
    TargetAndTransition,
    'x' | 'y' | 'scale' | 'rotate' | 'rotateX' | 'rotateY' | 'scaleX' | 'scaleY'
>;

const restingPose = {
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
    rotateX: 0,
    rotateY: 0,
    scaleX: 1,
    scaleY: 1,
} as const;

/**
 * Props to spread onto a `motion` element so it arrives from `from` the first
 * time it scrolls into view, `delay` seconds after the others in its group.
 * Only the keys named in `from` are animated back to rest.
 */
export function revealFrom(
    from: RevealFrom,
    delay = 0,
    duration = 0.8,
): {
    initial: RevealFrom;
    whileInView: RevealFrom;
    viewport: { once: true; amount: number };
    transition: { duration: number; ease: typeof easeOut; delay: number };
} {
    const rest = Object.fromEntries(
        Object.keys(from).map((key) => [
            key,
            restingPose[key as keyof typeof restingPose],
        ]),
    ) as RevealFrom;

    return {
        initial: from,
        whileInView: rest,
        viewport: { once: true, amount: 0.2 },
        transition: { duration, ease: easeOut, delay },
    };
}

type RevealHeadingProps = {
    as?: 'h2' | 'h3';
    id?: string;
    className?: string;
    children: string;
};

/**
 * A heading whose words rise one by one out of a mask.
 *
 * The heading watches the viewport, not the words. A word starts below its own
 * `overflow-hidden` box, and an IntersectionObserver counts that clipping —
 * each word would read as zero percent visible and never start.
 *
 * The spaces stay as real text between the words, so the heading reads and
 * copies as one sentence and still wraps at word boundaries.
 */
export function RevealHeading({
    as = 'h2',
    id,
    className,
    children,
}: RevealHeadingProps) {
    const ref = useRef<HTMLHeadingElement>(null);
    const isInView = useInView(ref, { once: true, amount: 0.5 });
    const Tag = as;
    const words = children.split(' ');

    return (
        <Tag ref={ref} id={id} className={className}>
            {words.map((word, index) => (
                <Fragment key={`${word}-${index}`}>
                    {index > 0 && ' '}
                    <span className="inline-block overflow-hidden pb-[0.12em] align-bottom">
                        <motion.span
                            className="inline-block"
                            initial={{ y: '110%' }}
                            animate={{ y: isInView ? '0%' : '110%' }}
                            transition={{
                                duration: 0.7,
                                ease: easeOut,
                                delay: index * 0.045,
                            }}
                        >
                            {word}
                        </motion.span>
                    </span>
                </Fragment>
            ))}
        </Tag>
    );
}

type CountUpProps = {
    value: number;
    format: (value: number) => string;
    duration?: number;
    delay?: number;
};

/**
 * A figure that counts up from zero the first time it is seen.
 *
 * It renders the final value until then, so anything that reads the page
 * without scrolling to it — a search engine, a test, a screen reader jumping
 * by heading — gets the real figure, never a zero. The figure is a motion value
 * rendered as the span's child, so motion rewrites the text on each frame
 * without re-rendering the page sixty times a second.
 */
export function CountUp({
    value,
    format,
    duration = 1.4,
    delay = 0,
}: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, amount: 0.8 });
    const isStill = useReducedMotion();
    const count = useMotionValue(value);
    const display = useTransform(count, format);

    useEffect(() => {
        if (!isInView || isStill) {
            return;
        }

        count.jump(0);

        const controls = animate(count, value, {
            duration,
            delay,
            ease: easeOut,
        });

        return () => controls.stop();
    }, [isInView, isStill, count, value, duration, delay]);

    return (
        <motion.span ref={ref} className="tabular-nums">
            {display}
        </motion.span>
    );
}
