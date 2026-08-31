# Yarnery Lounge — Architecture

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
        │                    (requireUser / requireOwner / requireModerator …)
        ▼
src/lib/server/*        →  business logic: Firestore (Admin SDK), LiveKit,
                           Vercel Blob uploads, Resend email, Web Push
        │
        ▼
External services: Firebase (Auth/Firestore) · LiveKit · Vercel (host + Blob) · Resend
```

## 2. Code layout

| Path | Contents |
|---|---|
| `src/app/**/page.js` | Pages (server or client components) |
| `src/app/**/route.js` | API routes (colocated with their pages) |
| `src/components/` | Shared client components (`Nav`, `DashboardThemePicker`, …) |
| `src/lib/firebase/` | Client + Admin SDK initializers |
| `src/lib/server/` | Server-only business logic |
| `src/lib/server/*-core.js` | **Pure** logic, no I/O — the unit-testable core |
| `src/lib/server/__tests__/` | `node:test` suites (140 tests) |
| `src/proxy.js` | Edge middleware (cookie-presence gating for protected routes) |
| `firestore.rules`, `firestore.indexes.json` | Firebase security + indexes |
| `vercel.json` | Vercel cron schedule |

### Rule of thumb
- **Pure decisions** (validation, gating, state transitions) live in
  `*-core.js` and are unit tested.
- **I/O** (Firestore, Blob, email, LiveKit) lives in the non-core server
  modules and API routes.
- **Clients may read** with the Firebase SDK (realtime); **clients never
  write** directly to sensitive collections — all writes go through API routes.

## 3. Auth & sessions

1. Member signs in with Google or email/password (Firebase Auth, client SDK).
2. The client exchanges the idToken for an **httpOnly session cookie**
   (`POST /api/auth/session`). The server verifies the token and **requires a
   verified email** before issuing a session.
3. If no profile exists yet:
   - with a `name` (from signup) → the profile is auto-created and the member
     lands on `/dashboard` (`isNewUser`);
   - without a `name` (from login) → `409 no_account` and the login page
     redirects to `/signup`.
4. The cookie is sent on every request; the edge middleware gates protected
   routes and server components/API routes resolve the user via
   `getCurrentUser()`.
5. Roles come from `users/{uid}.role` (`member | moderator | owner`) plus
   scoped host assignments.

## 4. Data model (Firestore)

| Collection | Purpose | Written by |
|---|---|---|
| `users/{uid}` | Profile + role (+ `photoURL` blob URL or data URL) | Server (self-updates via API) |
| `posts/{id}` + `comments` | Feed posts, comments, polls | API |
| `pollVotes/{id}` | Anonymous poll votes | API |
| `rooms/{id}` | Live/broadcast rooms | Owner (admin API) |
| `roomEvents/{id}` | Room join activity | Client (whitelisted) |
| `musicFiles/{id}` | Uploaded room music (audio data URL or blob URL) | API |
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
| `automations/{id}` | Engagement automations | Owner (admin API) |
| `hostAssignments/{id}` | Scoped host/co-host rights | Owner (admin API) |
| `announcements/{id}` | Community/space/group/room broadcasts | Staff or scoped host |
| `auditLogs/{id}` | Admin audit trail | Server |

## 5. Gating model

1. **Server guards** (`src/lib/server/authorize.js`) — the authoritative
   boundary: `requireUser`, `requireGroupMember`, `requireOwner`,
   `requireModerator`, and the scoped-host guards.
2. **Firestore rules** — backstop direct client access. There are no active-
   subscription/tier predicates (`isActiveSub` ≡ `isNotSuspended`); any
   authenticated member gets full community access, with staff/host-only
   leaves gated to roles.

Access specifics per resource: see [ROLES.md](./ROLES.md) and
[AUTHORIZATION-MATRIX.md](./AUTHORIZATION-MATRIX.md).

## 6. Payments (planned — Shopify)

- No purchase flows exist yet. A `SHOPIFY_ACCESS_TOKEN` placeholder is defined
  in `.env.example`; transactions will be added on Shopify later.

## 7. Uploads (Vercel Blob)

1. The client resizes the image and posts it as `multipart/form-data` to
   `POST /api/upload?kind=avatar` (auth required, size/mime validated).
2. When `BLOB_READ_WRITE_TOKEN` is set, the file is stored in a **Vercel Blob**
   store and the public URL is returned.
3. Without a token, the route **falls back** to returning a base64 data URL
   (stored in Firestore), preserving the old behavior.
4. The returned URL/data URL is saved to `users.photoURL` via `PATCH /api/me`.

## 8. Live video flow (LiveKit)

1. Room pages call `POST /api/livekit/token` — guarded by role/space/group
   membership (+ `opensAt` lock for scheduled rooms).
2. The client joins with a short-lived access token.
3. Broadcast rooms use one-to-many egress; conference rooms allow N-way video.
4. Room music streams user-uploaded audio stored in `musicFiles`.

## 9. Background jobs (Vercel cron)

| Cron | Schedule | What it does |
|---|---|---|
| `event-reminders` | daily 12:00 | Email reminders for events within 24h (marks `reminded` only after send) |
| `scheduled-questions` | hourly | Publish owner-scheduled community questions |

Protected by `CRON_SECRET` bearer auth.

## 10. Realtime

Client SDK subscriptions (`onSnapshot`) power the feed, comments, chat and
leaderboard. Reads respect Firestore rules; writes to realtime-sensitive
collections (e.g. chat `messages`) are server-authored to avoid rule bypass.

## 11. Testing & CI

- `npm test` runs `node:test` on `src/lib/server/__tests__/**` (140 tests).
- GitHub Actions `.github/workflows/ci.yml` runs `lint → test → build` on every
  push/PR (Node 24).
- `npm run lint` currently reports a **known pre-existing baseline** of 9 errors
  + 15 warnings (mostly React-compiler `setState-in-effect` and ambient-audio
  issues) — unchanged by recent work and tracked in `CURRENT-STATE.md`.

## 12. Deployment

- **App + Blob:** Vercel (`vercel.json` defines the cron jobs). Create a Blob
  store in the dashboard and add `BLOB_READ_WRITE_TOKEN` to the environment.
- **Firebase:** rules + indexes deployed via CLI
  (`npx firebase deploy --only firestore:rules,firestore:indexes`).
- **LiveKit:** used for live rooms only (no recording pipeline).

See [SETUP.md](./SETUP.md) for the full decision log and [SECURITY.md](./SECURITY.md)
for the security policy.