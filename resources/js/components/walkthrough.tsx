import { Map as MapIcon } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type { KeyboardEvent } from 'react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PixelArt } from '@/components/pixel-art';
import { Button } from '@/components/ui/button';
import type { WalkthroughOutcome } from '@/hooks/use-walkthrough';
import { cn } from '@/lib/utils';
import type { WalkthroughStep } from '@/lib/walkthroughs';
import { walkthroughTarget } from '@/lib/walkthroughs';

/** Breathing room between the spotlight and the element it frames. */
const spotlightPadding = 8;

/** Between the spotlight and the card, and the card and the viewport edge. */
const gap = 16;

type Box = { top: number; left: number; width: number; height: number };

const findTarget = (step: WalkthroughStep): HTMLElement | null => {
    return step.target === undefined
        ? null
        : document.querySelector<HTMLElement>(
              `[data-walkthrough="${step.target}"]`,
          );
};

const spotlightFor = (element: HTMLElement): Box => {
    const rect = element.getBoundingClientRect();

    return {
        top: rect.top - spotlightPadding,
        left: rect.left - spotlightPadding,
        width: rect.width + spotlightPadding * 2,
        height: rect.height + spotlightPadding * 2,
    };
};

/**
 * Below the spotlight if the card fits there, above if not, and pinned to the
 * bottom of the screen when the element is taller than the room either side —
 * the pay flow on a phone. Always inside the viewport.
 */
const cardPositionFor = (
    spotlight: Box | null,
    card: { width: number; height: number },
): { top: number; left: number } => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const clampLeft = (left: number): number =>
        Math.min(Math.max(left, gap), viewportWidth - card.width - gap);

    if (spotlight === null) {
        return {
            top: (viewportHeight - card.height) / 2,
            left: clampLeft((viewportWidth - card.width) / 2),
        };
    }

    const below = spotlight.top + spotlight.height + gap;
    const above = spotlight.top - gap - card.height;
    const left = clampLeft(spotlight.left);

    if (below + card.height <= viewportHeight - gap) {
        return { top: below, left };
    }

    if (above >= gap) {
        return { top: above, left };
    }

    return { top: viewportHeight - card.height - gap, left };
};

const sameBox = (a: Box | null, b: Box | null): boolean => {
    return (
        a === b ||
        (a !== null &&
            b !== null &&
            a.top === b.top &&
            a.left === b.left &&
            a.width === b.width &&
            a.height === b.height)
    );
};

/**
 * A guided tour of a page: everything but one element is dimmed, and a card
 * beside it says what it is for. Mounted only while open, so the steps whose
 * element is missing are dropped once, when it opens.
 */
export function Walkthrough({
    steps,
    isSample = false,
    onFinish,
}: {
    steps: WalkthroughStep[];
    /** Marks every step, so the sample account is never read as the user's. */
    isSample?: boolean;
    onFinish: (outcome: WalkthroughOutcome) => void;
}) {
    const [shownSteps, setShownSteps] = useState<WalkthroughStep[] | null>(
        null,
    );

    /*
     * After mounting, not while rendering: on a first visit the tour renders
     * in the same pass as the page, so none of its elements exist yet.
     */
    useEffect(() => {
        const frame = window.requestAnimationFrame(() =>
            setShownSteps(
                steps.filter(
                    (step) =>
                        step.target === undefined || findTarget(step) !== null,
                ),
            ),
        );

        return () => window.cancelAnimationFrame(frame);
    }, [steps]);

    if (shownSteps === null || shownSteps.length === 0) {
        return null;
    }

    return (
        <Tour shownSteps={shownSteps} isSample={isSample} onFinish={onFinish} />
    );
}

/**
 * Takes the page's walkthrough again. The last step of every walkthrough
 * points here, so it has to be on the page wherever the tour can run.
 */
export function WalkthroughButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            variant="outline"
            size="sm"
            data-test="walkthrough-replay"
            {...walkthroughTarget('walkthrough-replay')}
            onClick={onClick}
        >
            <MapIcon aria-hidden />
            Take the tour
        </Button>
    );
}

function Tour({
    shownSteps,
    isSample,
    onFinish,
}: {
    shownSteps: WalkthroughStep[];
    isSample: boolean;
    onFinish: (outcome: WalkthroughOutcome) => void;
}) {
    const [index, setIndex] = useState(0);
    const [spotlight, setSpotlight] = useState<Box | null>(null);
    const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
    const cardRef = useRef<HTMLDivElement>(null);
    const primaryRef = useRef<HTMLButtonElement>(null);
    const isStill = useReducedMotion() ?? false;
    const titleId = useId();
    const bodyId = useId();

    const step = shownSteps[index];
    const isLast = index === shownSteps.length - 1;

    /*
     * Bring the element into view, then follow it: smooth scrolling, a resize
     * or the sidebar folding all move it after the step has started.
     */
    useEffect(() => {
        const target = findTarget(step);

        target?.scrollIntoView({
            block: 'center',
            behavior: isStill ? 'auto' : 'smooth',
        });

        let frame = 0;

        const follow = (): void => {
            const next = target === null ? null : spotlightFor(target);

            setSpotlight((current) =>
                sameBox(current, next) ? current : next,
            );
            frame = window.requestAnimationFrame(follow);
        };

        follow();

        return () => window.cancelAnimationFrame(frame);
    }, [step, isStill]);

    useLayoutEffect(() => {
        const card = cardRef.current;

        if (card === null) {
            return;
        }

        const observer = new ResizeObserver(() =>
            setCardSize({ width: card.offsetWidth, height: card.offsetHeight }),
        );

        observer.observe(card);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        primaryRef.current?.focus({ preventScroll: true });
    }, [index]);

    /** Escape skips, and Tab goes round the card's own buttons. */
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onFinish('dismissed');

            return;
        }

        if (event.key !== 'Tab' || cardRef.current === null) {
            return;
        }

        const buttons = [
            ...cardRef.current.querySelectorAll<HTMLButtonElement>('button'),
        ];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    if (step === undefined) {
        return null;
    }

    const cardPosition = cardPositionFor(spotlight, cardSize);
    const isMeasured = cardSize.height > 0;

    return createPortal(
        <div
            data-test="walkthrough"
            className="fixed inset-0 z-50"
            onKeyDown={onKeyDown}
        >
            {/*
             * The dimming is the spotlight's own shadow, spread to cover the
             * screen, so the hole in it is always exactly the spotlight.
             */}
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none fixed rounded-xl outline-2 outline-jade',
                    !isStill && 'transition-all duration-300 ease-out',
                )}
                style={{
                    ...(spotlight ?? {
                        top: '50%',
                        left: '50%',
                        width: 0,
                        height: 0,
                    }),
                    boxShadow: '0 0 0 9999px rgb(15 23 42 / 0.6)',
                }}
            />

            <div
                ref={cardRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={bodyId}
                data-test="walkthrough-card"
                className={cn(
                    'fixed w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xl',
                    !isStill &&
                        isMeasured &&
                        'transition-[top,left] duration-300 ease-out',
                    !isMeasured && 'invisible',
                )}
                style={cardPosition}
            >
                <div className="flex items-start gap-4">
                    <PixelArt
                        sprite={step.art}
                        size={48}
                        className="shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground tabular-nums">
                            {index + 1} of {shownSteps.length}
                            {isSample && (
                                <span
                                    data-test="walkthrough-sample"
                                    className="rounded-full bg-amber/10 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber"
                                >
                                    Sample data
                                </span>
                            )}
                        </p>
                        <h2 id={titleId} className="font-semibold">
                            {step.title}
                        </h2>
                    </div>
                </div>

                <p id={bodyId} className="mt-3 text-sm text-muted-foreground">
                    {step.body}
                </p>

                <div className="mt-5 flex items-center justify-between gap-2">
                    {isLast ? (
                        <span />
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            data-test="walkthrough-skip"
                            onClick={() => onFinish('dismissed')}
                        >
                            Skip tour
                        </Button>
                    )}
                    <div className="flex items-center gap-2">
                        {index > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                data-test="walkthrough-back"
                                onClick={() => setIndex(index - 1)}
                            >
                                Back
                            </Button>
                        )}
                        <Button
                            ref={primaryRef}
                            size="sm"
                            data-test="walkthrough-next"
                            onClick={() =>
                                isLast
                                    ? onFinish('completed')
                                    : setIndex(index + 1)
                            }
                        >
                            {isLast ? 'Done' : 'Next'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
