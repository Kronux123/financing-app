import { router } from '@inertiajs/react';

/**
 * Makes the back button forget pages from before a sign-in or sign-out.
 *
 * Inertia keeps every page's props in the browser history, so after signing
 * out, back would redraw the dashboard straight from history without asking
 * the server. With history encryption on (config/inertia.php), clearing
 * rotates the key: older entries can no longer be read, Inertia fetches them
 * again instead, and the server's `auth` and `guest` middleware decide where
 * that lands. Signed out, back goes to the login page; signed in, a page seen
 * as a guest is redrawn as the signed-in user sees it.
 *
 * The login page itself is not left behind to go back to: signing in replaces
 * it in the history (`replace` on the login, register and two-factor forms and
 * the passkey visit). That is not only tidier. Fetched again while signed in,
 * /login redirects to the dashboard already on screen, and Inertia skips
 * writing a page identical to the current one — so the address bar would be
 * left reading /login over the dashboard.
 *
 * Done here rather than with `Inertia::clearHistory()` on the server, because
 * that flag rides in the session and signing out throws the session away
 * before the next page renders. Watching the signed-in user also covers every
 * way it changes: logging in or out, registering, deleting the account, and a
 * session that expired.
 */
export function clearHistoryWhenUserChanges(): void {
    /** Undefined until the first page, which has nothing before it to forget. */
    let signedInUserId: number | null | undefined;

    const notice = (userId: number | null): void => {
        if (signedInUserId !== undefined && userId !== signedInUserId) {
            router.clearHistory();
        }

        signedInUserId = userId;
    };

    /*
     * Both, because neither sees every page. `navigate` is the only one fired
     * for the first page, but Inertia leaves it out of `replace` visits — which
     * is how signing in arrives. `success` is fired for every visit that
     * completes, replaced or not.
     */
    router.on('navigate', (event) =>
        notice(event.detail.page.props.auth?.user?.id ?? null),
    );
    router.on('success', (event) =>
        notice(event.detail.page.props.auth?.user?.id ?? null),
    );
}
