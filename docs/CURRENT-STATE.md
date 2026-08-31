# Yarnery Lounge — Current State

**What exists now, what has been verified, and what is still open.**

> Repository: `elvisbitolo/yarnerylounge` · Production: `https://yarnerylounge.vercel.app/`
> Last updated: 2026-08-30

## 0. Open access (current model)

- Anyone who signs up becomes a member and gets **full role-based access** —
  there are no purchase gates. Paid tiers were removed in the migration;
  transactions are planned later via **Shopify**.
- Roles (`member` / `moderator` / `owner`, plus scoped hosts) gate admin and
  moderation features server-side.
- Auth flow: signup creates the profile and jumps to `/dashboard`; signing in
  with an unknown account redirects to `/signup`; email must be verified
  before a session is created.

## 1. What is built (feature-complete per scope)

### Community & engagement
- Activity feed: posts, threaded comments (realtime), likes, bookmarks,
  pinned posts, hashtags, search
- Polls and Q&A posts (anonymous tallies)
- Leaderboard, points, badges, streaks
- Member recognitions, configurable **welcome checklist**
- Notifications: in-app center + unread badge, email, web push (VAPID/PWA)

### Learning
- Courses with modules/lessons, video + text lessons, drip release
- Progress tracking + "continue learning" resumption (no purchase gate)

### Events
- RSVPs with capacity enforcement, recurring events, ICS export, email reminders

### Live video
- Conference + broadcast rooms (LiveKit), in-room chat
- Scheduled rooms locked until `opensAt`
- Room music via uploaded audio files

### Members
- `/members`: organic Mighty-Networks-style avatar canvas with deterministic
  placement (sizes vary by activity + tenure, no member hidden behind another,
  canvas grows as members join, responsive across devices) + hover profile card
  and "Members like you" mini-canvas

### Host/admin tooling
- Content management (rooms, courses, events, groups, spaces), collections,
  member management, moderation queue (reports), analytics, announcements,
  settings — behind a server-gated `/admin` layout
- **Scoped hosts**: per-content-area host/co-host assignments with ancestor
  inheritance; staff always full powers
- **Host tools** (`/host`): scoped hosts get their own dashboard to open
  rooms, create rooms in the spaces/groups they host, and announce to members
- **Room creation (non-coder)**: schedule, type, audience, host/co-hosts —
  no LiveKit concepts exposed

## 2. Verification status

| Check | Result |
|---|---|
| `npm run lint` | 9 errors + 15 warnings (**pre-existing migration baseline**; unchanged by recent work) |
| `npm test` | **140 tests pass / 0 fail** |
| `npm run dev` | Serves; all routes compile |
| Smoke (unauthenticated) | `/` 200 · `/signup`/`/explore` 200 · admin/`/api/me` 401-derived · `/pricing`/`/recordings` 404 |
| Firestore rules | Compiled; morphed to open model (no subscription/tier checks) |
| Payments | None (Stripe removed); Shopify planned |

## 3. Storage & uploads

- Profile photos: client-resized → `/api/upload` → **Vercel Blob** public URL
  stored in Firestore (`users.photoURL`). If `BLOB_READ_WRITE_TOKEN` is not
  set, the same route returns a base64 data URL stored in Firestore instead.
- Room music: base64 stored in `musicFiles` (≤750 KB) pending a future Blob
  migration.
- Known trade-off: large or numerous binary uploads should move fully to Blob
  (Firestore documents cap at 1 MB).

## 4. Security posture

- **Chat messages encrypted at rest** (AES-256-GCM, `MESSAGE_ENCRYPTION_KEY`
  env var; REQUIRED, send fails closed if missing). Encrypted on write,
  decrypted server-side on read; the realtime chat client polls
  `/api/conversations/[id]/messages` instead of reading Firestore directly.
- **XSS**: article markdown sanitized with DOMPurify; cover images and post
  images validated server-side (`isValidImageUrl`); message attachments allow
  a MIME whitelist + require the payload to match its declared type.
- **Headers** (every response): CSP, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`.
- **Session**: origin-vs-host check blocks CSRF-style requests; per-IP and
  per-account rate limits on token exchange.
- **Rate limits** added to message send/read, posts, uploads, search, comments,
  votes, RSVPs, livekit, recognitions, articles. (In-memory; fine on one
  lambda.)
- App-level `error.js` + `not-found.js` give graceful recovery instead of bare
  500s; `/api/purchases` endpoint restored; `serialize()` handles
  GeoPoint/Blob/DocumentReference.

## 5. Known gaps / open items (non-blocking)

1. **Payments/Shopify** — planned, nothing shipped yet (`SHOPIFY_ACCESS_TOKEN`
   placeholder only).
2. **Music uploads on Blob** — still Firestore base64 today.
3. **Native mobile apps** — responsive web + PWA push only.
4. **Scoped host UI breadth** — full content editing for scoped hosts still
   flows through staff.
5. **Member discovery depth** — profile filters are basic.
6. **Rate limiter is in-memory** — fine on one Vercel lambda; needs shared
   storage (Redis/Upstash) if scaled horizontally.
7. **Post/comment edit UI** — server + rules support author edits; no
   front-end affordance yet.
8. **Authorization/group B parity** — a few reconstructed modules (analytics,
   rsvps, rooms, announcements, host-assignments, livekit token, webhooks)
   are semantic restorations; the original production tree should be diffed.

## 5. Change history (recent)

| Date | Change |
|---|---|
| 2026-08-30 | Open-access model enforced (no purchase gates), auth flow signup/no-account redirects, members avatar canvas redesign, dashboard theme picker mobile fixes, pricing UI removed, Vercel Blob uploads wired |
| 2026-08-15 | PRD execution + production-hardening passes (see previous revisions) |
| 2026-08-14 | Monetization items (since removed in migration) |
| 2026-08-12 | Core community product (feed, rooms, courses, events, groups, chat, gamification) |

## 6. Where to look next

- [PRD.md](./PRD.md) — requirements & roadmap
- [ARCHITECTURE.md](./ARCHITECTURE.md) — how the software works
- [gap-analysis.md](./gap-analysis.md) — feature coverage vs. Mighty Networks