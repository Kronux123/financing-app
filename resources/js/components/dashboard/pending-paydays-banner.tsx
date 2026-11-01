import { Link, usePage } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useState } from 'react';
import { PixelArt } from '@/components/pixel-art';
import { Button } from '@/components/ui/button';
import { index as payoutsRoute } from '@/routes/payouts';

/**
 * Where a dismissal is remembered. It holds the count that was dismissed, so
 * the banner stays away only until another payday opens and the count moves.
 */
const dismissedKey = 'kept.pending-paydays-dismissed';

function readDismissed(): number | null {
    try {
        const stored = window.localStorage.getItem(dismissedKey);

        return stored === null ? null : Number(stored);
    } catch {
        return null;
    }
}

function writeDismissed(count: number): void {
    try {
        window.localStorage.setItem(dismissedKey, String(count));
    } catch {
        // Storage can be off. The banner just comes back on the next visit.
    }
}

/**
 * The in-app half of payday reminders: a payday nobody finalizes never reaches
 * the history, so the dashboard says so while any are waiting. The count is
 * the same shared prop as the badge on Payouts, worked out from the payouts
 * themselves, so it clears the moment the last one is finalized.
 */
export function PendingPaydaysBanner() {
    const { pendingPaydays } = usePage().props;
    const [dismissed, setDismissed] = useState(readDismissed);

    if (pendingPaydays === 0 || dismissed === pendingPaydays) {
        return null;
    }

    const dismiss = () => {
        writeDismissed(pendingPaydays);
        setDismissed(pendingPaydays);
    };

    return (
        <section
            aria-label="Paydays awaiting review"
            data-test="pending-paydays-banner"
            className="flex flex-col gap-4 rounded-xl border border-jade/30 bg-jade/10 p-4 sm:flex-row sm:items-center"
        >
            <PixelArt sprite="moneybag" size={48} className="shrink-0" />

            <div className="min-w-0 flex-1">
                <p className="font-semibold">
                    {pendingPaydays === 1
                        ? '1 payday is waiting for you to review'
                        : `${pendingPaydays} paydays are waiting for you to review`}
                </p>
                <p className="mt-0.5 text-sm text-foreground/80">
                    Check what actually came in and went out, then finalize so
                    the month counts toward your savings.
                </p>
            </div>

            <div className="flex items-center gap-2">
                <Button asChild size="sm">
                    <Link
                        href={payoutsRoute()}
                        data-test="pending-paydays-review"
                    >
                        Review paydays
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Dismiss"
                    data-test="pending-paydays-dismiss"
                    onClick={dismiss}
                >
                    <X />
                </Button>
            </div>
        </section>
    );
}
