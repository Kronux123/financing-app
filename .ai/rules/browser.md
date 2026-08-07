---
paths:
  - 'tests/Browser/**'
---

# Browser

## refresh() reloads the visited url, not the current one
`$page->refresh()` reloads the url the page was opened at with `visit()`, not wherever you have since navigated. Walk from /finance to /payouts through the sidebar, refresh, and you are back on /finance.

This does not fail, it hangs. A locator for an element that will never appear waits without a deadline of its own — `inputValue()` in particular sat for 29 minutes. `assertPathIs()` right after a refresh can also pass spuriously, because it reads the url before the reload lands.

To test persistence across a real page load on a page you navigated to: refresh, assert you are back on the original path, then click through again.
