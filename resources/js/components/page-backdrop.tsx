import { cn } from '@/lib/utils';

/**
 * The lit background, shared by every page.
 *
 * Three strengths, because the pages carry very different amounts of content.
 * The landing page is mostly air and can take the full treatment; auth pages
 * are a single card on an empty screen; the app itself is dense tables and
 * figures, where anything busy behind them costs legibility. So `app` gets the
 * glow at a fraction of its strength and no ruling at all.
 *
 * `z-0`, never a negative z-index: negative-index descendants of the root paint
 * *before* in-flow block backgrounds, and `body` carries an opaque
 * `bg-background`, so at `-z-*` these are drawn and then covered. Whatever
 * mounts this has to sit above it — `relative z-10` on the content, and no
 * opaque background on anything in between.
 */
type PageBackdropProps = {
    variant?: 'landing' | 'auth' | 'app';
};

const glowStrength = {
    landing: 'opacity-100',
    auth: 'opacity-75',
    /*
     * 55, not the 30 this started at. While the sidebar was `variant="inset"`
     * the whole wrapper carried an opaque `bg-sidebar` and no value here made
     * any difference — the glow was being painted and then covered. Once the
     * sidebar went `floating` that sheet lifted, and 30 turned out to be barely
     * there rather than tastefully subtle.
     */
    app: 'opacity-55',
} as const;

const gridStrength = {
    landing: 'opacity-35',
    auth: 'opacity-20',
    /** No ruling behind real data — it reads as part of the tables. */
    app: null,
} as const;

export function PageBackdrop({ variant = 'landing' }: PageBackdropProps) {
    const grid = gridStrength[variant];

    return (
        <>
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none fixed inset-0 z-0 page-glow',
                    glowStrength[variant],
                )}
            />
            {grid && (
                <div
                    aria-hidden
                    className={cn(
                        'pointer-events-none fixed inset-0 z-0 page-grid',
                        grid,
                    )}
                />
            )}
        </>
    );
}
