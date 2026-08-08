---
paths:
  - 'resources/js/**/*.tsx'
  - 'resources/js/**'
---

# Js

## Tinted text needs a -700 light step to clear the contrast floor
Tailwind's -400/-500/-600 emerald and rose steps fail axe's 4.5:1 contrast at 14px text, even on white: emerald-600 is 3.69:1, rose-400 is 2.8:1, and a -500 badge on its own /10 tint is ~2.2:1. Any coloured text needs a -700 (or -800 for amber) light step plus a dark: -300/-400 step, e.g. `text-emerald-700 dark:text-emerald-400`. Backgrounds and icons are exempt — axe only checks text.

`assertNoAccessibilityIssues()` in both modes is what catches this; add it when a page gets tinted text.

## The swept remainder is derived, never sent to the server
The "Remaining balance" savings line is computed from the paycheck minus everything hand-entered on it. `serialise()` in use-budget-plan.ts filters it out, and `useStoredBudgetPlan()` rebuilds it with `withSweptRemainders()` on the way back in. Only `savesRemainder` on the paycheck is persisted — see the expense_items migration, which says the same from the other side.

Storing it double-counts: the reloaded row reads as an ordinary savings item, so the sweep sees its own figure as already claimed and the next edit collapses the remainder to zero. This is also why `isRemainderItem()` can identify the line by its made-up `remainder-{paycheckId}` id — that id only ever exists client-side.
