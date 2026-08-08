---
paths:
  - 'tests/Browser/**'
---

# Browser

## refresh() reloads the visited url, not the current one
`$page->refresh()` reloads the url the page was opened at with `visit()`, not wherever you have since navigated. Walk from /finance to /payouts through the sidebar, refresh, and you are back on /finance.

This does not fail, it hangs. A locator for an element that will never appear waits without a deadline of its own — `inputValue()` in particular sat for 29 minutes. `assertPathIs()` right after a refresh can also pass spuriously, because it reads the url before the reload lands.

To test persistence across a real page load on a page you navigated to: refresh, assert you are back on the original path, then click through again.

## A running Vite dev server hangs the suite — check `public/hot` first
`npm run dev` writes `public/hot`, and while that file exists Laravel points every asset at the dev server instead of the manifest. Browser tests run against it then hang: whole files that pass in 18 seconds sit past 240 without finishing, and which test stalls moves between runs.

Symptoms read like an application bug, and that is the trap. A reloaded page served this way came back with pre-save values while the database and the controller both held the correction — an hour was spent hunting a persistence bug that did not exist.

Before diagnosing anything a browser test tells you, check for `public/hot`. To run against the build without disturbing a dev server somebody else started:

    Move-Item public/hot public/hot.bak -Force
    php artisan test --compact tests/Browser
    Move-Item public/hot.bak public/hot -Force

## Clicking a disabled button hangs the run
`@save-plan` is disabled while the plan is not dirty. Clicking it right after a `refresh()` does not fail — Playwright waits for it to become enabled, with no deadline of its own, and the run sits there until the suite timeout.

Make an actual edit before clicking save. The same trap applies to any control the page disables.
