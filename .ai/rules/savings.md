---
paths:
  - 'app/Actions/Payouts/**'
  - resources/js/lib/savings.ts
  - 'resources/js/pages/months/**'
  - resources/js/lib/walkthroughs.ts
  - resources/js/lib/sample-account.ts
---

# Savings history

## Saved is income less living costs, not the savings lines
A month's saving is `actual income − actual payables − actual allowance`, worked out in `MonthlySavings`. Do not sum the savings-group lines instead.

The swept "remaining balance" is derived rather than stored, so it never becomes a payout line — see the note on it in js.md. A paycheck set to save its remainder would therefore report only what was explicitly earmarked, which for most plans is far less than what was really put by. Measuring from income downwards catches both the earmarked savings and the sweep, and `ExpenseGroup::essentials()` already names the two groups that count as living costs.

## Only finalized paydays are history
A pending payout still carries the figures the plan gave it when it opened, so including one presents a forecast as fact. `MonthlySavings` filters on the `finalized` scope, and the charts show an empty state until a payday has been settled — that empty state is the honest answer, not a loading state.

## The relation is newest-first, so reorder() rather than orderBy()
`User::payouts()` is declared `->orderByDesc('paid_on')`. Adding `->orderBy('paid_on')` appends a second clause that only breaks ties in the first, so the list stays descending. Use `->reorder('paid_on')` when you need it the other way round.

## Walkthrough steps target data-walkthrough, and a rework bumps the version
A step points at its element through `{...walkthroughTarget('name')}` (a `data-walkthrough` attribute), never through `data-test`, so renaming a test id cannot quietly break a tour. A step whose element is not on the page is dropped when the tour opens.

Adding a page means adding a case to App\Enums\WalkthroughPage and to the `WalkthroughPage` type here. When a tour changes enough that people should see it again, raise that page's `version()` in the enum; older rows stop counting.

## Sample data reaches a page only through the data hooks
While a walkthrough runs on a page with none of the user's data, `useStoredBudgetPlan`, `useSavingsHistory` and `useStoredPayouts` return the sample account (lib/sample-account.ts), switched by lib/sample-preview.ts. Pages that read a page prop directly (dashboard recentActivity, the activities page) swap it themselves on `walkthrough.isSample`. A new page that wants a sample tour reads its data through a hook the same way. It must never fetch sample data from the server.

`sampleAccount()` must keep returning the same object: the plan and payday drafts notice a new plan by identity, so a fresh copy each render loops. Every function that writes to the server (`saveBudgetPlan`, `savePayout`, `setPayoutStatus`) returns early under `isSamplePreviewActive()`. Add the same guard to any new writer.
