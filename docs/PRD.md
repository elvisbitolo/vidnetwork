# Yarnery Lounge — Product Requirements (PRD)

**What we want to build.** This document states goals, personas, requirements
and the roadmap. It complements [PRODUCT.md](./PRODUCT.md) (what the product
is today) and [CURRENT-STATE.md](./CURRENT-STATE.md) (what exists now).

## 1. Goal

Deliver a **paid membership community platform** that matches the core
Mighty Networks product surface for a single community, owned and monetized by
a **Host**. Members join in a browser (responsive + PWA), pay to access
community content, and stay engaged through live video, learning, events and
recognition.

### Success criteria
- Member activation: new members complete the welcome checklist.
- Recurring revenue: MRR from subscriptions + attach rate on one-time purchases.
- Engagement: live-room participation, posts/comments, RSVPs, recognitions.
- Owner confidence: admin can see income, analytics and content state at a glance.

## 2. Personas

| Persona | Needs |
|---|---|
| **Host (owner)** | Monetize the community, author content, moderate, understand revenue & growth |
| **Moderator** | Enforce norms, handle reports, manage members without touching billing |
| **Member** | Join live rooms, learn, attend events, belong to groups/spaces, feel recognized |
| **Visitor** | See value (landing, pricing, explore previews) before paying |

## 3. Scope & priorities

Legend: **P0** = core & required · **P1** = expected · **P2** = nice to have.

### Identity & access (P0)
- Sign in with Google and email/password; email verification; password reset.
- httpOnly session cookie; server-side authorization for every action.
- Roles: member / moderator / owner (see [ROLES.md](./ROLES.md)).

### Community surface (P0)
- Activity feed with posts, comments, likes, images, hashtags, search.
- Spaces (sub-communities) and groups with scoped content.
- Member directory with profiles.
- Chat: group conversations + direct messages (realtime).

### Live video (P0)
- Conference rooms and one-to-many broadcast rooms with in-room chat.
- Server-gated room access (subscription, tier, membership, schedule).
- Recordings with retention + optional transcription.

### Learning (P0)
- Courses with modules/lessons; video & text; drip release; progress tracking.

### Events (P1)
- RSVPs with capacity, recurring events, calendar export, reminders.

### Monetization (P0)
- Subscription tiers (Standard/Premium), monthly & yearly, trial, billing portal.
- One-time purchases and promo codes.
- Automations triggered by member/purchase/checklist events.
- Host income & analytics dashboards.

### Engagement (P1)
- Leaderboard, points, badges, streaks, recognitions.
- Welcome checklist (configurable).
- Notifications: in-app, email, web push.

### Moderation & admin (P1)
- Reports queue with resolve/delete, member management, content management.
- Audit logging, rate limiting, platform settings.

## 4. Non-functional requirements

- **Security:** server-side authorization is the boundary; rules backstop
  clients; webhooks verified + idempotent; secrets in env only.
  See [SECURITY.md](./SECURITY.md) & [SECURITY-MATRIX.md](./SECURITY-MATRIX.md).
- **Performance:** realtime feed/chat reads via client SDK; server I/O bounded
  (limit + pagination); recordings/transcripts served async.
- **Reliability:** webhook failure → refund & retry; cron idempotent;
  composite indexes deployed for every compound query.
- **Quality:** lint clean, unit tests for all pure logic, production build
  passes, CI gates every push.
- **Operability:** structured logs (`logError`), audit trail, env-driven config.

## 5. Roadmap

### v1 — Done (see [CURRENT-STATE.md](./CURRENT-STATE.md))
Community, live video, courses, events, monetization, engagement, admin.

### v1.1 — Recommended next (P1/P2)
- Post/comment **edit** UX (server + rules already support it).
- Member discovery filters (location, headline, badges).
- Shared rate-limiter storage (Redis/Upstash) for horizontal scale.
- Scoped host/moderator assignment per content area.

### v2 — Larger bets (P2)
- **Async video** replays beyond room recordings (curated library).
- **Multi-community / multi-tenant** (today: single community).
- Native mobile apps (today: responsive web + PWA push).
- Content scheduling (draft/queue), analytics export (CSV/PDF).

## 6. Out of scope (deliberately)

- Self-serve signup for *new communities* (single-community product).
- Third-party marketplace / discovery across communities.
- Built-in live streaming encoding (outsourced to LiveKit Egress).

## 7. Open questions

1. Do members ever create content (rooms/courses/events), or is authoring
   owner+moderator only?
2. Is multi-currency billing needed, or single-currency (USD) fine?
3. Are native apps required at some point, or is PWA push acceptable long-term?
