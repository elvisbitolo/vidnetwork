# Gap Analysis — Community App vs. Mighty Networks

Reference: Mighty Networks core product surface (2025-2026): paid memberships,
activity feed, live video/livestream, events with RSVP, courses/lessons,
sub-spaces (groups), member directory, group + direct chat, in-app + email
notifications, member rewards/badges, search, and admin/moderation tooling.

## 1. What the app now has (post gap-closing pass)

| Area | Detail |
|---|---|
| Paid membership | Membership tiers sold on **Shopify** (Flirting / Hooking Up / Moving In), monthly & yearly; app reads `subscriptions/{uid}` for status (active / overdue / ended) — Stripe removed |
| Auth | Google + email/password, httpOnly session cookie (14d), forgot-password |
| Live video rooms | LiveKit rooms with prejoin, video conference + in-room chat, gated at token API |
| **Livestream / broadcast** | **Broadcast rooms** (one-to-many: host publishes, members watch as viewers) with **recordings** via LiveKit Egress → S3, recordings list page |
| Activity feed | Posts + threaded comments (realtime), **likes**, **image upload**, **pinned posts**, **search**, delete own/owner |
| **Courses** | Catalog, modules/lessons, **video lessons (YouTube/MP4 embed)**, **drip content** (releaseAt locking), completion tracking + progress bar |
| **Events** | Scheduled events with RSVP, **recurring events** (daily/weekly/monthly), **calendar export (ICS)**, **email reminders** (cron), capacity enforcement |
| **Groups / sub-spaces** | Sub-communities with join/leave, **group-scoped feed and group video rooms**, owner admin |
| Member directory | Profile cards: name, headline, location, bio; owner badge |
| **Notifications** | In-app center + bell with unread badge, **web push notifications** (service worker + VAPID) |
| Account hub | Profile editor, welcome checklist, subscription management, logout |
| Admin | Owner-only rooms (incl. broadcast), events, courses, groups |
| Security | Locked Firestore rules; server-side session + subscription + **tier** gating |

## 2. Remaining gaps (optional / lower priority)

1. **Chat/DM** — persistent group chat and 1:1 DMs outside of a live room.
2. **Member discovery depth** — profile pages, member search filters.
3. **Moderation tooling** — member list management, post/comment moderation queue, reports.
4. **Rewards/badges & polls/Q&A** — gamification and lightweight engagement formats.
5. **Native mobile apps** — web responsive only (PWA push notifications cover alerts).

## 3. New data model additions (from the closing pass)

```
recordings/{id}        → roomId, roomSlug, roomName, egressId, filepath, status, startedAt, endedAt, createdBy
pushSubscriptions/{uid} → userId, endpoint, keys, updatedAt
courses/{courseId}     → + requiredTier: standard|premium
lessons/{lessonId}     → + kind: text|video, videoUrl, releaseAt
rooms/{roomId}         → + groupId, kind: standard|broadcast
events/{eventId}       → + recurrence { freq, interval, count }
rsvps/{eventId_uid}    → + occurrenceId, email
```

Access model mirrors existing rules: reads for signed-in members with an
active subscription; writes server-side (Admin SDK) or owner-only.
