import { usePage } from '@inertiajs/react';
import { sampleAccount } from '@/lib/sample-account';
import { useIsSamplePreview } from '@/lib/sample-preview';
import type { SavedMonth } from '@/lib/savings';

/**
 * What each month actually put by, oldest first, as the server worked it out.
 *
 * Passed by `DashboardController` to the two pages that chart it rather than
 * shared, because nothing else reads it. Empty until a payday has been
 * finalized — which is the honest state, not a loading one. The sample
 * account's history stands in while a walkthrough previews one.
 */
export function useSavingsHistory(): SavedMonth[] {
    const ownHistory = usePage<{ savings: SavedMonth[] }>().props.savings;

    return useIsSamplePreview() ? sampleAccount().savings : ownHistory;
}
