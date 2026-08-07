/**
 * The application name, shared by the document title and the sidebar brand so
 * the two cannot drift. `APP_NAME` in `.env` is the source; the fallback only
 * applies when Vite builds without one.
 */
export const appName = import.meta.env.VITE_APP_NAME || 'Financing App';
