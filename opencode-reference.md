# opencode-reference.md

Project reference for opencode sessions on this repo. Read this first — it saves a full
re-discovery pass every time. For the full product/engineering audit and PRD, see
[`docs/audit.md`](docs/audit.md) (copy of `Yarnery Lounge_Audit_and_PRD.md`).

## What this is

Yarnery Lounge (`elvisbitolo/yarnerylounge`, live at `https://yarnerylounge.vercel.app`) is a
**membership-based community platform** built for a client (Christa Patel) who asked for a
Mighty-Networks-style product. It is a single Next.js app: paid membership + live video
rooms, courses, events, groups, feed, chat, notifications, recordings.

## Stack (intentional choices — do not change without a client-level reason)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.3 App Router, React 19 | existing scaffold, SSR |
| Language | **JavaScript** (no TypeScript) | client requirement |
| Styling | **CSS Modules** (no Tailwind) | client requirement |
| Auth | Firebase Auth + server session cookie | no NextAuth beta risk |
| DB | Firestore `(default)`, `nam5`, Standard | managed, realtime, no migrations |
| Video | LiveKit Cloud | WebRTC SFU, React SDK |
| Payments | Shopify (external) — tiers sold on the client's store; app reads `subscriptions/{uid}` | no payment gateway in the app |
| Deploy | Vercel | env + previews |

## Conventions to follow

- Plain JS, ESM. Import aliases: `@/lib/...` → `src/lib/...`, `@/components/...`.
- API routes live under `src/app/api/**/route.js` (App Router route handlers).
- Security boundary is the **server**, not Firestore rules or the proxy. `src/proxy.js`
  (Next 16 renamed middleware) is UX-only redirects.
- Money state (`subscriptions/{uid}`) is server-write-only via Admin SDK.
- Post-login redirect must be a hard `window.location.assign`, never `router.replace`.
- No tests existed at session start — this is being fixed (see Roadmap). Tests use the
  built-in `node:test` runner (no new deps), pure logic must live in modules with **no
  external imports** so they can be imported by tests.
- Run checks: `npm run lint`, `npm test`, `npm run build`.

## Key file map

- `src/lib/server/auth.js` — session verification (`getCurrentUser`), `getUserDoc`, roles.
- `src/lib/server/authorize.js` — centralized authorization guards (Epic 1; new).
- `src/lib/server/subscription.js` — sub read + `isActiveSub` (delegates to `billing.js`).
- `src/lib/server/billing.js` — PURE membership-status logic (status mapping, period math).
- `src/lib/server/plans.js` — pure tier helpers (ranks, labels, video rights).
- `src/lib/server/events.js` — event queries + recurrence expansion (pure parts in `events-core.js`).
- `src/lib/server/rooms.js`, `courses.js`, `chat.js`, `groups.js`, `notifications.js`, `email.js`.
- `src/app/api/webhooks/livekit/route.js` — Egress recording finalizer.
- `src/app/api/livekit/token/route.js` — the real video security boundary.
- `firestore.rules` — client-write firewall (UX backstop, not the security boundary).

## Firestore data model (core)

`users/{uid}` · `subscriptions/{uid}` · `rooms/{roomId}` · `events/{eventId}` ·
`rsvps/{eventId_uid}` · `posts/{postId}` (+ `/comments`) · `courses` · `modules` ·
`lessons` · `progress/{cid_uid}` · `groups` · `groupMembers/{gid_uid}` ·
`notifications/{id}` · `conversations/{id}` (+ `/messages`) · `reports/{id}` ·
`recordings/{id}` · `pushSubscriptions/{uid}` · `roomEvents/{id}`.

## Environment (see `.env.example`)

Firebase web + admin, LiveKit (`LIVEKIT_URL/API_KEY/API_SECRET`), Egress S3,
VAPID web-push keys, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, optional `RESEND_API_KEY`.
Payments run on Shopify — no payment keys live in the app.
`.env*` is gitignored; never commit `.env.local`.

## Roadmap (from docs/audit.md — what this session is executing)

Order matters: SECURITY → RELIABILITY → BILLING → OBSERVABILITY → ONBOARDING → RETENTION.

1. **Epic 1 — Centralized authorization** (`src/lib/server/authorize.js`): guards
   `requireUser / requireActiveMember / requireTier / requireOwner / requireModerator /
   requireGroupMember`, applied to every protected route. No premium API may rely on
   frontend checks.
2. **Epic 2 — Membership reliability**: Shopify order → `subscriptions/{uid}` sync
   (paid / overdue / ended), payment-failure / pause / resume / cancel-at-period-end
   handling, richer subscription doc (provider ID, priceId, trial, period end),
   membership-failure notifications.
3. **Epic 3 — Security**: rate limiting (esp. LiveKit token issuance), audit logs,
   upload/request validation.
4. **Epic 4 — Video reliability**: reconnect UX, participant moderation, token refresh.
5. **Epic 5 — Recordings**: retention/deletion/consent lifecycle, storage cleanup.
6. **Epic 8 — Observability**: error tracking, structured logs, webhook/uptime alerting.
7. **Epic 9 — Tests**: unit (billing, tiers, recurrence, permissions) → integration
   (webhooks, token API, RSVP, course access) → E2E security matrix.

### **2026-08-13 — Hardening pass 1 (membership + auth + tests):**
  - Added `docs/audit.md` (imported client audit).
  - Extracted pure membership-status logic to `src/lib/server/billing.js`; `subscription.js` now
    delegates to it. Added `cancelAtPeriodEnd` / `past_due` awareness.
  - Extracted pure recurrence math to `src/lib/server/events-core.js`.
  - Added `src/lib/server/__tests__/` unit tests (billing, plans, events-core) run via
    `npm test` (`node --test`).
  - Added centralized `src/lib/server/authorize.js` and refactored key routes
    (LiveKit token, course progress, admin member/report actions) to use it.
  - **Pass 2 (Epic 3):** in-memory `rate-limit.js` (per-user + per-IP) applied to
    LiveKit token issuance (20/min/user);
    `audit.js` → `auditLogs/{id}` wired into member role/suspend, moderation
    decisions, room/event/course/group creation + room deletion;
    Firestore rules now block client writes to `auditLogs`.
    Refactored remaining owner/moderator routes (rooms, events, courses, groups,
    admin members) onto the central `requireUser/requireOwner/requireModerator`
    guards.
  - **Pass 3 (P0 fixes + observability):** fixed tier-switch double-billing —
    existing active subs are now switched in place (prorated) instead of creating a
    second subscription; `isActiveSub()`/`subscriptionStatus()` helpers
    tested; pricing page + account page reflect tier/switch state. Rate limits
    added to auth/session (per-IP), push/send, livekit/recording; those routes
    moved to `requireOwner`. Added `log.js` structured JSON logging (webhook +
    session errors). Recording lifecycle: `visibility`/`retentionDays` metadata
    on start/finalize, owner DELETE endpoint `/api/admin/recordings/[id]` that
    removes the S3 object (`@aws-sdk/client-s3`) + Firestore doc, delete button
    on `/recordings`, audit entries. Firestore rules (`auditLogs`
    locks) deployed to prod via `firebase deploy --only firestore:rules`.
  - **Pass 4 (AI: transcription):** provider-agnostic STT service
    (`src/lib/server/transcription.js`) — Deepgram (URL or S3 buffer, handles
    large files) or OpenAI Whisper (≤25MB). Auto-triggered on egress completion
    from the LiveKit webhook (fire-and-forget, guarded against duplicate runs),
    manual owner retry via `POST /api/admin/recordings/[id]/transcribe`,
    member transcript endpoint `GET /api/recordings/[id]/transcript`, transcript
    viewer + Transcribe button on `/recordings`, audit + structured logs,
    graceful no-op when `DEEPGRAM_API_KEY`/`OPENAI_API_KEY` unset (recordings
    still work). Env vars documented in `.env.example`.
