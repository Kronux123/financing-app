---
paths:
  - 'resources/js/**/*.tsx'
---

# Js

## Tinted text needs a -700 light step to clear the contrast floor
Tailwind's -400/-500/-600 emerald and rose steps fail axe's 4.5:1 contrast at 14px text, even on white: emerald-600 is 3.69:1, rose-400 is 2.8:1, and a -500 badge on its own /10 tint is ~2.2:1. Any coloured text needs a -700 (or -800 for amber) light step plus a dark: -300/-400 step, e.g. `text-emerald-700 dark:text-emerald-400`. Backgrounds and icons are exempt — axe only checks text.

`assertNoAccessibilityIssues()` in both modes is what catches this; add it when a page gets tinted text.
