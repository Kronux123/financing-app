import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatusMeterProps = {
    /** The state in words, e.g. "Comfortable". */
    status: string;
    /** Solid fill for the dot and the bar — one of the `bg-goal-*` tokens. */
    tone: string;
    /** Shown opposite the status, e.g. "82% allocated". */
    aside?: ReactNode;
    figure: ReactNode;
    note: ReactNode;
    /** 0–100. */
    percent: number;
    /** Read aloud in place of the bar. */
    label: string;
    'data-test'?: string;
};

/**
 * One figure, the state it puts you in, and how far along the bar you are.
 *
 * The colour sits on the dot and the bar only. The words stay in the text
 * colour: the goal hues are tuned to be told apart, not to be read at 14px,
 * and the dot already says which tier this is before the label is read.
 */
export function StatusMeter({
    status,
    tone,
    aside,
    figure,
    note,
    percent,
    label,
    'data-test': dataTest,
}: StatusMeterProps) {
    return (
        <div data-test={dataTest} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
                <p className="flex items-center gap-2 font-medium">
                    <span
                        aria-hidden
                        className={cn('size-2 shrink-0 rounded-full', tone)}
                    />
                    {status}
                </p>
                {aside && (
                    <p className="text-muted-foreground tabular-nums">
                        {aside}
                    </p>
                )}
            </div>

            <div>
                {figure}
                <div className="text-sm text-muted-foreground tabular-nums">
                    {note}
                </div>
            </div>

            <div
                role="progressbar"
                aria-valuenow={Math.min(Math.round(percent), 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
                <div
                    className={cn(
                        'h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none',
                        tone,
                    )}
                    style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
                />
            </div>
        </div>
    );
}
