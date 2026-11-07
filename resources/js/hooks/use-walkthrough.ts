import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    startSamplePreview,
    stopSamplePreview,
    useIsSamplePreview,
} from '@/lib/sample-preview';
import type { OwnProps, WalkthroughPage } from '@/lib/walkthroughs';
import { hasOwnData } from '@/lib/walkthroughs';
import { update as recordWalkthrough } from '@/routes/walkthroughs';

export type WalkthroughOutcome = 'completed' | 'dismissed';

type WalkthroughControls = {
    isOpen: boolean;
    /** The page is showing the sample account rather than the user's own. */
    isSample: boolean;
    /** Takes the walkthrough again, from the replay button. */
    start: () => void;
    finish: (outcome: WalkthroughOutcome) => void;
};

/**
 * Opens a page's walkthrough on arrival until it has been finished or skipped
 * once.
 *
 * A page with nothing of the user's on it yet is shown with the sample account
 * for as long as the walkthrough runs, so every step has something to point
 * at. The walkthrough waits for the sample to be on the page before opening.
 */
export function useWalkthrough(page: WalkthroughPage): WalkthroughControls {
    const props = usePage<OwnProps>().props;
    const hasSeen = props.seenWalkthroughs.includes(page);
    const needsSample = !hasOwnData[page](props);
    const isSample = useIsSamplePreview();

    /** Null until the user opens or closes it, then their choice wins. */
    const [isOpenByChoice, setIsOpenByChoice] = useState<boolean | null>(null);
    const isOpen = isOpenByChoice ?? !hasSeen;

    /*
     * Stopped when the walkthrough closes and when the page goes, so the
     * sample can never outlive the walkthrough it was shown for.
     */
    useEffect(() => {
        if (!isOpen || !needsSample) {
            return;
        }

        startSamplePreview();

        return () => stopSamplePreview();
    }, [isOpen, needsSample]);

    const finish = (outcome: WalkthroughOutcome): void => {
        setIsOpenByChoice(false);

        // A replay changes nothing worth keeping: the first outcome stands.
        if (hasSeen) {
            return;
        }

        router
            .optimistic<{ seenWalkthroughs: string[] }>((current) => ({
                seenWalkthroughs: [...current.seenWalkthroughs, page],
            }))
            .put(
                recordWalkthrough(page).url,
                { outcome },
                { preserveScroll: true },
            );
    };

    return {
        isOpen: isOpen && (!needsSample || isSample),
        isSample,
        start: () => setIsOpenByChoice(true),
        finish,
    };
}
