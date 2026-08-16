---
paths:
  - 'resources/js/pages/payouts/**'
---

# Payouts

## Day-to-day spending is the allowance figure, not itemised lines
The "Add a line" control on a payday is for the one-off the plan never forecast — a monitor, a hospital visit — and not for tracking coffee and groceries.

Allowance is deliberately one figure per paycheck (ExpenseGroup::isSingleAmount), and MonthlySavings reads a month's saving as income − payables − allowance. Itemising daily spending as extra lines counts the same money twice and pulls the reported saving down with it; folding it into the allowance instead just rebuilds envelope accounting. Either way the one number the app is built around stops meaning what it says.

If per-transaction spending is ever wanted, it belongs beside the app reporting one monthly total into allowance — not threaded through payout_lines. Same reasoning as the note against an activities table in lib.md.
