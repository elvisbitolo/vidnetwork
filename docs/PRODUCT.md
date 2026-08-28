# Yarnery Lounge — Product Overview

> **Tagline:** Connect, learn and grow together.
>
> A single-community membership platform: paid members get live video rooms,
> courses, events, groups, chat and an activity feed — with the Host owning
> content, engagement and revenue.

## Vision

Yarnery Lounge gives one creator/organization (the **Host**) the tools to run a
profitable paid community the way large platforms (e.g. Mighty Networks) do —
without leaving their own stack. It is deliberately built as a **web
application** (responsive + PWA) rather than native apps, so members join in a
browser with no app-store friction.

## Positioning

- **What it is:** a paid, invite-scoped community with live interaction, cohort
  learning, and engagement mechanics.
- **Who it is for:** creators, educators, coaches and membership businesses who
  want recurring revenue from a community, not just content delivery.
- **What differentiates it:**
  - Real-time **live video** rooms (not just recorded content) for paid members.
  - **Monetization built in** — subscriptions, one-time purchases, promo codes
    and purchase-triggered automations, all tracked in an income dashboard.
  - **Engagement systems** — points, badges, leaderboard, recognitions and a
    configurable welcome checklist that nudges new members to activate.

## Core value pillars

| Pillar | What members experience |
|---|---|
| **Live together** | Join video rooms — conferences and one-to-many broadcasts — with in-room chat and recordings. |
| **Learn at your own pace** | Courses with structured lessons, drip release and completion tracking. |
| **Meet on a schedule** | Events with RSVPs, recurring occurrences and reminders. |
| **Belong to sub-communities** | Spaces and groups with their own feed, rooms and members. |
| **Stay engaged** | Feed, likes, polls, Q&A, leaderboard, badges, recognitions, notifications. |
| **Pay once, smoothly** | Subscription tiers, purchases, coupons and a billing portal. |

## Feature map

### Community & engagement
- Activity feed with realtime posts, comments, likes, bookmarks, pinned posts, image uploads, hashtags and search
- Polls and Q&A posts
- Leaderboard, points, badges, streak tracking
- Member recognitions (15 pts), welcome checklist (configurable steps)
- Notifications: in-app center, email, web push (VAPID service worker)

### Learning
- Course catalog with modules and lessons
- Video lessons (YouTube / MP4 embed) and text lessons
- Drip content via `releaseAt`
- Progress tracking with "continue learning" resumption

### Events
- Scheduled events with RSVP and capacity enforcement
- Recurring events (daily/weekly/monthly) per occurrence
- ICS calendar export and email reminders (cron)

### Live video
- LiveKit rooms: conference + broadcast (host publishes, members watch)
- Room access gated server-side (subscription, tier, space/group membership)
- Egress recordings stored in S3 with optional transcription
- Scheduled rooms locked until `opensAt`

### Monetization
- Two subscription tiers (Standard / Premium), monthly and yearly
- 14-day card-free trial, PayPal via Stripe
- One-time purchases (courses, events, spaces) per tier
- Promo codes (coupons) for subscriptions and purchases with usage tracking
- Automations triggered by `purchase`, `new_member`, `new_post`,
  `event_rsvp`, `checklist_complete` and more (e.g. `add_member_to_space`)
- Host income dashboard: MRR, tier breakdown, one-time revenue, promo usage

### Host/admin tooling
- Content management: rooms, courses, events, groups, spaces
- Moderation: reports queue, resolve or delete content, member moderation
- Member management and role assignment
- Analytics, income and settings dashboards
- Audit logging and rate limiting

## Business model

- **Recurring revenue** from member subscriptions (primary).
- **Upsell** via one-time premium content purchases.
- **Promotions** through discount codes.
- Host owns the member base and data; no per-seat fees to the platform itself.

## Reliability & security posture

- Server-side authorization is the security boundary; Firestore/Storage rules
  backstop direct client access (see [ROLES.md](./ROLES.md) and
  [SECURITY-MATRIX.md](./SECURITY-MATRIX.md)).
- Webhooks (Stripe, LiveKit) are idempotent, with failure + refund handling.
- Composite indexes and rules deployed to Firebase as part of setup.
- CI runs lint, 129 unit tests and a production build on every push.

## Roadmap / known gaps

- Native mobile apps (currently responsive web + PWA push).
- Scoped "host"/moderator assignment per content area (roles are global today).
- Async video (on-demand replays) beyond room recordings.
- Deeper member discovery filters.
- Multi-community / multi-tenant support (currently single community).

## Success metrics

- Activation: new members completing the welcome checklist
- Retention: recurring RSVPs, course completions, weekly active participation
- Revenue: MRR, subscription conversion, purchase attach rate
- Engagement: live-room participation, posts/comments, recognitions
