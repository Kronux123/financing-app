import { useSyncExternalStore } from 'react';
import type { RowsPerPage } from '@/lib/activities';
import { defaultRowsPerPage, rowsPerPageOptions } from '@/lib/activities';

export const rowsPerPageStorageKey = 'activitiesRowsPerPage';

const listeners = new Set<() => void>();

let currentRowsPerPage: RowsPerPage = defaultRowsPerPage;

const notify = (): void => listeners.forEach((listener) => listener());

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const isRowsPerPage = (value: number): value is RowsPerPage =>
    (rowsPerPageOptions as readonly number[]).includes(value);

const readStorage = (): RowsPerPage => {
    const stored = Number(window.localStorage.getItem(rowsPerPageStorageKey));

    if (!isRowsPerPage(stored)) {
        return defaultRowsPerPage;
    }

    return stored;
};

/**
 * Hydrated at module load rather than during render, so React reads a stable
 * snapshot. `useSyncExternalStore` bridges the server's default and the stored
 * choice without a hydration mismatch. Mirrors `use-budget-plan`.
 */
if (typeof window !== 'undefined') {
    currentRowsPerPage = readStorage();
}

/** Remembered across visits, so this is the default the log opens with. */
export const saveRowsPerPage = (rowsPerPage: RowsPerPage): void => {
    window.localStorage.setItem(rowsPerPageStorageKey, String(rowsPerPage));
    currentRowsPerPage = rowsPerPage;
    notify();
};

export function useRowsPerPage(): RowsPerPage {
    return useSyncExternalStore(
        subscribe,
        () => currentRowsPerPage,
        () => defaultRowsPerPage,
    );
}
