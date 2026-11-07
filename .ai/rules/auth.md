---
paths:
  - 'resources/js/pages/auth/**'
---

# Auth

## Signing in replaces the page, and the history is cleared when the user changes
Back after signing out must not redraw the app. Three parts make that hold, and dropping any one brings the bug back (tests/Browser/SessionHistoryTest.php fails):
1. History is encrypted (HandleInertiaRequests::handle), and lib/session-history.ts calls `router.clearHistory()` whenever `auth.user` changes. It listens to both `navigate` and `success`, because Inertia leaves `navigate` out of `replace` visits.
2. Any visit that signs someone in uses `replace: true` (the login, register and two-factor forms, and passkey-verify). A new sign-in path must do the same.
3. The web group sends `Cache-Control: no-store`, so going back to a page that was a full load is not served from the browser cache.

## Never turn history encryption on in config
Encryption is decided per request in HandleInertiaRequests: on for https and for localhost/127.0.0.1, off otherwise. Do not set `inertia.history.encrypt` to true instead. Outside a secure context the browser has no Web Crypto, and Inertia's "SSL is required" fallback never runs. It throws "Unable to encrypt history" partway through every visit, and every link on a plain http site hangs. That happened on http://financing-app.test (tests/Feature/HistoryEncryptionTest.php covers it).

The cost is that plain http gets no back-button protection. Check that behavior over `herd secure`. On AWS, isSecure() is only true once TrustProxies trusts the load balancer. Without that, history quietly goes unencrypted.
