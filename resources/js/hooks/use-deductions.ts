import { useHttp } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { PayCadence } from '@/lib/budget';
import type { Deductions } from '@/lib/deductions';
import { deductions as deductionsRoute } from '@/routes/finance';

/** Long enough to wait out a burst of typing, short enough to feel live. */
const previewDelayMs = 300;

export type DeductionsPreview = {
    /** The latest breakdown, which may be for a gross since edited. */
    deductions: Deductions | null;
    /** Whether `deductions` answers the gross and cadence asked about now. */
    isCurrent: boolean;
};

/**
 * Asks the server what a gross comes to, once typing pauses.
 *
 * The server holds the only copy of the rates, so the page asks rather than
 * working it out — see StatutoryDeductions. The last answer is kept while a new
 * one is on its way, so the breakdown never blanks out between keystrokes.
 */
export function useDeductions(
    gross: number | null,
    cadence: PayCadence,
): DeductionsPreview {
    const { submit } = useHttp();
    /** Held in a ref so a fresh `submit` each render does not restart the wait. */
    const submitRef = useRef(submit);
    const [answer, setAnswer] = useState<{
        key: string;
        deductions: Deductions;
    } | null>(null);
    const key = `${gross}:${cadence}`;

    useEffect(() => {
        submitRef.current = submit;
    });

    useEffect(() => {
        if (gross === null) {
            return;
        }

        let isStale = false;
        const timer = setTimeout(async () => {
            try {
                const deductions = (await submitRef.current(
                    deductionsRoute({ query: { gross, cadence } }),
                )) as Deductions;

                if (!isStale) {
                    setAnswer({ key: `${gross}:${cadence}`, deductions });
                }
            } catch {
                // Keep the last breakdown; the next pause in typing asks again.
            }
        }, previewDelayMs);

        return () => {
            isStale = true;
            clearTimeout(timer);
        };
    }, [gross, cadence]);

    if (gross === null) {
        return { deductions: null, isCurrent: false };
    }

    return {
        deductions: answer?.deductions ?? null,
        isCurrent: answer?.key === key,
    };
}
