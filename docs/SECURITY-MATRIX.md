# VidNetwork — Security Matrix

How each security control is enforced. Server routes use the Admin SDK (bypasses rules); the rules protect direct client access.

| Asset | Client (Firestore rules) | Server (API routes) |
|-------|--------------------------|---------------------|
| `users/{uid}` | read = self or owner; create self-only, role must be `member`; update restricted to profile fields (self) | `getUserDoc` used server-side; `PATCH /api/me` validates (name required, length caps, trim) |
| `subscriptions/{uid}` | read = self; no client writes | Admin SDK only |
| `posts` | read = author or (active sub + space/group membership); create author-only allowed keys; update `affectedKeys` (author: text/imageUrl; moderator: pinned); delete author/moderator | POST/delete via API; like/vote/bookmark/comment all gated by `canAccessPost` |
| `comments` | read/create gated on parent post access; update/delete author/moderator | API creates comments; notifies author; rate-limited |
| `pollVotes` | read = self; write = self only | Votes stored by server in `pollVotes`; posts keep anonymous `pollCounts`/`pollTotal`; double-vote rejected via transaction |
| `rsvps` | read = self or owner; create self-only, whitelisted keys (no `email`); update denied | Server route: transaction, per-occurrence capacity counter, rate-limited |
| `roomEvents` | read = self or owner; create self-only whitelisted keys | Room join writes through client (allowed keys match) |
| `rooms` | read = active sub + membership; write = owner | Token route enforces active sub + space/group membership + tier; rate-limited (uid + IP) |
| `recordings` | read/write denied (server-only) | Page + transcript + download all check `canAccessRecording` (owner/moderator, space member, group member, else active sub); downloads presigned when S3 creds present |
| `modules` / `lessons` | read gated by `canReadCourse` (published course + tier); write owner | Course/lesson routes require owner; progress route `requireActiveMember({ tier })` |
| `storage: posts/*` | read = active sub; create/update = active sub + image content-type/size; delete self or owner | — |
| `storage: lessons/*` | read = active sub + lesson tier check via course; write owner only | — |
| `courses` | read = active sub + published; write owner | Course pages + APIs gate by tier |
| `spaces` / `spaceMembers` | read = active sub (spaces); membership read self/owner, no client writes | Join/leave server routes check tier + invite access; rate-limited |
| `groups` / `groupMembers` | read = signed-in; membership self/owner; no client writes | Server routes |
| `gamification` | read = active sub / self / owner | Server award logic |
| `progress` | read = self; no client writes | Server route, rate-limited |
| `notifications` | read = self; no client writes | Server-created |
| `conversations`/`messages` | read = participant only; no client writes | Server `addMessage` requires membership + rate limit; DM recipient existence checked; names fetched per-conversation (bounded) |
| `reports` | read = moderator; no client writes | Server create, rate-limited |
| `stripeEvents` / `auditLogs` | no access | Server only; webhook uses atomic `create()` claim for idempotency |
| Suspension | `isNotSuspended` gate in `isActiveSub` (blocks reads/actions) | `authorize()` blocks suspended users via `isActiveSub`; owner cannot be suspended |
| Owner protection | role checks in rules | `requireOwner`/`requireModerator`; role changes owner-only; owner role immutable; owner cannot be suspended |
| Rate limiting | — | In-memory `rateLimit` (per-instance); per-route limits documented in `REMEDIATION-REPORT.md` |

## Billing state machine (shared)

`ACTIVE_STATUSES = ["active", "trialing", "past_due"]` — used by `billing.js` (`isActiveSub`) and now by `firestore.rules` (`isActiveSub()`), keeping rules and server consistent. Period end (`currentPeriodEnd`, fallback `trialEnd`) must be in the future; suspension cancels access.
