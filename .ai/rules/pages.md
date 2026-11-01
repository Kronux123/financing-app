---
paths:
  - resources/js/pages/welcome.tsx
---

# Pages

## Landing page scroll entrances go through revealFrom()
Every scroll entrance on the landing page uses `revealFrom()`, `RevealHeading` or `CountUp` from `components/welcome/reveal.tsx`. `revealFrom()` only accepts transforms (x, y, scale, rotate, scaleX/Y), never opacity — a fade parks muted text under the axe contrast floor mid-scroll. `CountUp` renders the final figure until it is in view, so tests and crawlers never read ₱0.00. The page is wrapped in `MotionConfig reducedMotion="user"`, which makes all of it instant under reduced motion. Give a new section its own entrance rather than reusing a neighbor's.
