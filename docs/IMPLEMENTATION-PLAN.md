# VidNetwork — Implementation Plan

Target: evolve the existing community + video platform per `VIDNETWORK_IMPLEMENTATION_PRD_FOR_OPENCODE.md`
and the Mighty Networks research (see session notes). Non-destructive policy applies (PRD §4, §41).

## Phases (execution order)

### Phase 0 — Safety
- Commit the existing uncommitted WIP as a checkpoint (`chore: checkpoint WIP purchases + hardening`). DONE.
- Baseline: `npm run lint` (0 errors), `npm test` (54 pass), `npm run build` (OK). DONE.

### Phase 1 — Plan docs
- `docs/IMPLEMENTATION-PLAN.md` (this file).
- `docs/AUTHORIZATION-MATRIX.md`.
- Refresh `docs/PRODUCTION-AUDIT.md` with new findings/changes.

### Phase 2 — Member Dashboard (`/dashboard`)
- New server-rendered page: Welcome, Live Now, Upcoming Events, Continue Learning,
  Community Activity, Recommended Spaces, Recent Messages, Notifications, Welcome Checklist.
- Post-login redirect (`login`, `signup`) → `/dashboard`; `Nav.js` brand → `/dashboard`.
- `/account` stays as settings/profile (PRD §9–11).

### Phase 3 — Public Explore (`/explore`)
- `publicPreview` flag on spaces / events / courses / rooms (admin toggles, server validation).
- Public page with public spaces, upcoming events, course previews, live-room previews.
- No private data leakage: server-side reads only, no client Firestore reads.

### Phase 4 — Non-coder workflows
- Admin events: room slug free-text → dropdown of active rooms.
- `/events/[id]` event detail page (RSVP, capacity, ICS, live-room link).
- Group detail page: Join/Leave button.
- Pricing page: navigation for signed-in users.

### Phase 5 — UX / mobile / brand polish
- `Nav.js`: hamburger menu on small screens; brand wordmark "VidNetwork".
- Fix "Community" hardcodes in `login`/`signup`.
- About/Guidelines: light indigo theme + media queries.
- Feed: inline report modal; proper like/bookmark icons.
- Leaderboard: rows link to member profiles; cap/period.
- Search deep-links (events → `/events/[id]`).
- Profile-save fixes: notifications coercion, `GET /api/me` parity, name → Firebase Auth,
  rate limit on `PATCH /api/me`; regression tests.

### Phase 6 — Admin analytics (`/admin/analytics`)
- Active/contributing members, signups, RSVPs, course completion, subscriptions/revenue,
  top content/members. Server-side aggregates. DONE.
- `src/lib/server/analytics.js` (aggregates) + `analytics-core.js` (pure, unit-tested),
  `/api/admin/analytics` (`requireOwner`), `/admin/analytics` page, owner Nav link.

### Phase 7 — Complete WIP purchases
- Reuse cached Stripe price IDs; idempotent session handling; verify paid amount in webhook;
  paid-content read gate. DONE.
- `src/lib/server/purchases-core.js` (pure, unit-tested) + refactored `purchases.js`
  (adds `getOrCreateStripePrice` with caching), `/api/stripe/purchase` uses
  `idempotency_key: purchase:{targetType}:{targetId}:{uid}`, webhook verifies
  `session.amount_subtotal` vs `purchasePriceCents` and marks the event failed on mismatch.

### Phase 8 — Mighty extras
1. Scheduled/recurring questions (cron + posts API). DONE.
   - `questions-core.js` (UTC `computeNextRun`, tested), `/api/admin/questions`,
     `/api/cron/scheduled-questions` (CRON_SECRET), `/admin/questions` page, `vercel.json` cron.
2. People Explorer tabs on `/members` (Online Now / Newest / Top / Hosts). DONE.
   - Enriched member cards with `createdAt`, `points`, `lastVisitDate`; tabbed
     `MembersDirectory`; Owner/Mod badges; online proxy = lastVisitDate today.
3. Live "now" banner across member pages. DONE.
   - `LiveNowBanner` rendered inside `Nav`, polls `/api/rooms/live` (active rooms only) every 60s.
4. Waiting room for scheduled event rooms. DONE.
   - `getUpcomingRoomStart`, token route returns 423 with `opensAt` until start
     (hosts/moderators bypass), countdown UI in `RoomClient`.
5. Automations engine (Trigger→Action). DONE.
   - `automations-core.js` (tested), triggers new_member/new_post/event_rsvp →
     send_email/create_notification/award_points; hooks in session/posts/rsvps routes;
     `/api/admin/automations`, `/admin/automations` page, owner Nav link.
6. Peer recognition (values + points, leaderboard by recognition). DONE.
   - `recognition-core.js` (tested), `/api/recognitions`, `recognitionCount` counter,
     recognition form on member profile + recognitions feed, "Most recognized" leaderboard
     section, 15 points + notification to recipient.

### Phase 9 — Verification & report
- `npm run lint` → 0 errors. `npm test` → 95 pass. `npm run build` → compiles, 52 pages.
- Report: Implemented / Partially implemented / Not implemented / Known limitations.

## Non-negotiables (PRD §41)
- No rewrite from scratch; no weakening authorization; no client-trusted permissions;
  no private data to visitors; no false success states; no copying another brand's UI.
