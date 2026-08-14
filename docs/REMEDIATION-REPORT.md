# VidNetwork — Remediation Report

Generated during PHASE 3 (HARDEN) of `VIDNETWORK_PRODUCTION_HARDENING_PRD.md`. All changes are in the working tree (uncommitted) unless noted.

## Deployed

- `firestore.rules` — released to `christa-patel` (rules compiled, deployed successfully).

## Not yet deployed / requires setup

- `storage.rules` — authored, but **Firebase Storage is not initialized** on `christa-patel`. Initialize Storage in the console, then run `npx firebase deploy --only storage`.
- Application code changes below are pending commit + `vercel --prod` deploy.

## Changes by finding

### P0
1. **P0-1 user privacy** — rules: `users` read = self or owner.
2. **P0-2 RSVP privacy** — removed `email` from RSVP docs (`api/rsvps/route.js`); `cron/event-reminders` resolves email server-side from `users/{userId}`; new `api/events/[id]/attendees` route; `EventsBoard.js` rewritten off client `onSnapshot` (fetch attendees, refresh after toggle).
3. **P0-3 recordings** — new `lib/server/recordings.js` (`canAccessRecording`, `signedDownloadUrl`, `deleteS3Object`); recording start captures `spaceId`/`groupId`; recordings page filters by access; new `api/recordings/[id]/download` (presigned URL); transcript route enforces access; admin delete returns 501 instead of claiming success when S3 object can't be removed.
4. **P0-4 storage tier gating** — `storage.rules`: lesson reads require active sub + published course + tier (via lesson → course → subscription); posts images gated on active sub + image content/size; owner-only lesson writes.
5. **P0-5 LiveKit token** — added `requireGroupMember` import (was a latent ReferenceError); added space status/membership/tier check when `room.spaceId`; per-uid + per-IP rate limits.
6. **P0-6 post field integrity + membership-aware reads** — rules: posts read = author or active sub + space/group membership; update `affectedKeys` restricted; comments inherit post access.
7. **P0-7 poll voter privacy** — votes moved from the `posts.pollVotes` map to a private `pollVotes` collection (rules: read/write self only). Vote route returns only `{ counts, votedOption }` via a transaction (double-vote → 409). `posts/route.js` initializes `pollCounts`/`pollTotal`; `Feed.js` PollBlock uses `pollCounts` with legacy `pollVotes` fallback.
8. **P0-8 engagement authz** — new `lib/server/posts-core.js` + `lib/server/posts.js` `canAccessPost(postId, uid, userDoc)` applied to like, vote, bookmark, comments routes (post must be readable by the caller).

### P1
- **Rate limits** added: `comment`, `like`, `vote`, `bookmark`, `message`, `report`, `space-join`, `progress`, `rsvp`, `dm`, `livekit-token` (+ IP). In-memory implementation — resets on deploy, not shared across instances (documented limitation).
- **Stripe** — `lib/server/origin.js` `appOrigin(req)` (prefers `NEXT_PUBLIC_APP_URL`) used by checkout and portal for redirect URLs.
- **Webhook idempotency** — atomic `stripeEvents/{id}.create()` claim; duplicate deliveries return early.
- **Billing consistency** — rules `isActiveSub()` now includes `past_due` + suspension + period-end, matching `billing.js`.
- **RSVP capacity race** — join/leave in a single transaction with per-occurrence `capacityCounts` (`lib/server/events-core.js` `applyRsvpCounts`).
- **Cascade deletes** — `lib/server/delete.js` (chunked batch, subcollection delete); `cascadeDeleteSpace` removes rooms (LiveKit ended), events, courses+modules+lessons, posts+comments, members; group delete removes rooms, posts, members.
- **Room lifecycle** — `deleteRoom` ends the LiveKit room (RoomServiceClient) and removes `roomEvents`; rooms DELETE route now 404s unknown rooms.
- **Retention** — `api/cron/recording-retention` (daily 03:00 UTC, `CRON_SECRET`-gated) deletes expired completed/failed recordings incl. S3 object.
- **Admin scale** — overview uses `count()` aggregate (fallback to bounded query).
- **Chat** — `loadNames` bounded to a conversation's participants (max 100 via `getAll`); DM requires an existing user; message POST rate-limited.
- **Owner protection** — admin members route rejects suspending the owner.

### P2
- **PWA** — `public/icon.png` (generated, also 192/512), `public/manifest.webmanifest`, `manifest` + `icons` metadata in `layout.js`; `sw.js` `/icon.png` reference now resolves.
- **CI** — `.github/workflows/ci.yml` (lint, test, build; needs repo secrets for build env).
- **Tests** — added `posts.test.js`, `events-core.test.js`, `profile.test.js`; suite now 54 passing (`npm test`). Coverage: post access authz, like idempotency/toggle, RSVP capacity bounds, profile validation + no-op detection.
- **Profile save** — `lib/server/profile.js` (`normalizeProfile`, `profileChanged`); `PATCH /api/me` uses server-side validation; client shows "No changes to save." and real server errors.

## Verification

- `npm run lint` → 0 errors (4 pre-existing `<img>` warnings).
- `npm test` → 54 pass.
- `npm run build` → compiled successfully.
- `npx firebase deploy --only firestore:rules` → deployed.

## Remaining / deferred

- Storage bucket initialization on `christa-patel`, then deploy `storage.rules`.
- Shared (multi-instance) rate limiting store.
- Backfill `courseId` on legacy lessons and re-check legacy poll posts.
- Email notifications, public trust pages, paid events/courses/spaces, 1:1 DMs, full PWA offline shell — deferred as separate feature work per plan.
