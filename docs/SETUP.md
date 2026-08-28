# Community App — Setup & Decisions Log

A running journal of *what* was built and *why*, so the reasoning is recorded alongside the code.

## Stack (final)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.3 (App Router, React 19, React Compiler) | Existing scaffold; modern SSR/streaming; CSS Modules already in place |
| Language | JavaScript (no TS) | Client requirement |
| Styling | CSS Modules | Client requirement (no Tailwind) |
| Auth | Firebase Auth | Native Google + email/password; no NextAuth beta risk |
| Database | Firestore (nam5, standard, `(default)`) | Managed, realtime-capable, free tier; no SQL migrations |
| Video | LiveKit Cloud | Open-source WebRTC SFU; React SDK; scales 2→100+ per room |
| Payments | Stripe Subscriptions | Industry standard; webhook-driven state |
| Deploy | Vercel | Simple env + preview deployments |

## Decisions & Why

1. **Firestore `(default)` database, `nam5` (US multi-region), Standard edition**
   - `(default)` is what the Firebase SDK connects to by default; a different ID = silent 404.
   - `nam5` chosen as global-latency default. **Cannot be changed after creation.**
   - Standard edition: automatic indexing + full core query engine. Enterprise (MongoDB compat / pipelines) not needed.

2. **Session cookie, not localStorage token**
   - Client signs in with Firebase, sends the ID token to `POST /api/auth/session`.
   - Server calls `createSessionCookie()` → sets an `httpOnly`, `SameSite=Lax` cookie (14 days).
   - `getCurrentUser()` verifies it on every server request. `httpOnly` = XSS can't steal it.
   - **Post-login redirect is a hard `window.location.assign("/account")`, never `router.replace`.** An `onAuthStateChanged` redirect fires before `createSessionCookie` completes (~1s), so the browser hits `/account` with no cookie yet → proxy 307s to `/login` → Next dedupes the follow-up `router.replace` to the same URL. A full reload guarantees the fresh cookie is sent with the request.

3. **Firestore rules locked server-side (deployed)**
   - `subscriptions/{uid}` is **read-own, write: false** — money state can ONLY be written by the server (Stripe webhook) via the Admin SDK, which bypasses rules.
   - Users self-create only their own `users/{uid}` doc with `role == "member"` (never `owner`); self-update only `name`/`bio`/`headline`/`location`.
   - `rooms` reads for signed-in members; writes owner-only.
   - `events` read for signed-in members; create/update/delete owner-only (via `/api/events`).
   - `rsvps` read for signed-in members; **server-written via `POST /api/rsvps`** (enforces event capacity + notifies the event creator); self-delete only.
   - `posts` + `posts/{id}/comments` read for signed-in members; **server-written via `POST /api/posts` and `POST /api/posts/[id]/comments`** so the server can create notifications + emails; delete own or owner (client-side, rules allow).
   - `notifications`, `progress`, `groupMembers` are **server-written only** (`allow create/update/delete: if false`); users read their own.
   - `courses`/`modules`/`lessons` reads for members with an active sub; writes owner-only via `/api/courses*`.
   - `groups` reads for signed-in members; writes owner-only via `/api/groups*`.
   - `roomEvents` (attendance) create-own/read-own — used by the welcome checklist to detect "joined a room".
   - Community pages (`/members`, `/feed`, `/events`, `/courses`, `/groups`) are gated server-side with `isActiveSub` (same pattern as rooms); rules are the UX backstop, not the security boundary.

4. **proxy.js (Next 16 renamed middleware)**
   - Redirects unauthenticated users to `/login` for UX only.
   - **Not a security boundary** — real checks (session + active subscription) happen in server components and the LiveKit token API.

5. **Trial is one-time, card-free**
   - First subscription only: `trial_period_days: 14` + `trial_settings.end_behavior.missing_payment_method: "cancel"` + `payment_method_collection: "if_required"`.
   - `trial_settings.end_behavior` is **required** by the Stripe API whenever a trial is combined with `payment_method_collection: "if_required"`.
   - Returning/canceled customers get no second trial; checkout collects a card (`"always"`) so the sub activates instead of lingering as `incomplete`.

6. **LiveKit gating at the token API (the real security boundary)**
   - `POST /api/livekit/token` verifies the session cookie **and** `isActiveSub` before minting a token. No token → no room, regardless of what the UI shows.
   - Identity is the Firebase UID; the room is bound to the room's `slug` in the `roomJoin` grant. `ttl: 10m` so a leaked token expires fast.
   - `serverUrl` is returned by the token API (client never needs `LIVEKIT_URL` as a public env var).
   - Chat is LiveKit's built-in data-channel chat inside `<VideoConference />` (no Firestore chat needed).

## Data Model

```
users/{uid}          → name, email, role: member|owner, createdAt, bio?, headline?, location?, notifications? (email opt-out)
subscriptions/{uid}  → status, plan, tier: standard|premium, currentPeriodEnd, stripeSubscriptionId   (server-written)
rooms/{roomId}       → name, slug, description, status, maxParticipants, groupId?, kind: standard|broadcast, createdBy, createdAt
events/{eventId}     → title, description, startTime, endTime?, roomSlug?, capacity?, recurrence?, createdBy, createdAt   (owner-written via API)
rsvps/{eventId_uid}  → eventId, occurrenceId?, userId, name, email, createdAt                      (server-written via API)
posts/{postId}       → authorId, authorName, text, imageUrl?, pinned?, likes, createdAt, groupId?   (server-written via API)
posts/{postId}/comments/{commentId} → authorId, authorName, text, createdAt
roomEvents/{id}      → userId, roomId, roomName, joinedAt                      (written client-side on room join)

courses/{courseId}   → title, description, status: draft|published, requiredTier?, createdBy, createdAt        (owner-written via API)
modules/{moduleId}   → courseId, title, position, createdAt                    (owner-written via API)
lessons/{lessonId}   → courseId, moduleId, title, body, kind: text|video, videoUrl?, releaseAt?, position         (owner-written via API)
progress/{cid_uid}   → courseId, userId, completedLessons[], updatedAt         (server-written via API)

groups/{groupId}     → name, slug, description, status, createdBy, createdAt   (owner-written via API)
groupMembers/{gid_uid} → groupId, userId, name, role, joinedAt                 (server-written via API)

notifications/{id}   → userId, type, actorId, actorName, targetId, href, text, read, createdAt   (server-written via API)
recordings/{id}      → roomId, roomSlug, roomName, egressId, filepath, status, startedAt, endedAt, resultUrl, createdBy   (server-written via API + webhook)
pushSubscriptions/{uid} → userId, endpoint, keys, updatedAt                   (server-written via API)
```

Access rule: `subscriptions/{uid}.status === "active" && currentPeriodEnd > now`.

## Environment Variables (see .env.example)

- Firebase Web: `NEXT_PUBLIC_FIREBASE_*` (from console Project settings → Your apps)
- Firebase Admin: `FIREBASE_SERVICE_ACCOUNT` (full JSON) or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
- LiveKit: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, tier price IDs (`STRIPE_PRICE_STANDARD_MONTHLY/YEARLY`, `STRIPE_PRICE_PREMIUM_MONTHLY/YEARLY`)
- Recordings (LiveKit Egress): `LIVEKIT_EGRESS_S3_REGION/BUCKET/ACCESS_KEY/SECRET` (+ optional `LIVEKIT_EGRESS_S3_PUBLIC_URL`)
- Web push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (generate with `npx web-push generate-vapid-keys`)
- Cron: `CRON_SECRET` (must match `cron.auth.secret` in vercel.json), `NEXT_PUBLIC_APP_URL`

## Remaining Console Setup (manual, 5 min)

1. Authentication → Sign-in method → enable **Email/Password** + **Google**; set support email
2. Project settings → Service accounts → **Generate new private key** → paste into `FIREBASE_SERVICE_ACCOUNT` in `.env.local`
3. Project settings → Your apps → **Add web app** → paste `apiKey` + `appId` into `.env.local`
4. After Vercel deploy: add Vercel domain to Authentication → Authorized domains
5. **Storage** → upload rules from `storage.rules` (posts images <10MB, lessons media, everything else denied); `firebase deploy --only storage`
6. **LiveKit Egress** → create an S3 bucket + access keys, set the `LIVEKIT_EGRESS_S3_*` env vars, and point the LiveKit webhook at `/api/webhooks/livekit`
7. **Stripe** → create prices for each tier (Standard/Premium × monthly/yearly), enable **PayPal** in payment methods, add `/api/webhooks/stripe` to the webhook endpoint
8. **Vercel cron** → set `CRON_SECRET` and add `/api/cron/event-reminders` to Vercel crons (vercel.json ships with `"0 * * * *"` hourly)
9. **Web push** → generate VAPID keys and set the three env vars; the service worker auto-registers on sign-in

## Build Phases

- [x] Phase 1: Firebase init, env scaffolding, locked rules (deployed), auth session flow
- [x] Phase 1b: Auth UI — `/login`, `/signup` (Google + email/password), `/account`, `src/proxy.js` route guard (verified: 307 redirect without cookie)
- [x] Phase 2: Stripe subscriptions (checkout, webhook, portal, gating via `isActiveSub`; content gating enforced at LiveKit token API in Phase 4)
- [x] Phase 3: Rooms CRUD (admin page + owner-only API) + listing page
- [x] Phase 4: LiveKit video rooms (token API + `/rooms/[slug]` page + built-in chat)
- [x] Phase 5: Landing page (replaced create-next-app boilerplate) + pricing page, responsive everywhere, Geist font applied app-wide, forced light theme (no OS-dark mismatch on a light-only UI)
- [x] Phase 6: Community features — member directory (`/members`), discussion feed (`/feed` + comments), scheduled events with RSVPs (`/events` + `/admin/events`), welcome checklist + profile editor (`/account`), shared top nav, `roomEvents` recorded on room join
- [x] Phase 7a: Courses — catalog (`/courses`), course home with module/lesson tree + progress bar, lesson pages with "mark complete" + next/prev, owner builder (`/admin/courses` + `/admin/courses/[id]`)
- [x] Phase 7b: Groups — sub-communities (`/groups`), join/leave, group-scoped feed (`/groups/[slug]`), owner admin (`/admin/groups`)
- [x] Phase 7c: Notifications — in-app center (`/notifications`) + bell with unread badge, server-written on comment/RSVP; email via pluggable Resend provider (logs when unset)
- [x] Phase 8a: **Feed depth** — likes, image uploads to Storage, pinned posts, post search (all server-written)
- [x] Phase 8b: **Group video rooms** — `groupId` + `kind` on rooms, group-gated LiveKit tokens, group room listings
- [x] Phase 8c: **Video lessons + drip** — `kind: video`, `videoUrl`, `releaseAt`; lesson/course pages lock future lessons
- [x] Phase 8d: **Events polish** — recurring events (daily/weekly/monthly), per-occurrence RSVP, ICS export, hourly reminder cron (`/api/cron/event-reminders` + vercel.json)
- [x] Phase 8e: **Broadcast + recordings** — broadcast rooms (viewer mode), LiveKit Egress → S3 recordings, `/recordings` page, LiveKit webhook finalizer
- [x] Phase 8f: **Membership tiers + PayPal** — Standard/Premium tiers, per-tier price IDs, PayPal in checkout, `requiredTier` on courses
- [x] Phase 8g: **Web push** — service worker + VAPID, `/api/push/subscribe`, owner announcement endpoint `/api/push/send`
- [x] Phase 9: Deployed to Vercel (`https://yarnerylounge.vercel.app`)
- [ ] After deploy: run `firebase deploy --only firestore:rules` to ship the new rules (events/rsvps/posts/comments/profile fields + courses/groups/notifications/recordings/pushSubscriptions)
  - No composite Firestore indexes are required: every query uses a single-field filter or sort, with ordering done in application code.

## Verified Working (build mode smoke test)

- `firebase firestore:databases:create "(default)" --location=nam5 --edition=standard` ✅
- Admin SDK connects to Firestore with the service-account key ✅
- `npm run lint` + `npm run build` clean ✅
- `/login`, `/signup` render 200; `/account` without session cookie → `307 → /login` via proxy ✅
- Security rules deployed (closed rules for `subscriptions`, owner-only room writes) ✅

