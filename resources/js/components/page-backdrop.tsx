import { cn } from '@/lib/utils';

/**
 * The lit background, for the pages outside the app.
 *
 * Two strengths: the landing page is mostly air and can take the full
 * treatment, and auth pages are a single card on an empty screen. The app
 * itself has none — see AppSidebarLayout.
 *
 * `z-0`, never a negative z-index: negative-index descendants of the root paint
 * *before* in-flow block backgrounds, and `body` carries an opaque
 * `bg-background`, so at `-z-*` these are drawn and then covered. Whatever
 * mounts this has to sit above it — `relative z-10` on the content, and no
 * opaque background on anything in between.
 */
type PageBackdropProps = {
    variant?: 'landing' | 'auth';
};

const glowStrength = {
    landing: 'opacity-100',
    auth: 'opacity-75',
} as const;

const gridStrength = {
    landing: 'opacity-35',
    auth: 'opacity-20',
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
