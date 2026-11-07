import { useSyncExternalStore } from 'react';

/**
 * Whether the page is showing the sample account instead of the user's own
 * data, which it does only while a walkthrough runs over a page that would
 * otherwise be empty.
 *
 * A module-level switch rather than context, because the hooks that read it —
 * `useStoredBudgetPlan` and the rest — are called by the page component itself,
 * above anything a page could wrap in a provider. Lives in the browser only:
 * nothing about the sample is ever sent to the server.
 */
let isActive = false;
const listeners = new Set<() => void>();

const notify = (): void => {
    listeners.forEach((listener) => listener());
};

export const startSamplePreview = (): void => {
    if (!isActive) {
        isActive = true;
        notify();
    }
};

export const stopSamplePreview = (): void => {
    if (isActive) {
        isActive = false;
        notify();
    }
};

/**
 * Read outside React by the functions that write to the server, so a sample
 * figure can never be saved however a click got through.
 */
export const isSamplePreviewActive = (): boolean => isActive;

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
};

export function useIsSamplePreview(): boolean {
    return useSyncExternalStore(subscribe, isSamplePreviewActive, () => false);
}
