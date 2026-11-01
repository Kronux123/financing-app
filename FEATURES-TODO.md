# Feature backlog — one at a time

Last updated: 2026-11-01. Ordered by value: work top to bottom, and tick each one off when it is
merged. Each entry says *why* it matters and what is already in the codebase to build on, so a
fresh session can pick it up cold.

---

## Worth building

### 1. [ ] Payday reminders

**Why:** paydays open themselves at 01:00 (`payouts:open` in `routes/console.php`), but nobody is
told. A payday nobody finalizes never reaches the history — that is how a calendar fills up with
"Nothing settled" months. Every other screen depends on this one habit.

**Shape:** a Laravel notification with `mail` and `database` channels.
- Mail: a digest such as "2 paydays awaiting review", queued, sent at most once per payday.
- In-app: a badge on Payouts in the sidebar, plus a banner on the dashboard. Inertia's polling (or a
  plain reload) is enough here — see the note on WebSockets at the bottom.
- A setting to turn the mail off.

**Build on:** `PayoutStatus::Pending`, the `OpenDuePayouts` middleware, `payouts:open`.
**Blocks on:** working mail in production (already needed for email verification and password
reset — see the deployment traps memory).

### 2. [ ] One-off income — 13th-month pay and bonuses

**Why:** the plan models regular paychecks only. In the Philippines the 13th month (and often a
mid-year or holiday bonus) is a large, predictable lump people want to give a job *before* it
lands. Today it can only be patched onto a payday after the fact.

**Shape:** a dated one-off income on the plan ("13th month — Dec 15 — ₱40,000") with its own
allocation, which opens alongside that month's payday.
**Build on:** `PayoutIncome` already carries `planned` and `actual`, so a payday can hold more than
one income line. Check how 13th-month pay is taxed (exempt up to ₱90,000) before showing take-home.

### 3. [ ] Named savings goals

**Why:** savings has two buckets — the emergency fund and the pot. People save *toward* things with
dates: a trip, Christmas, a laptop.

**Shape:** goals with a target, a date and a share of the pot; "₱1,500 a month gets you there by
June". Fund still fills first.
**Build on:** the savings card on the plan, the goal tiers in `lib/savings.ts`, the `piggy-bank`
sprite.

### 4. [ ] Filters on the activity log

**Why:** the log pages through everything, newest first. It cannot answer "what did I spend
unplanned in August?".

**Shape:** month picker, an "unplanned only" toggle, a name search — all in the query string.
**Build on:** `ActivityLog` (union query, already paged in SQL) and `isUnplanned`. Read `lib.md`
before touching it — the two-table ordering is the hard part.

---

## Nice to have

### 5. [ ] Installable on a phone (PWA manifest)

Recording a payday is a phone moment. A web manifest, icons and a theme colour make it
home-screen-able. No service worker needed to start.

### 6. [ ] Planned vs actual, per line, over time

"Electricity ran ₱300 over plan in 4 of the last 6 months." Every finalized `PayoutLine` already
holds `planned` and `actual`; this is a read-only view over them. The insight that makes people
fix their plan.

### 7. [ ] Notes on a payout line

What the ₱4,000 hospital visit was. A nullable `note` column on `payout_lines`, shown in the
activity log.

---

## Decided against (for now)

- **Bank / e-wallet sync** — "no bank login" is on the landing page as a selling point, and it keeps
  credentials and compliance out of scope.
- **Shared or household budgets** — a different data model (ownership, invitations, permissions).
- **Multiple currencies** — the app is built around pesos and Philippine payroll on purpose.
- **WebSockets (Reverb)** — not needed for reminders; see below.

---

## Infrastructure notes

**Queues — yes, adopt with reminders.** `QUEUE_CONNECTION=database` is already set, but there are
no jobs yet (`app/Jobs` does not exist). First uses: queued reminder mail, and the month PDF export
(PDF rendering is slow enough to hold a request). On AWS, either keep the database driver with one
worker container, or switch to SQS. Either way it is one more long-running process to deploy.

**WebSockets — not yet.** A reminder has to reach someone who is *not* on the site, which is mail's
job (or web push later), not a socket's. In-app, the only live state is "how many paydays are
pending", which changes once a day — polling covers it. Reverb would add a second long-running
server and sticky WebSocket routing on the load balancer for no visible gain. Revisit if two people
ever edit the same budget at once.
