---
paths:
  - 'app/Actions/Payouts/**'
  - 'resources/js/lib/savings.ts'
  - 'resources/js/pages/months/**'
---

# Savings history

## Saved is income less living costs, not the savings lines
A month's saving is `actual income − actual payables − actual allowance`, worked out in `MonthlySavings`. Do not sum the savings-group lines instead.

The swept "remaining balance" is derived rather than stored, so it never becomes a payout line — see the note on it in js.md. A paycheck set to save its remainder would therefore report only what was explicitly earmarked, which for most plans is far less than what was really put by. Measuring from income downwards catches both the earmarked savings and the sweep, and `ExpenseGroup::essentials()` already names the two groups that count as living costs.

## Only finalized paydays are history
A pending payout still carries the figures the plan gave it when it opened, so including one presents a forecast as fact. `MonthlySavings` filters on the `finalized` scope, and the charts show an empty state until a payday has been settled — that empty state is the honest answer, not a loading state.

## The relation is newest-first, so reorder() rather than orderBy()
`User::payouts()` is declared `->orderByDesc('paid_on')`. Adding `->orderBy('paid_on')` appends a second clause that only breaks ties in the first, so the list stays descending. Use `->reorder('paid_on')` when you need it the other way round.
