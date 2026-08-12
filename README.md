# financing-app

[![tests](https://github.com/Kronux123/financing-app/actions/workflows/tests.yml/badge.svg)](https://github.com/Kronux123/financing-app/actions/workflows/tests.yml)
[![linter](https://github.com/Kronux123/financing-app/actions/workflows/lint.yml/badge.svg)](https://github.com/Kronux123/financing-app/actions/workflows/lint.yml)

A personal finance planner built on Laravel, Inertia and React. Plan a month
around the paychecks that actually fund it, then watch the dashboard follow.

---

## Contents

- [What it does](#what-it-does)
- [Project status](#project-status)
- [Tech stack](#tech-stack)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Commands](#commands)
- [Testing](#testing)
- [Routes](#routes)
- [Project structure](#project-structure)
- [Conventions](#conventions)
- [Design notes](#design-notes)
- [License](#license)

## What it does

**Budget plan** — Choose how you are paid. Monthly gives you one paycheck;
semi-monthly splits the page into the 15th and the last day of the month, each
column carrying its own take-home, its own expense groups, and its own leftover.
Expenses live under three groups — Payables, Allowance and Savings — can be moved
between paychecks, and roll up into a monthly summary. Allocating more than a
paycheck holds is called out rather than left for you to spot. A paycheck can be
set to sweep whatever is left into savings; that line is worked out on every edit
rather than stored, so it can never drift from the figures behind it.

**Payouts** — Every payday that has been, filled in from the plan as it stood
that morning. A scheduled command opens a record when the day comes round and
copies the plan into it rather than pointing at it, so editing the plan later
cannot rewrite what already happened. Correct what actually came out, then
finalize the record. A payday falling on a Saturday or Sunday is paid on the
Friday before it, and a day past the end of a short month is pulled back to the
last one.

**Activities** — The ledger read end to end, newest payday first: what each one
brought in, what it sent out, and which of them are still open to correction.
There is no activities table behind it — an activity is a payday's income or one
of its lines seen from the outside, so spending the plan never forecast is a line
with nothing planned against it, marked as such.

**Dashboard** — Savings progress, monthly metrics and a spending breakdown,
computed from your saved plan. The monthly savings chart is read from the payouts
ledger instead: a month appears once one of its paydays has been finalized, and
what counts as saved is income less what went out on living costs.

**Savings calendar** — A January-to-December grid with a year switcher, covering
the years your ledger actually reaches. Each cell shows the amount, its
percentage of the monthly goal, and the peso gap to it. Months with no data are
drawn as dashed outlines so an unrecorded month does not read as a bad one.

**Debt** — Payables ticked as debt, showing what is left on each, the order worth
clearing them in, and how long until the last one is gone.

**Accounts** — Registration, password reset, email verification, two-factor
authentication and passkeys, via Laravel Fortify.

**Theming** — Light, dark and system, applied across every page.

## Project status

The backend is in. Both halves of the app — the forecast and the record of what
actually happened — are stored, read over HTTP and covered end to end.

- The plan lives in `budget_plans`, `paychecks` and `expense_items`. It is edited
  as one document, saved as one document, and shared to every page that reads it
  from `HandleInertiaRequests`.
- Paydays live in `payouts`, `payout_incomes` and `payout_lines`. The
  `payouts:open` command runs daily and opens whatever is due.
- Money is centavos in the database and pesos on the wire. The crossing happens
  in a Resource on the way out and a Form Request on the way in, and nowhere
  else — see `app/Concerns/ConvertsMoney.php`.

Still sample data on the dashboard: recent activity, the spending categories
shown before a plan exists, and the supporting stats beside them. They need
history the ledger does not carry yet, and are commented as such in
`resources/js/pages/dashboard/index.tsx`.

One thing worth knowing before you extend either side: several derived figures
exist twice — as pure functions in `resources/js/lib/budget.ts` and as methods on
`BudgetPlan` and `ExpenseItem`. Only the TypeScript half is wired to the UI. The
PHP half is tested but uncalled, so the two can drift without anything failing.

## Tech stack

| Layer     | Choice                                                  |
| --------- | ------------------------------------------------------- |
| Backend   | Laravel 13, PHP 8.3+                                    |
| Frontend  | React 19, Inertia 3, TypeScript 5.7                     |
| Styling   | Tailwind CSS 4 (CSS-first config), shadcn-style UI       |
| Build     | Vite 8, SSR enabled                                     |
| Auth      | Laravel Fortify, `@laravel/passkeys`                    |
| Routing   | Laravel Wayfinder (typed route helpers)                 |
| Testing   | Pest 4, Pest Browser plugin, Playwright                 |
| Analysis  | Larastan, Pint, ESLint, Prettier, `tsc`                 |
| Database  | SQLite by default                                       |

## Requirements

- PHP **8.3+** — CI runs the suite on 8.4 and 8.5
- Composer
- Node.js **22** and npm
- SQLite (default; any Laravel-supported driver works via `.env`)

## Getting started

```bash
git clone https://github.com/Kronux123/financing-app.git
cd financing-app
composer setup
```

`composer setup` installs both dependency sets, creates `.env`, generates the app
key, runs migrations and builds the frontend.

### Serving

The project is developed with [Laravel Herd](https://herd.laravel.com), which
serves it at `http://financing-app.test` with no command to run. Start Vite for
hot reloading:

```bash
npm run dev
```

Without Herd, run the full stack — server, queue worker and Vite — together:

```bash
composer dev
```

### First run

Register an account at `/register`, then open `/finance` to build a plan. Save it
and the dashboard picks it up.

Payouts only appear once a payday has come round *and* the scheduled command has
run, and it will not invent paydays from before your plan existed. To see the
ledger without waiting a day, back-date the plan and open them by hand:

```bash
php artisan payouts:open --months=6
```

Finalize one on `/payouts` and the month it belongs to appears on the dashboard
chart and in the savings calendar.

## Commands

| Command                    | What it does                              |
| -------------------------- | ----------------------------------------- |
| `npm run dev`              | Vite dev server with hot reloading        |
| `npm run build`            | Production build                          |
| `npm run build:ssr`        | Production build including the SSR bundle |
| `composer dev`             | Server, queue worker and Vite together    |
| `composer test`            | Pint check, then the full Pest suite      |
| `composer ci:check`        | Everything CI runs, in one command        |
| `composer lint`            | Fix PHP style with Pint                   |
| `composer stan`            | Static analysis with Larastan             |
| `npm run lint`             | Fix JS/TS with ESLint                     |
| `npm run format`           | Format `resources/` with Prettier         |
| `npm run types:check`      | Typecheck with `tsc --noEmit`             |
| `php artisan payouts:open` | Open a payout for each payday that has been |

`payouts:open` is scheduled daily at 01:00 in `routes/console.php`. It is safe to
run as often as you like and safe to miss: it only opens what is not already
there, and a run that never happened is caught up by the next one. Pass
`--months=6` to catch up further back.

## Testing

```bash
php artisan test                      # everything
php artisan test --compact            # quieter output
php artisan test --testsuite=Feature  # HTTP and Inertia tests
php artisan test --testsuite=Browser  # real-browser tests
php artisan test --filter=BudgetPlan  # a single file or test
```

Three suites are registered in `phpunit.xml`: `Unit`, `Feature` and `Browser`.
Feature and Browser tests both get `RefreshDatabase` and run against an in-memory
SQLite database.

### Browser tests

The `Browser` suite drives a real Chromium through the Pest Browser plugin, which
needs Playwright's browser binary installed once:

```bash
npx playwright install chromium
```

It also runs against **built** assets, so build before running it:

```bash
npm run build && php artisan test --testsuite=Browser
```

> **Stop the Vite dev server first, or check for `public/hot`.** While that file
> exists, Laravel points every asset at the dev server rather than the manifest,
> and the browser suite hangs — files that pass in 18 seconds sit past 240
> without finishing, and the test that stalls moves between runs. Worse, it
> invents symptoms: a reloaded page came back with pre-save values while the
> database and the controller both held the correction, which reads exactly like
> a persistence bug and is not one. To run against the build without disturbing a
> dev server somebody else started, move the file aside and put it back after.

These cover both halves end to end — cadence switching, per-paycheck leftovers,
group rollups, over-allocation, moving and removing expenses, the swept
remainder surviving a save, opening and correcting a payday, the freeze that
stops a finalized record following the plan, and a settled month reaching the
dashboard. Every page is also asserted free of JavaScript errors and
accessibility violations, in both light and dark mode.

A few quirks worth knowing before you add to that suite — the full list lives in
`.ai/rules/browser.md`:

- Most failures here **hang rather than fail**. A locator waits for something
  that will never appear, with no deadline of its own — one `inputValue()` sat
  for 29 minutes. Run with `--stop-on-failure` and a timeout you are willing to
  wait out.
- `refresh()` reloads the url the page was opened at with `visit()`, not wherever
  you have since navigated. Walk from `/finance` to `/payouts` through the
  sidebar, refresh, and you are back on `/finance`.
- Clicking a **disabled** button hangs. `@save-plan` is disabled until the plan
  is dirty, so make a real edit before clicking it.
- `navigate()` does not move the page here. Use `refresh()` to reload in place,
  or click a real link to move between pages.
- A second `visit()` opens a fresh browser context. Navigate through the UI when
  you need continuity inside one test.
- `click()` will not find an icon-only button by its `aria-label`. Target a
  `data-test` attribute with `@my-hook` instead.

## Routes

| Method | URI                        | Name                   |
| ------ | -------------------------- | ---------------------- |
| GET    | `/`                        | `home`                 |
| GET    | `/dashboard`               | `dashboard`            |
| GET    | `/dashboard/months`        | `dashboard.months`     |
| GET    | `/dashboard/activities`    | `dashboard.activities` |
| GET    | `/finance`                 | `finance.edit`         |
| PUT    | `/finance`                 | `finance.update`       |
| GET    | `/debt`                    | `debt.index`           |
| GET    | `/payouts`                 | `payouts.index`        |
| PUT    | `/payouts/{payout}`        | `payouts.update`       |
| PATCH  | `/payouts/{payout}/status` | `payouts.status`       |
| GET    | `/settings/profile`        | `profile.edit`         |
| GET    | `/settings/security`       | `security.edit`        |

Everything except `/` sits behind `auth` and `verified`. Fortify adds the
authentication routes on top of these, and `routes/settings.php` carries the
profile and password writes.

The plan is not on this table because no route returns it. It is a shared prop,
so every page gets it without asking — four pages read it and each wants the
whole thing, which would otherwise be the same query written out four times.

## Project structure

```
.ai/rules/                     Settled decisions and traps, mapped by glob
app/
  Actions/
    Finance/SaveBudgetPlan     Replaces the plan without rebuilding its rows
    Payouts/OpenPayoutsForPlan Opens a payday and copies the plan into it
    Payouts/SavePayout         Records what a payday actually did
    Payouts/MonthlySavings     What each settled month put by
  Concerns/ConvertsMoney       The peso/centavo boundary, in one place
  Console/Commands/OpenPayouts The daily `payouts:open` command
  Enums/                       ExpenseGroup, PayCadence, IncomeSource, PayoutStatus
  Http/
    Controllers/               Dashboard, Finance, Payout, PayoutStatus, Settings
    Requests/                  Validation, and the wire-to-column translation
    Resources/                 The column-to-wire translation
  Models/                      BudgetPlan, Paycheck, ExpenseItem, Payout, …
database/migrations/           Six finance tables, each documented in place
resources/
  css/app.css                  Tailwind 4 theme, including the --goal-* scale
  js/
    components/
      dashboard/               SavingsCalendar, SavingsChart
      finance/                 AmountInput, PaycheckCard, PlanSummary
      ui/                      shadcn-style primitives
    hooks/
      use-budget-plan.ts       The shared plan, plus the draft being edited
      use-payouts.ts           One payday's draft, and writing it back
      use-savings.ts           The settled months behind the charts
    layouts/                   App, auth and settings shells
    lib/
      budget.ts                Plan model and every derived calculation
      payout.ts                The payout contract and its arithmetic
      savings.ts               Arranging settled months for the charts
      currency.ts              Peso formatting and parsing
    pages/                     Inertia page components
    routes/, actions/          Generated by Wayfinder — never edit by hand
tests/
  Browser/                     Real-browser tests
  Feature/                     HTTP and Inertia tests
  Unit/
```

## Conventions

- **Read the rules first.** `.ai/rules/index.md` maps file globs to the decisions
  that already govern them — the money boundary, the derived remainder, the
  browser-test traps. They are there so the next person does not work them out
  again.
- **Calculations stay out of components.** Anything derived lives in
  `resources/js/lib/` as a pure, typed function, which is what makes it testable.
- **Two translations, and no more.** A Resource turns columns into what the pages
  read; a Form Request turns what the pages send back into columns. Never hand a
  raw model to Inertia, and never convert money anywhere else.
- **`type`, never `interface`.** Prop types are module-local and unexported,
  named `<ComponentName>Props`.
- **Components are `function` declarations**; module-scope helpers are `const`
  arrow functions. Pages use `export default`, shared components use named
  exports.
- **Route helpers come from Wayfinder.** Import from `@/routes` or `@/actions`
  rather than hardcoding URLs, and regenerate with `php artisan wayfinder:generate`.
- **Formatting is enforced**: 4-space indent, single quotes, 80-column width,
  Tailwind classes sorted by `prettier-plugin-tailwindcss`.
- Every change should come with a test. CI will not go green without one passing.

## Design notes

**A payout copies the plan; it never points at it.** When a payday comes round,
the command writes the paycheck and every expense onto the record as figures of
its own. Nothing on a payout is read back through the plan afterwards. That is
the whole reason the ledger is worth keeping: raise your rent in March and
February still says what February cost. The same principle decides what a Form
Request will accept — `planned` is refused on the way in, because a record of the
forecast is worth nothing if the forecast can be edited later.

**The swept remainder is derived, never stored.** A paycheck set to save what is
left over gets that line rebuilt on every edit and dropped before saving. Storing
it once looked simpler and was wrong: the reloaded row read as an ordinary
savings item, so the sweep counted its own figure as already claimed and the next
edit collapsed it to zero. It also decides how saving is measured — since the
swept line never reaches a payout, a month's saving is income less living costs
rather than the savings lines added up.

**The goal-tracking colour scale.** Progress against a target uses three hues
rather than three shades of one, so the tiers stay apart for colour-blind
readers: orange behind, blue close, green met. Blue in the middle is what carries
it — the obvious traffic-light ordering measures a CVD delta-E of 3.3, because
orange and green converge for red-green colour blindness. The steps are defined
as `--goal-behind`, `--goal-close` and `--goal-met` in `resources/css/app.css`,
selected per mode against each card surface, and validated all-pairs.

Colour never carries meaning alone. It appears as a dot, a bar or a 10% tint,
while the exact percentage is always printed alongside and text stays on ink
tokens.

The budget planner reuses the same tokens with inverted thresholds — over 100%
allocated is orange, 90–99% blue, under 90% green — because overspending a
paycheck is a problem where beating a savings goal is not. Orange means trouble
on both pages.

## License

MIT.
