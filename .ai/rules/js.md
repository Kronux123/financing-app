---
paths:
  - 'resources/js/**/*.tsx'
  - 'resources/js/**'
---

# Js

## Tinted text needs a -700 light step to clear the contrast floor
Tailwind's -400/-500/-600 emerald and rose steps fail axe's 4.5:1 contrast at 14px text, even on white: emerald-600 is 3.69:1, rose-400 is 2.8:1, and a -500 badge on its own /10 tint is ~2.2:1. Any coloured text needs a -700 (or -800 for amber) light step plus a dark: -300/-400 step, e.g. `text-emerald-700 dark:text-emerald-400`. Backgrounds and icons are exempt — axe only checks text.

`assertNoAccessibilityIssues()` in both modes is what catches this; add it when a page gets tinted text.

## Colour comes from the slate-and-jade tokens, and jade on a jade tint is `jade-ink`
Use the theme tokens in `app.css` (`text-jade`, `bg-jade/10`, `text-amber`, `text-destructive`, `bg-muted`, `text-muted-foreground`) rather than Tailwind palette steps like `text-emerald-700` — the tokens carry their own light and dark values, so no `dark:` pair is needed.

Jade text sitting on its own tint (`bg-jade/10`, a badge or a status pill) uses `text-jade-ink`, not `text-jade`: plain jade on the tint measured 4.27:1 and failed axe. Plain `text-jade` is fine on a card or the page.

The light theme is deliberately dimmed off white (page `#e6eaf0`, card `#f5f7fa`), and muted text, jade and destructive were darkened to keep 4.5:1 on it. If you lighten or darken `--background` or `--card`, rerun the browser suite — the activity log's red amounts were the first to fail last time.

## Every page wrapper is the same, and it is not centred
The outer div of a page inside the app layout is `flex w-full flex-col gap-6 p-4 md:p-6`. No `mx-auto`, no `max-w-*` — the sidebar already sets the reading width, and a second cap inside it left the content floating in a narrow column with dead space either side.

These had drifted into three different widths: `max-w-7xl` on dashboard, finance and months, `max-w-3xl` on debt and payouts, and no cap at all on activities. Activities was the one that looked right, so it is now the default everywhere. If a page genuinely needs a narrower measure, constrain the block that needs it, not the whole page.

## A fade-in reveal drops muted text under the contrast floor
Animating opacity on a block that contains `text-muted-foreground` fails axe for as long as the animation is mid-flight. The token is `#737373` — 4.6:1 on white, just over the line — and part-opacity blends it toward the background: at the values axe caught on the landing page it computed `#898989`, or 3.49:1. A scroll-driven reveal makes this worse than a load animation, because the element sits part-faded for the whole time you are scrolling toward it.

`rise-on-scroll` in `app.css` therefore animates `transform` only. Translation never touches a computed colour, so the motion is free. Keep opacity fades for things that finish on load and are done with — `rise-in` fades because it has completed long before axe or a reader arrives.

## The swept remainder is derived, never sent to the server
The "Remaining balance" savings line is computed from the paycheck minus everything hand-entered on it. `serialise()` in use-budget-plan.ts filters it out, and `useStoredBudgetPlan()` rebuilds it with `withSweptRemainders()` on the way back in. Only `savesRemainder` on the paycheck is persisted — see the expense_items migration, which says the same from the other side.

Storing it double-counts: the reloaded row reads as an ordinary savings item, so the sweep sees its own figure as already claimed and the next edit collapses the remainder to zero. This is also why `isRemainderItem()` can identify the line by its made-up `remainder-{paycheckId}` id — that id only ever exists client-side.

## Each idea has one pixel-art sprite, reused everywhere
Pixel art from `components/pixel-art.tsx` now marks every app page header (`PageHeader art=` or `SpriteTile`) and the dashboard stat cards, not just empty states. Keep the mapping fixed so the art doubles as wayfinding: savings = `piggy-bank`, emergency fund = `umbrella`, debt = `mountain`, paydays/payouts = `moneybag`, budget plan = `calculator`, pay/paychecks = `envelope`, activity = `receipt`, savings calendar = `calendar`, monthly savings chart = `chart`, dashboard = `wallet`. Draw new sprites on a 12 or 16 grid with palette letters (theme tokens, never hex), and render at a multiple of the grid (48, 64, 80) so cells stay even. Idle motion goes on a layer via the `pixel-*` utilities in app.css, which already stop under reduced motion.
