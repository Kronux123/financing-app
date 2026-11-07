# Kept

[![tests](https://github.com/Kronux123/financing-app/actions/workflows/tests.yml/badge.svg)](https://github.com/Kronux123/financing-app/actions/workflows/tests.yml)
[![linter](https://github.com/Kronux123/financing-app/actions/workflows/lint.yml/badge.svg)](https://github.com/Kronux123/financing-app/actions/workflows/lint.yml)

**Plan what comes in. Record what goes out.**

Kept is a personal finance planner for people paid once or twice a month. You
give every peso of each paycheck a job before it arrives, then check each payday
against the plan when it comes. Over time that builds an honest record of what
you actually saved, month by month.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/dashboard-dark.png">
  <img alt="The Kept dashboard: where this month's pay goes, total saved, the emergency fund, outstanding debt and recent activity" src=".github/readme/dashboard-light.png">
</picture>

## What it does

### Give every peso a job

Tell Kept how you are paid, once a month or on the 15th and the last day, then
split each paycheck into payables, allowance and savings. Enter your gross pay
and SSS, PhilHealth, Pag-IBIG and withholding tax are worked out for you. A
paycheck can sweep whatever is left into savings, and a plan that spends more
than a paycheck holds says so.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/plan-dark.png">
  <img alt="The budget plan, with a paycheck on the 15th and one at the end of the month, each split into payables, allowance and savings" src=".github/readme/plan-light.png">
</picture>

### Check each payday

When a payday comes, it opens by itself, filled in from your plan. Correct
whatever came out differently, add the one-off nobody planned for, like a repair
or a hospital visit, and finalize it. A payday you have not reviewed shows up on
the dashboard, and Kept can remind you by email.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/payouts-dark.png">
  <img alt="A payday being reviewed: each planned line with what actually went out, and what is left" src=".github/readme/payouts-light.png">
</picture>

### See how every month went

The savings calendar lays out the year and shades each month by how close it
came to your goal. Any settled month downloads as a spreadsheet or a PDF
statement, and a whole year as one workbook.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/calendar-dark.png">
  <img alt="The savings calendar: the year's total against its goal, the best and lowest months, and each month graded against the monthly goal" src=".github/readme/calendar-light.png">
</picture>

### Watch your debt go down

Mark a payable as debt and Kept shows what is left on it, how far through you
are, and when you will be debt-free at the payments you make now.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/debt-dark.png">
  <img alt="The debt page: the total owed, when it will be paid off, and the balance left on each debt" src=".github/readme/debt-light.png">
</picture>

### Every peso in and out

The activity log lists every payday's money, newest first. Spending nobody
planned is tagged, and a payday you have not finalized yet is marked as pending.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/activities-dark.png">
  <img alt="The activity log: each payday's income and spending, with its category and status" src=".github/readme/activities-light.png">
</picture>

### A tour of every page

The first time you open a page, a short walkthrough explains it. On a page you
have no data on yet, the tour runs over a clearly labeled sample account, so you
can see what it will look like before you have entered anything.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/readme/walkthrough-dark.png">
  <img alt="The dashboard walkthrough spotlighting where this month's pay goes" src=".github/readme/walkthrough-light.png">
</picture>

Also: two-factor authentication and passkeys, required email verification,
light and dark themes, and a layout that works on a phone.

## How it works

1. **Plan.** Your budget plan says what each paycheck is for.
2. **Review.** Each payday opens as a copy of the plan. You correct what was
   different and finalize it.
3. **Look back.** Finalized paydays become your history: the savings calendar,
   the charts, the activity log and the exports all read from them.

The copy in step 2 is the important part. A payday never points back at the
plan, so raising your rent in March cannot change what February cost.

## Under the hood

Laravel 13, React 19 with Inertia 3 and TypeScript, Tailwind CSS 4, and
PostgreSQL 17. Authentication is Laravel Fortify with passkeys, PDFs are
rendered through headless Chromium, and spreadsheets are real `.xlsx` files
written with PhpSpreadsheet.

Every change runs through CI: about 470 tests, including real-browser tests that
check every page for JavaScript errors and accessibility violations in both
light and dark mode, plus PHPStan, Pint, ESLint, Prettier and TypeScript checks.
The suite runs on PostgreSQL, as production does.

A few decisions worth knowing about:

- **Money is stored in centavos and sent in pesos.** The conversion happens in
  exactly two places, on the way out and on the way in, so a figure can never be
  off by a factor of a hundred somewhere in between.
- **Saving is measured, not summed.** A month's saving is income minus what went
  to living costs, rather than the savings lines added up. That way a paycheck
  that sweeps its leftover into savings is counted in full.
- **Reminders are counted, not stored.** The badge, the banner and the email all
  count pending paydays straight from the ledger, so they can never say "2
  waiting" after both were finalized.
- **Color never carries meaning alone.** Goal progress uses orange, blue and
  green, chosen to stay distinct for color-blind readers, and the exact
  percentage is always printed next to it.

## Status

Kept is a personal project, built to be used. What comes next is tracked in
[`FEATURES-TODO.md`](FEATURES-TODO.md).

## License

MIT.
