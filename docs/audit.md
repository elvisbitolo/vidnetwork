# VidNetwork — Critical Product & Engineering Audit + Improvement PRD

**Repository:** `elvisbitolo/vidnetwork`  
**Production:** `https://vidnetwork.vercel.app/`  
**Audit date:** 2026-08-13  
**Perspective:** External client + product owner + senior software engineer

---

## 1. Executive Summary

VidNetwork is substantially more advanced than its public landing page suggests. The repository implements a membership/community product spanning:

- Firebase Authentication
- Server-side Firebase session cookies
- Firestore
- Stripe subscriptions
- PayPal support
- LiveKit video rooms
- Broadcast/live-stream rooms
- LiveKit Egress recordings
- Activity feed
- Comments and likes
- Courses and video lessons
- Drip content
- Events and recurring events
- RSVP and calendar export
- Groups/sub-communities
- Member directory
- Notifications
- Web push
- Owner/admin tooling
- Moderation and member suspension

The product is therefore no longer best described as "a paid video chat website." It is closer to a **membership-based community, learning, events and live-video platform**.

### Overall verdict

**Product concept:** Strong  
**Feature breadth:** Very strong  
**Architecture:** Good for an MVP/early-stage SaaS  
**Security foundation:** Good, but requires hardening  
**Production readiness:** Not yet at a level I would confidently sell at scale without a hardening pass  
**Documentation:** Significantly behind the implementation  
**UX/product positioning:** Under-communicates the actual product value  
**Highest priority:** Reliability, authorization consistency, observability, testing, billing edge cases, moderation, and production operations — not more feature accumulation.

---

# 2. Scope and Evidence

This audit was based on:

1. The public deployed application.
2. The GitHub repository structure.
3. `package.json`.
4. `docs/setup.md`.
5. `docs/gap-analysis.md`.
6. `firestore.rules`.
7. Server authentication/session implementation.
8. Subscription state implementation.
9. LiveKit token generation.
10. Stripe webhook handling.
11. LiveKit webhook handling.
12. Admin member management.
13. Course API implementation.

Where implementation could not be conclusively verified from the inspected files, the finding is explicitly marked as a recommendation or verification item rather than a confirmed defect.

---

# 3. Current Architecture

## Core stack

| Layer | Current implementation |
|---|---|
| Framework | Next.js 16.3 App Router |
| UI | React 19 |
| Language | JavaScript |
| Styling | CSS Modules |
| Authentication | Firebase Auth |
| Server sessions | Firebase Admin session cookies |
| Database | Firestore |
| Video | LiveKit |
| Payments | Stripe + PayPal support |
| Deployment | Vercel |
| Notifications | Web Push + email provider |
| Recordings | LiveKit Egress + S3 |
| PWA | Service worker |

The project intentionally uses JavaScript and CSS Modules rather than TypeScript/Tailwind.

---

# 4. Product Audit — Client Perspective

## 4.1 What is strong

### A. The product has a real business model

There are Standard and Premium membership concepts, recurring billing, trials, billing management, and tier-based content.

This is much stronger than a portfolio demo.

### B. The product has multiple reasons to return

A member can:

- Join live rooms.
- Read/write community posts.
- Attend events.
- RSVP.
- Learn through courses.
- Join groups.
- Watch recordings.
- Receive notifications.

This creates the possibility of recurring engagement instead of a one-use video call product.

### C. Live video is integrated into the wider product

LiveKit is not isolated as a standalone demo. Rooms are connected to membership and group concepts.

### D. The admin model exists

The owner can manage rooms, courses, events, groups and members.

This matters commercially because the client should not need a developer for every content update.

---

# 5. Major Product Problems

## P0 — Product positioning is too narrow

The landing page makes VidNetwork look primarily like a video-room product.

The actual platform is much broader.

### Recommendation

Reposition the product around:

> **A private membership community for live learning, events, conversations and premium content.**

Video should be one of the core interaction modes, not the entire identity.

### Suggested homepage hierarchy

1. Hero — what the community helps members accomplish.
2. Live rooms.
3. Community feed.
4. Courses.
5. Events.
6. Groups.
7. Recordings.
8. Membership tiers.
9. Social proof.
10. FAQ.
11. CTA.

---

## P0 — The product currently has too many feature surfaces without a clear member journey

Feature breadth can become cognitive overload.

A first-time member needs a clear journey:

```text
Sign up
  ↓
Choose membership / trial
  ↓
Complete profile
  ↓
See onboarding checklist
  ↓
Discover community
  ↓
Join first group
  ↓
Join first live room
  ↓
Attend an event
  ↓
Start a course
```

### Recommendation

Make onboarding outcome-driven rather than feature-driven.

---

## P1 — Community retention mechanics are incomplete

The current feature set has posts, groups, events, courses and notifications, but the remaining gap analysis itself identifies:

- deeper moderation
- member discovery
- rewards/badges
- polls/Q&A
- richer chat/DM

These should be prioritized according to the actual community's use case, not blindly copied from competitors.

---

# 6. Engineering Audit

## 6.1 Authentication — GOOD

The application uses a server-side HTTP-only session cookie.

`getCurrentUser()` verifies the Firebase session cookie and checks whether the account is suspended.

This is a strong foundation.

### Positive

- Session is not stored as a readable localStorage token.
- Server verifies the session.
- Revocation checking is used.
- Suspended users are rejected at the server layer.

### Recommendation

Add explicit automated tests for:

- expired session
- revoked session
- suspended account
- deleted Firebase account
- malformed cookie
- session refresh
- concurrent login/logout

---

# 7. Authorization — GOOD FOUNDATION, BUT INCONSISTENT

This is the most important technical area to harden.

The application has multiple authorization mechanisms:

```text
Firebase rules
+
Server session checks
+
Subscription checks
+
Role checks
+
LiveKit token checks
```

This is powerful, but it also creates a risk:

> A feature can be secure while another feature accidentally trusts authentication without checking membership/tier.

The project documentation correctly states that proxy/middleware is not the security boundary.

That is good architecture.

However, authorization should be standardized into reusable server functions rather than repeated ad hoc checks.

### Recommended authorization API

Create a consistent server authorization layer:

```js
requireUser()
requireActiveMember()
requireTier("standard")
requireTier("premium")
requireOwner()
requireModerator()
requireGroupMember(groupId)
```

Every protected server action/API route should use one of these.

---

# 8. Firestore Rules — CRITICAL REVIEW

The Firestore rules are substantially locked down, which is good.

Important strengths:

- Subscription documents cannot be client-written.
- Owner-only resources are protected.
- User self-edit fields are constrained.
- Reports are moderator-readable.
- Conversations require participant membership.
- Server-written collections are explicitly blocked from client writes.

However, there are several areas that deserve hardening.

## Finding A — Room reads are broader than membership access

The rule currently permits signed-in users to read room documents:

```text
match /rooms/{roomId} {
  allow read: if isSignedIn();
}
```

The actual LiveKit token API performs the stronger subscription check, so the video room itself is protected.

However, this creates an authorization mismatch:

```text
Firestore metadata → any authenticated user
LiveKit access     → active subscriber
```

### Recommendation

Decide deliberately whether room metadata should be:

- public to authenticated users, or
- visible only to active members.

If the business requirement is members-only rooms, enforce that consistently.

---

## Finding B — Some resources use active subscription while others use only authentication

The rules show different access policies across rooms, groups, events, courses and users.

This can produce confusing states such as:

> "I can see the resource, but I cannot actually use it."

### Recommendation

Define an explicit access matrix.

Example:

| Resource | Visitor | Authenticated | Standard | Premium | Owner |
|---|---:|---:|---:|---:|---:|
| Public marketing | Yes | Yes | Yes | Yes | Yes |
| Member directory | No | No | Yes | Yes | Yes |
| Standard course | No | No | Yes | Yes | Yes |
| Premium course | No | No | No | Yes | Yes |
| Standard room | No | No | Yes | Yes | Yes |
| Premium room | No | No | No | Yes | Yes |
| Admin | No | No | No | No | Yes |

Then make server APIs and Firestore rules conform to that matrix.

---

# 9. LiveKit — STRONG IMPLEMENTATION

The token API is one of the strongest parts of the project.

It:

1. Verifies the session.
2. Finds the room.
3. Checks that the room is active.
4. Checks subscription status.
5. Checks group membership when applicable.
6. Restricts broadcast publishing to the owner.
7. Creates a short-lived token.
8. Binds the token to the room slug.

The 10-minute token lifetime is a sensible security measure.

### Recommended hardening

Add:

- rate limiting to token generation
- audit logging for token issuance
- maximum participant enforcement at application level
- room admission rules
- host transfer
- forced room closure
- moderation actions
- abuse reporting
- participant removal
- mute controls
- reconnect behavior
- graceful degradation when LiveKit is unavailable

---

# 10. Broadcast and Recording — HIGH VALUE, HIGH OPERATIONAL RISK

Recording through LiveKit Egress and S3 is a significant feature.

But recordings introduce:

- storage costs
- privacy obligations
- access control
- deletion requirements
- failed-upload handling
- orphaned recordings
- retention policies

### Required product decisions

Every recording should have:

```text
owner
room
createdAt
startedAt
endedAt
status
storage location
visibility
retention policy
```

Add explicit:

- delete recording
- archive recording
- retention period
- recording disclosure/consent
- failed recording retry
- storage cleanup

---

# 11. Stripe Billing — GOOD FOUNDATION, NEEDS EDGE-CASE HARDENING

The webhook correctly validates Stripe signatures before processing.

Subscription state is server-written into Firestore.

This is correct.

However, production billing requires handling more than the three major subscription events.

### Add handling/testing for

- `invoice.payment_failed`
- `invoice.paid`
- `customer.subscription.paused`
- subscription resumed
- incomplete checkout
- trial ending
- disputed payment
- refund
- chargeback
- customer deletion
- price migration
- plan change
- failed webhook retry
- duplicate webhook delivery

## Idempotency

Webhook handlers must be idempotent.

The system should record processed Stripe event IDs:

```text
stripeEvents/{eventId}
```

Before applying an event:

```text
Does eventId already exist?
    YES → return success
    NO  → process and store eventId
```

This prevents duplicate event delivery from corrupting membership state.

---

# 12. Subscription State Model Needs More Precision

The current subscription document is compact:

```text
status
plan
tier
stripeSubscriptionId
currentPeriodEnd
trialEnd
updatedAt
```

That is enough for an MVP but insufficient for a mature billing system.

### Recommended model

```text
subscription
├── provider
├── providerCustomerId
├── providerSubscriptionId
├── status
├── tier
├── billingInterval
├── priceId
├── currentPeriodStart
├── currentPeriodEnd
├── trialStart
├── trialEnd
├── cancelAtPeriodEnd
├── canceledAt
├── createdAt
└── updatedAt
```

---

# 13. Premium Tier Enforcement — MUST BE TESTED END-TO-END

The codebase has a `requiredTier` concept for courses.

The critical requirement is:

> Premium access must never depend only on frontend hiding/locking.

Every premium resource should be protected server-side.

### Required tests

A Standard user must not be able to:

- fetch premium course data
- fetch premium lesson content
- obtain premium room tokens
- access premium recordings
- invoke premium APIs directly

---

# 14. Admin / Moderation — NEEDS EXPANSION

There is member suspension and role management.

That is a good foundation.

But a production community needs a moderation lifecycle:

```text
Report
  ↓
Moderation queue
  ↓
Moderator decision
  ├── dismiss
  ├── warn
  ├── remove content
  ├── suspend
  └── ban
```

Add:

- moderation reason
- moderator identity
- timestamp
- audit trail
- appeal state
- content removal history

---

# 15. Missing Audit Log

This is a major production gap.

Admin actions should be auditable.

Create:

```text
auditLogs/{id}
```

Example:

```json
{
  "actorId": "uid",
  "action": "member.suspended",
  "targetId": "uid",
  "metadata": {},
  "createdAt": "timestamp"
}
```

Track:

- role changes
- suspensions
- room creation/deletion
- course publication
- event changes
- recording deletion
- moderation decisions
- billing overrides

---

# 16. Reliability / Observability — HIGH PRIORITY

The application currently needs a proper production observability layer.

Add:

- structured server logs
- request IDs
- error tracking
- webhook failure monitoring
- LiveKit failure monitoring
- Stripe webhook monitoring
- Firestore error monitoring
- uptime monitoring
- alerting

Recommended categories:

```text
Authentication
Billing
Video
Database
Notifications
Storage
Admin
```

---

# 17. Testing — BIGGEST ENGINEERING GAP

The documentation reports build/lint smoke tests, but a platform this complex needs much more.

### Required test layers

#### Unit

- subscription state
- tier comparison
- auth helpers
- recurrence calculation
- permission helpers

#### Integration

- Stripe webhook
- LiveKit token API
- RSVP
- course access
- group membership
- notifications

#### End-to-end

```text
Signup
→ trial
→ member dashboard
→ join room
→ leave room
→ attend event
→ RSVP
→ course
→ premium upgrade
→ premium content
```

### Security E2E tests

Attempt direct API access as:

- anonymous user
- authenticated non-member
- Standard user
- Premium user
- moderator
- owner
- suspended user

---

# 18. Performance

Firestore is appropriate for the current product, but watch:

- unbounded feeds
- large member directories
- notification lists
- comments
- recording lists
- admin queries

### Add

- pagination
- cursor-based loading
- lazy loading
- image optimization
- upload size/type validation
- caching where appropriate
- Firestore query cost monitoring

---

# 19. Search

Current search is useful but limited.

A serious community platform eventually needs:

```text
Global search
├── Members
├── Posts
├── Groups
├── Courses
├── Events
└── Recordings
```

Do not build this prematurely. Add it after core retention and reliability are stable.

---

# 20. Mobile Experience

The web application is responsive, but the product is heavily mobile-relevant.

Prioritize:

- mobile room controls
- mobile video layout
- push notifications
- mobile course navigation
- mobile feed composer
- PWA install experience

Native apps should come later.

---

# 21. Documentation

The implementation has evolved far beyond the README.

The README should be completely rewritten.

It should include:

```text
Product overview
Architecture
Feature list
Tech stack
Local setup
Environment variables
Firebase setup
LiveKit setup
Stripe setup
PayPal setup
S3 recording setup
Webhook setup
Cron setup
Security model
Firestore data model
Deployment
Testing
Troubleshooting
```

---

# 22. Recommended Priority Matrix

## P0 — Before serious paid launch

1. Standardize authorization.
2. Add billing webhook idempotency.
3. Add billing failure handling.
4. Add comprehensive security tests.
5. Add audit logs.
6. Add error monitoring.
7. Add rate limiting.
8. Define recording retention/deletion.
9. Verify Premium gating end-to-end.
10. Review all API routes for authorization consistency.

## P1 — Immediately after launch

1. Improve onboarding.
2. Improve member discovery.
3. Moderation workflow.
4. Better notifications.
5. Richer profile pages.
6. Better mobile UX.
7. Search.
8. Analytics dashboard.

## P2 — Growth

1. Badges/rewards.
2. Polls/Q&A.
3. Direct messaging.
4. Community analytics.
5. Creator/admin analytics.
6. Native mobile apps.

---

# 23. PRD — VidNetwork Production Readiness & Growth

## Product Name

**VidNetwork**

## Product Vision

Build a secure, reliable membership platform where communities can combine live video, courses, events, discussions, groups and premium content in one product.

## Problem

VidNetwork already contains many valuable features, but the current implementation risks becoming a collection of features rather than a cohesive, reliable product.

The next phase should focus on:

- trust
- reliability
- security
- member experience
- retention
- monetization correctness

rather than simply adding more functionality.

---

# 24. Goals

### Primary goals

1. Make paid access trustworthy.
2. Make authorization consistent.
3. Make video rooms reliable.
4. Make billing resilient.
5. Make moderation auditable.
6. Make the member journey obvious.
7. Make the platform observable.
8. Establish automated regression/security testing.
9. Improve production documentation.
10. Prepare the platform for real paying users.

### Non-goals

Do not prioritize:

- native mobile applications
- AI features
- complex gamification
- large-scale search infrastructure
- marketplace functionality

until the core platform is stable.

---

# 25. User Roles

## Visitor

Can:

- view marketing pages
- view pricing
- sign up
- log in

## Standard Member

Can:

- access standard rooms
- access standard courses
- join groups
- participate in community
- RSVP to events
- receive notifications

## Premium Member

Can:

- access all Standard features
- access premium courses
- access premium rooms/content
- access premium recordings

## Moderator

Can:

- review reports
- moderate content
- suspend members where authorized

## Owner/Admin

Can:

- manage members
- manage rooms
- manage courses
- manage events
- manage groups
- manage broadcasts
- manage recordings
- manage moderation
- manage membership configuration

---

# 26. Epic 1 — Authorization Architecture

## Requirements

Create centralized authorization helpers:

```js
requireUser()
requireActiveMember()
requireTier("standard")
requireTier("premium")
requireOwner()
requireModerator()
requireGroupMember(groupId)
```

Every protected API route must use these helpers.

### Acceptance criteria

- No premium API relies solely on frontend checks.
- Suspended users cannot access member APIs.
- Standard users cannot access Premium resources.
- Non-members cannot obtain LiveKit tokens.
- Group rooms require group membership.
- Owner-only endpoints reject moderators.

---

# 27. Epic 2 — Billing Reliability

## Requirements

Implement:

- webhook idempotency
- payment failure state
- cancellation state
- trial-ending notifications
- plan-change handling
- billing event audit trail

### Acceptance criteria

- Duplicate webhook delivery produces one state change.
- Failed payment produces a deterministic membership state.
- Cancellation at period end is represented correctly.
- Trial expiration removes access correctly.
- Stripe dashboard state and Firestore state can be reconciled.

---

# 28. Epic 3 — Security & Abuse Prevention

Implement:

- API rate limiting
- upload validation
- request validation
- authorization tests
- suspicious activity logging
- room-token rate limiting
- admin audit logs

### Acceptance criteria

A user cannot bypass permissions by calling APIs directly.

---

# 29. Epic 4 — Video Reliability

Implement:

- connection status
- reconnect UX
- participant moderation
- host controls
- room closure
- token refresh
- graceful error states
- recording failure handling

### Acceptance criteria

If the network temporarily fails, the member receives a clear reconnect state rather than a broken interface.

---

# 30. Epic 5 — Recording Management

Implement:

- recording list
- recording metadata
- visibility
- deletion
- retention
- storage cleanup
- failed recording state
- consent notice

### Acceptance criteria

Every recording has an owner and lifecycle state.

No orphaned recording remains indefinitely.

---

# 31. Epic 6 — Member Onboarding

Create:

```text
Welcome
 ↓
Profile
 ↓
Choose interests/groups
 ↓
Join first group
 ↓
Join first room
 ↓
Discover course
 ↓
RSVP to event
```

### Acceptance criteria

A new member can understand the platform and perform a meaningful action within five minutes.

---

# 32. Epic 7 — Moderation

Implement:

- reports
- moderation queue
- content removal
- warning
- suspension
- audit history
- moderator notes

### Acceptance criteria

Every moderation action is attributable to an administrator and timestamped.

---

# 33. Epic 8 — Observability

Implement:

- error tracking
- structured logs
- webhook monitoring
- uptime checks
- API latency tracking
- LiveKit health monitoring
- billing health monitoring

### Acceptance criteria

A production error can be traced from:

```text
User
→ Request
→ API
→ Service
→ Database/provider
→ Error
```

---

# 34. Epic 9 — Automated Testing

Create test suites for:

### Authentication

- signup
- login
- logout
- expired session
- suspended account

### Billing

- checkout
- trial
- successful payment
- failed payment
- cancellation
- duplicate webhook

### Authorization

- visitor
- member
- Standard
- Premium
- moderator
- owner
- suspended

### Video

- token issuance
- invalid room
- inactive room
- group membership
- broadcast publisher restriction

### Content

- course access
- premium course access
- lesson completion
- event RSVP
- group membership

---

# 35. Epic 10 — Product Analytics

Track:

```text
signup
trial_started
subscription_started
subscription_upgraded
subscription_canceled
room_joined
room_duration
event_rsvp
event_attended
course_started
lesson_completed
post_created
group_joined
notification_clicked
```

Create owner analytics:

- active members
- trial conversion
- churn
- MRR
- ARR
- room attendance
- course completion
- event attendance
- engagement

---

# 36. Data Model Additions

Recommended collections:

```text
auditLogs/{id}
stripeEvents/{eventId}
reports/{id}
moderationActions/{id}
```

Enhance:

```text
subscriptions/{uid}
recordings/{id}
users/{uid}
```

---

# 37. Security Requirements

All server-side protected actions must verify:

```text
Authentication
+
Account status
+
Subscription
+
Tier
+
Resource ownership/membership
+
Role
```

Never trust:

- client-supplied role
- client-supplied subscription state
- client-supplied tier
- hidden UI controls
- frontend route protection

---

# 38. Success Metrics

## Business

- Trial-to-paid conversion
- Monthly recurring revenue
- Monthly churn
- Premium upgrade rate
- Average revenue per member

## Product

- First-room join rate
- Weekly active members
- Event RSVP rate
- Course completion
- Posts per active member
- Group participation

## Reliability

- API error rate
- Video connection failure rate
- Stripe webhook failure rate
- Notification delivery rate
- Mean time to recovery

---

# 39. Definition of Production Ready

VidNetwork should not be considered production-ready for serious commercial scale until:

- [ ] Authorization is centralized.
- [ ] Premium access is tested server-side.
- [ ] Stripe webhooks are idempotent.
- [ ] Payment failure is handled.
- [ ] Rate limiting exists.
- [ ] Admin actions are audited.
- [ ] Recording lifecycle is defined.
- [ ] Error monitoring exists.
- [ ] Security E2E tests exist.
- [ ] Billing reconciliation exists.
- [ ] Video failure/reconnect UX is tested.
- [ ] Backup/recovery procedures are documented.
- [ ] Privacy/recording consent is documented.
- [ ] README and deployment documentation are production-grade.

---

# 40. Final Recommendation

**Do not turn VidNetwork into a bigger feature list yet.**

The product already has enough surface area to be commercially interesting.

The next engineering cycle should transform it from:

> **Feature-rich MVP**

into:

> **Reliable paid SaaS product.**

The winning sequence is:

```text
SECURITY
   ↓
RELIABILITY
   ↓
BILLING CORRECTNESS
   ↓
OBSERVABILITY
   ↓
ONBOARDING
   ↓
RETENTION
   ↓
ANALYTICS
   ↓
GROWTH FEATURES
```

That sequence will create substantially more business value than adding another ten features.
