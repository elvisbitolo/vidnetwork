# Yarnery Lounge — Production Audit

Project: `christa-patel` (Firebase), Vercel (https://yarnerylounge.vercel.app)
Audit basis: `~/Downloads/VIDNETWORK_PRODUCTION_HARDENING_PRD.md`
Status: PHASE 1 (discovery) and PHASE 2 (plan) complete; PHASE 3 hardening in progress (see `REMEDIATION-REPORT.md`).

## Identity checks (PRD §5.1)

- `.firebaserc` points at `christa-patel`; `firebase.json` deploys `firestore.rules` and `storage.rules`.
- `vercel.json` defines cron routes; project linked in `.vercel/project.json`.
- Admin SDK boots from `FIREBASE_SERVICE_ACCOUNT` (or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`).

## Findings

### P0 — must fix

| ID | Finding | Location | Status |
|----|---------|----------|--------|
| P0-1 | `users` docs readable by any active subscriber, leaking every member's `email` | `firestore.rules` | Fixed (read = self or owner) |
| P0-2 | `rsvps` readable by any member; stored `email`; attendee data exposed via client `onSnapshot` | rules + `api/rsvps` + `events/EventsBoard.js` | Fixed (read = self/owner; email removed; server-side attendee API) |
| P0-3 | `recordings`/transcripts readable by any active member; direct public S3 URLs | rules + `recordings/page.js` + transcript route | Fixed (rules server-only; context-aware access; signed download route) |
| P0-4 | Storage lesson files not tier-gated; lessons/modules reads in Firestore had no published/tier check | `storage.rules` + rules | Fixed (file ready; storage bucket not yet initialized in project) |
| P0-5 | LiveKit token route: no space-membership check; `requireGroupMember` used without import (ReferenceError on group rooms) | `api/livekit/token/route.js` | Fixed (import added; space membership + tier check) |
| P0-6 | `posts` update rule had no `affectedKeys`; posts reads not membership-aware | rules | Fixed |
| P0-7 | Poll votes expose full `pollVotes` UID→option map (endpoint + post doc) | `api/posts/[id]/vote` + `Feed.js` | Fixed (votes moved to private `pollVotes` collection; posts keep anonymous `pollCounts`/`pollTotal`) |
| P0-8 | like/vote/bookmark/comments/pin did not verify the post is readable by the caller | routes | Fixed (shared `canAccessPost`) |

### P1 — should fix

| Finding | Location | Status |
|---------|----------|--------|
| Rate limiting only on a handful of routes; in-memory (non-shared, resets on deploy) | `lib/server/rate-limit.js` | Fixed for comments, likes, votes, bookmarks, messages, reports, space join, course progress, rsvp, livekit token. In-memory limitation documented. |
| Stripe checkout/portal redirect-URL validation (former) | `api/stripe/checkout`, `api/stripe/portal` | N/A — Stripe removed; payments moved to Shopify |
| Stripe webhook check-then-act idempotency race (former) | `api/webhooks/stripe` | N/A — Stripe removed; apply atomic `create()` claim to the future Shopify sync |
| `past_due` inconsistency between rules and `billing.js` | rules + `lib/server/billing.js` | Fixed (rules `isActiveSub` now includes `past_due` + suspension + period-end) |
| RSVP capacity check-then-create race | `api/rsvps` | Fixed (transaction + per-occurrence `capacityCounts`) |
| Space/group delete orphans children (rooms, events, courses, posts, members) | `lib/server/spaces.js` + `api/groups/[id]` | Fixed (cascade delete helpers; chunked batches) |
| Room delete didn't end the LiveKit room; `roomEvents` orphaned | `api/rooms/[id]` + `lib/server/rooms.js` | Fixed (`deleteRoom` ends LiveKit + removes events) |
| No recording retention cleanup | — | Fixed (cron `recording-retention`, daily 03:00 UTC, `CRON_SECRET`-gated) |
| Admin overview counts capped at 1000 docs | `api/admin/overview` | Fixed (`count()` aggregate with fallback) |
| Chat `loadNames()` scanned the entire `users` collection; DM accepted arbitrary UIDs; no message rate limit | `lib/server/chat.js` + `api/conversations*` | Fixed (bounded per-conversation name fetch; DM recipient existence check; message limit) |
| Admin/moderator could suspend the owner | `api/admin/members/[id]` | Fixed (owner suspension rejected) |

### P2 — nice to have

| Finding | Location | Status |
|---------|----------|--------|
| PWA manifest + app icons missing; `sw.js` referenced `/icon.png` that did not exist | `public/`, `layout.js` | Fixed (`manifest.webmanifest`, 192/512 icons, manifest link + metadata) |
| No CI | — | Added `.github/workflows/ci.yml` (lint + test + build) |
| No regression tests for authz / billing / capacity / like / profile-save | — | Added `posts.test.js`, `events-core.test.js`, `profile.test.js` (54 total) |

## Addendum 2026-08-14 (Yarnery Lounge evolution per IMPLEMENTATION_PRD + Mighty research)

Added new findings from the review pass:

| ID | Finding | Status |
|----|---------|--------|
| A-1 | No `/dashboard` member home; `/account` is post-login home; `Nav.js` brand hardcodes "Community" | Fixed (dashboard + brand) |
| A-2 | No public `/explore`; all content behind auth/subscription | Fixed (publicPreview flags + explore) |
| A-3 | No event detail page; search events deep-link to `/events`; admin room field is free-text slug | Fixed (detail page + room dropdown) |
| A-4 | Admin analytics limited to counts + leaderboard | Extended (`/admin/analytics`) |
| A-5 | Member nav is horizontal scroll; pricing page lacks nav; group detail lacks join button; about/guidelines dark-theme mismatch; feed uses `window.prompt/alert` reporting | Fixed (Phase 5) |
| A-6 | Profile: `notifications` coercion bug, `GET /api/me` omits profile fields, name not synced to Firebase Auth, no PATCH rate limit | Fixed |
| A-7 | WIP purchases feature uncommitted | Committed as checkpoint + hardened (Phase 7) |

Outstanding / follow-up

- **Initialize Firebase Storage** on `christa-patel` (project setup), then deploy `storage.rules`. Until then the lesson tier rules are authored but not enforced (no bucket).
- In-memory rate limiter is per-instance and resets on deploys; move to a shared store (Upstash/Redis) for strict production enforcement.
- Legacy polls created before the fix keep a `pollVotes` map in their post doc; `Feed.js` falls back to it for display. New polls store only `pollCounts`/`pollTotal`.
- Pre-existing `lessons` without a `courseId` are denied by rules (safe default). Verify all existing lessons carry `courseId` or backfill.
- Recording downloads fall back to the public S3 host when egress credentials are not configured; configure S3 creds to get signed URLs.
- `storage.rules` lesson read path depends on `lessons/{id}` docs carrying `courseId`; keep enforced at write time (owner-only writes).
