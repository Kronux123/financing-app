# Feature backlog — one at a time

Last updated: 2026-11-01. Ordered by value: work top to bottom, and tick each one off when it is
merged. Each entry says *why* it matters and what is already in the codebase to build on, so a
fresh session can pick it up cold.

---

## Worth building

### 1. [x] ~~Payday reminders~~ — done 2026-11-01

**Why it mattered:** paydays open themselves, but nobody was told. A payday nobody finalizes never
reaches the history — that is how a calendar fills up with "Nothing settled" months.

**Shipped as:** mail only, no `database` channel — the in-app count is worked out from the payouts
(`pendingPaydays` shared prop), so a stored notification would only be a copy that can go stale.
`payouts:remind` runs daily at 01:15 UTC (9:15 Manila) and chases each pending payday on the day,
3 days on and 7 days on (`PaydayReminders::SCHEDULE`), one digest email per person per run, verified
addresses only. Sidebar badge, dismissible dashboard banner, Settings → Notifications, signed
one-click unsubscribe, a Kept mail theme for every email. `MustVerifyEmail` is now on.
Locally, mail goes to Mailpit (`compose.dev.yaml`) and `composer dev` runs the queue and scheduler.

**Still open for production:** a queue worker container next to the scheduler, real mail (SES), and
`MAIL_FROM_ADDRESS` on our own domain.

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

Recording a payday is a phone moment. A web manifest, icons and a theme color make it
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

**Queues — adopted.** Reminder mail is the first queued work (`PaydaysAwaitingReview` implements
`ShouldQueue`, on the database queue). Next candidate: the month PDF export, which is slow enough
to hold a request. On AWS, either keep the database driver with one
worker container, or switch to SQS. Either way it is one more long-running process to deploy.

**WebSockets — not yet.** A reminder has to reach someone who is *not* on the site, which is mail's
job (or web push later), not a socket's. In-app, the only live state is "how many paydays are
pending", which changes once a day — polling covers it. Reverb would add a second long-running
server and sticky WebSocket routing on the load balancer for no visible gain. Revisit if two people
ever edit the same budget at once.
