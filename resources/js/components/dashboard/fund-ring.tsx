type FundRingProps = {
    /** 0–100. */
    percent: number;
    label: string;
};

const radius = 30;
const circumference = 2 * Math.PI * radius;

/**
 * How full the emergency fund is, as a ring with the percentage inside.
 *
 * A ring rather than another bar because the dashboard already has one bar it
 * wants you to read first; a different shape keeps the two from competing. The
 * arc starts at twelve o'clock and runs clockwise, the way a gauge is read.
 */
export function FundRing({ percent, label }: FundRingProps) {
    const clamped = Math.min(Math.max(percent, 0), 100);

    return (
        <div
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
            className="relative size-20 shrink-0"
        >
            <svg viewBox="0 0 72 72" className="size-full -rotate-90">
                <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    fill="none"
                    strokeWidth="7"
                    className="stroke-muted"
                />
                <circle
                    cx="36"
                    cy="36"
                    r={radius}
                    fill="none"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - clamped / 100)}
                    className="stroke-jade transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
                {clamped}%
            </span>
        </div>
    );
}
