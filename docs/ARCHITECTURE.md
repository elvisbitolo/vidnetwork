# VidNetwork — Architecture

How the software is organized and how the main flows work.

## 1. High-level view

```
Browser (React 19 client)
   │  · httpOnly session cookie  (created from Firebase idToken)
   │  · client SDK reads for realtime data (feed, chat, leaderboard)
   ▼
Next.js 16 App Router  (Node.js 24)
   ├── Page components   →  server components fetch with Admin SDK
   └── API routes        →  all writes + privileged reads, guarded server-side
        │                    (requireUser / requireActiveMember / requireOwner …)
        ▼
src/lib/server/*        →  business logic: Firestore (Admin SDK), Stripe,
                           LiveKit, AWS S3, Resend email, Web Push
        │
        ▼
External services: Firebase (Auth/Firestore/Storage) · Stripe · LiveKit · S3 · Resend · Deepgram/OpenAI
```

## 2. Code layout

| Path | Contents |
|---|---|
| `src/app/**/page.js` | Pages (server or client components) |
| `src/app/**/route.js` | API routes (colocated with their pages) |
| `src/components/` | Shared client components (`Nav`, `BuyButton`, …) |
| `src/lib/firebase/` | Client + Admin SDK initializers |
| `src/lib/server/` | Server-only business logic |
| `src/lib/server/*-core.js` | **Pure** logic, no I/O — the unit-testable core |
| `src/lib/server/__tests__/` | `node:test` suites (129 tests) |
| `src/proxy.js` | Edge middleware (cookie-presence gating for protected routes) |
| `firestore.rules`, `storage.rules`, `firestore.indexes.json` | Firebase security + indexes |
| `vercel.json` | Vercel cron schedule |

### Rule of thumb
- **Pure decisions** (validation, gating, state transitions, pricing math) live
  in `*-core.js` and are unit tested.
- **I/O** (Firestore, Stripe, email, LiveKit) lives in the non-core server
  modules and API routes.
- **Clients may read** with the Firebase SDK (realtime); **clients never
  write** directly to sensitive collections — all writes go through API routes.

## 3. Auth & sessions

1. Member signs in with Google or email/password (Firebase Auth, client SDK).
2. The client exchanges the idToken for an **httpOnly session cookie**
   (`POST /api/auth/session`). The server verifies the token and **requires a
   verified email** before issuing a session.
3. The cookie is sent on every request; the edge middleware gates protected
   routes and server components/API routes resolve the user via
   `getCurrentUser()`.
4. Roles come from `users/{uid}.role` (`member | moderator | owner`).

## 4. Data model (Firestore)

| Collection | Purpose | Written by |
|---|---|---|
| `users/{uid}` | Profile + role | Server (self-updates via API) |
| `subscriptions/{uid}` | Stripe subscription mirror | Webhook / server |
| `purchases/{id}` | One-time content purchases | Webhook / server |
| `promoCodes/{id}` | Discount coupons | Owner (admin API) |
| `posts/{id}` + `comments` | Feed posts, comments, polls | API |
| `pollVotes/{id}` | Anonymous poll votes | API |
| `rooms/{id}` | Live/broadcast rooms | Owner (admin API) |
| `roomEvents/{id}` | Room join activity | Client (whitelisted) |
| `recordings/{id}` | Room recording metadata | LiveKit webhook / server |
| `events/{id}` | Events + recurrence | Owner (admin API) |
| `rsvps/{id}` | Event RSVPs (per occurrence) | API |
| `courses`, `modules`, `lessons` | Course content | Owner (admin API) |
| `progress/{id}` | Lesson completion | API |
| `spaces/{id}`, `spaceMembers/{id}` | Sub-communities + membership | Server |
| `groups/{id}`, `groupMembers/{id}` | Groups + membership | Server |
| `conversations` + `messages` | Group chat + DMs | Server |
| `notifications/{id}` | In-app notifications | Server |
| `pushSubscriptions/{uid}` | Web-push endpoints | Client |
| `gamification/{uid}` | Points, badges, streak | Server |
| `recognitions/{id}` | Member recognitions | API |
| `reports/{id}` | Moderation reports | API (create) / server |
| `settings/{id}` | Platform settings (e.g. welcome checklist) | Owner (admin API) |
| `collections/{id}` | Curated links to spaces | Owner (admin API) |
| `questions/{id}` | Scheduled community questions | Owner (admin API) |
| `automations/{id}` | Payment/engagement automations | Owner (admin API) |
| `stripeEvents/{id}` | Stripe webhook idempotency | Webhook |
| `auditLogs/{id}` | Admin audit trail | Server |

## 5. Gating model

Two layers, same intent:

1. **Server guards** (`src/lib/server/authorize.js`) — the authoritative
   boundary: `requireUser`, `requireActiveMember`, `requireTier`,
   `requireGroupMember`, `requireOwner`, `requireModerator`.
2. **Firestore/Storage rules** — backstop direct client access. The active-
   subscription predicate (`isActiveSub`) is shared verbatim between
   `billing.js` and the rules.

Access specifics per resource: see [ROLES.md](./ROLES.md) and
[AUTHORIZATION-MATRIX.md](./AUTHORIZATION-MATRIX.md).

## 6. Payments flow (Stripe)

- **Subscriptions:** checkout → `POST /api/stripe/checkout` creates a Checkout
  Session (tier + promo code) → Stripe redirects → `checkout.session.completed`
  webhook → `syncSubscription` writes `subscriptions/{uid}`.
- **One-time purchases:** `POST /api/stripe/purchase` creates a PaymentIntent
  with metadata (`uid`, `targetType`, `targetId`, `promoCode`) → the webhook
  verifies the paid amount, records `purchases/{id}`, and grants access.
- **Webhook hardening:** events are claimed idempotently in `stripeEvents`,
  amount mismatches auto-refund, `charge.refunded` revokes access.
- **Promo codes:** owner-defined coupons synced to Stripe; usage recorded on
  the webhook and rolled into the income dashboard.
- **Billing portal:** `POST /api/stripe/portal` opens Stripe's hosted portal.

## 7. Live video flow (LiveKit)

1. Room pages call `POST /api/livekit/token` — guarded by active subscription +
   tier + space/group membership (+ `opensAt` lock for scheduled rooms).
2. The client joins with a short-lived access token.
3. Broadcast rooms use one-to-many egress; conference rooms allow N-way video.
4. Recordings: egress writes to AWS S3 → the LiveKit webhook marks the
   recording complete → optional transcription (Deepgram/OpenAI) writes
   `transcript` to the recording doc.

## 8. Background jobs (Vercel cron)

| Cron | Schedule | What it does |
|---|---|---|
| `event-reminders` | daily 12:00 | Email reminders for events within 24h (marks `reminded` only after send) |
| `recording-retention` | daily 03:00 | Enforce retention policy on recordings |
| `scheduled-questions` | hourly | Publish owner-scheduled community questions |

Protected by `CRON_SECRET` bearer auth.

## 9. Realtime

Client SDK subscriptions (`onSnapshot`) power the feed, comments, chat and
leaderboard. Reads respect Firestore rules; writes to realtime-sensitive
collections (e.g. chat `messages`) are server-authored to avoid rule bypass.

## 10. Testing & CI

- `npm test` runs `node:test` on `src/lib/server/__tests__/**` (129 tests).
- GitHub Actions `.github/workflows/ci.yml` runs `lint → test → build` on every
  push/PR (Node 24).
- Pure cores (promo codes, automations, settings, rate limiting, serialize,
  posts/access, purchases, analytics, questions, recognition) all have suites.

## 11. Deployment

- **App:** Vercel (`vercel.json` defines the cron jobs).
- **Firebase:** rules + indexes deployed via CLI
  (`npx firebase deploy --only firestore:rules,firestore:indexes,storage:rules`).
- **Stripe:** webhook endpoint configured to `/api/webhooks/stripe`.
- **LiveKit:** egress + S3 configured for recordings.

See [SETUP.md](./SETUP.md) for the full decision log and [SECURITY.md](./SECURITY.md)
for the security policy.
