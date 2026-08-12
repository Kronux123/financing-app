---
paths:
  - 'app/Actions/Payouts/ActivityLog.php, app/Http/Controllers/ActivityController.php, resources/js/pages/activities/**, resources/js/lib/activities.ts'
---

# Lib

## There is no activities table — the log is the ledger read end to end
An activity is a payout_incomes row or a payout_lines row seen from the outside. Nothing is derived beyond the sign (money in positive, money out negative) and the category, which is the group label copied onto the line, or `Income`.

Because the order runs across two tables, neither can be limited on its own. ActivityLog therefore unions the pair down to ids, orders and paginates that in SQL, then hydrates only the page's rows and reads them through the model methods — `isUnplanned()`, `group->label()`. Do not reach for the shortcut of computing the sign, the category or the unplanned flag in the union: that puts a second copy of each somewhere the tests covering the first cannot see it.

Do not add an activities/transactions table. Unplanned spending is already a line with no expense_item_id and planned at zero, and 13th month pay is already an income row — that was the point of the two-table split.

Pending paydays are included here, unlike MonthlySavings which drops them. The difference is that a row carrying its own `pending` status is not presenting a forecast as a total.
