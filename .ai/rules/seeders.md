---
paths:
  - 'database/seeders/**'
---

# Seeders

## The demo account's history is opened by the app, not written by the seeder
`DemoUserSeeder` builds a plan and then calls `OpenPayoutsForPlan`. It does not insert payouts. That action is what copies the plan onto a record and stops looking at it, so demo data comes out with the same snapshot semantics as production data — weekend rule included, where a payday on a Sunday is pulled back to the Friday before.

Two consequences to keep in mind when editing it:

The plan's `created_at` must be backdated **before** the paydays are opened. The action skips any payday older than the plan on purpose, so a plan created today opens no history at all.

Only `actual` is moved afterwards. `planned` is the figure copied when the payday opened and is what every variance is measured against; correcting it would erase the thing the record exists to show.

## It is idempotent through the user row
Every table hangs off `users` with a cascading foreign key, so deleting the demo user takes the plan, the paydays and their rows with it. It is a `forceDelete()`, because payouts are soft-deletable and a trashed payday still holds the unique `(user, date, paycheck)` key that would refuse the next run.

## The month-by-month variations are fixed, not faked
`DemoUserSeeder::MONTHS` is a literal table so the demo tells the same story on every reseed and the figures in `tests/Feature/DemoUserSeederTest.php` stay true. The plan is ₱50,000 a month in against ₱41,000 of planned living costs, so a month that goes to plan saves ₱9,000 — that is the arithmetic every asserted figure is derived from. Change a row there and the test moves with it.
