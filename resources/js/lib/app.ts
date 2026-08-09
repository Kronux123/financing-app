/**
 * The application name, shared by the document title and the sidebar brand so
 * the two cannot drift. `APP_NAME` in `.env` is the source; the fallback only
 * applies when Vite builds without one.
 */
export const appName = import.meta.env.VITE_APP_NAME || 'Kept';

/**
 * Everything on the JS side imports `appName` — the document title, the sidebar
 * brand, the landing page. Nothing hardcodes the name, so renaming the app is
 * one edit to `APP_NAME` in `.env`.
 *
 * Two places cannot import this and have to be changed by hand:
 *
 * - `public/favicon.svg`, in its `<title>` and `aria-label`. It is a static file
 *   served straight from disk with no build step, so there is nothing for it to
 *   import from.
 * - `.env.example`, which is the template new installs copy.
 *
 * PHP does not need a constant either: `config('app.name')` reads the same
 * `APP_NAME`, and `app.blade.php` already uses it.
 */
