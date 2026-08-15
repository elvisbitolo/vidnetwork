# VidNetwork — Current State

**What exists now, what has been verified, and what is still open.**

> Repository: `elvisbitolo/vidnetwork` · Production: `https://vidnetwork.vercel.app/`
> Last updated: 2026-08-15

## 1. What is built (feature-complete per scope)

### Community & engagement
- Activity feed: posts, threaded comments (realtime), likes, bookmarks,
  pinned posts, image uploads, hashtags, search
- Polls and Q&A posts (anonymous tallies)
- Leaderboard, points, badges, streaks
- Member recognitions (15 pts), configurable **welcome checklist**
- Notifications: in-app center + unread badge, email, web push (VAPID/PWA)

### Learning
- Courses with modules/lessons, video + text lessons, drip release (`releaseAt`)
- Progress tracking + "continue learning" resumption

### Events
- RSVPs with capacity enforcement, recurring events, ICS export, email reminders

### Live video
- Conference + broadcast rooms (LiveKit), in-room chat
- Scheduled rooms locked until `opensAt`
- Recordings (Egress → S3) with optional transcription (Deepgram/OpenAI)

### Monetization
- Standard/Premium subscription tiers (monthly/yearly), trial, billing portal
- One-time purchases; promo codes; payment automations
- Host income dashboard (MRR, tier split, one-time revenue, promo usage)

### Host/admin tooling
- Content management (rooms, courses, events, groups, spaces), collections,
  member management, moderation queue (reports), analytics, automations,
  settings — all behind a server-gated `/admin` layout

## 2. Verification status

| Check | Result |
|---|---|
| `npm run lint` | 0 errors (4 pre-existing warnings) |
| `npm test` | **129 tests pass** |
| `npm run build` | Succeeds (49 static pages; admin pages dynamic) |
| CI (GitHub Actions) | lint → test → build on every push/PR |
| Firestore rules | Compiled & **deployed** |
| Firestore indexes | 6 composite indexes **deployed** |
| Storage rules | Reviewed, deny-all default in place |
| Webhooks | Stripe + LiveKit signature-verified, idempotent |

## 3. Production hardening completed

- Webhook purchase completion: amount verification, **auto-refund** on
  mismatch, `charge.refunded` revokes access
- Firestore composite indexes for chat, RSVPs (per occurrence), reports,
  recordings
- Timestamp serialization everywhere (`serialize.js`) — no "Invalid Date"
- **Email verification required** before a session is created (login/signup UX
  with resend)
- Silenced `.catch` failures replaced with structured `logError`
- Pure rate-limit core + `Retry-After` header; pure serialization core
- Admin page shells gated by a server-side `/admin/layout.js`
- Post text (5000), comments (2000), image URL (http/https, ≤2048) validated
  server-side **and** mirrored in Firestore rules
- Dashboard "continue learning" sort fixed (uses progress `updatedAt`)

## 4. Known gaps / open items (non-blocking)

1. **Native mobile apps** — currently responsive web + PWA push only.
2. **Scoped host/moderator assignment** — roles are global, not per-content-area.
3. **Member discovery depth** — profile filters are basic.
4. **Multi-community / multi-tenant** — single community by design.
5. **Rate limiter is in-memory** — per-instance; fine on one Vercel lambda,
   should be shared storage (e.g. Redis/Upstash) if scaled horizontally.
6. **Post/comment edit UI** — server + rules support author edits of
   text/imageUrl, but there is no front-end affordance yet.

## 5. Change history (recent)

| Date | Change |
|---|---|
| 2026-08-15 | Production-hardening pass (webhooks, indexes, serialization, email verification, validation, gating) + docs |
| 2026-08-14 | Monetization: payment automations, promo codes, income dashboard, collections, discovery, welcome checklist |
| 2026-08-13 | Audit + remediation; purchases & hardening; trust pages |
| 2026-08-12 | Core community product (feed, rooms, courses, events, groups, chat, gamification) |

## 6. Where to look next

- [PRD.md](./PRD.md) — requirements & roadmap
- [PRODUCTION-AUDIT.md](./PRODUCTION-AUDIT.md) + [REMEDIATION-REPORT.md](./REMEDIATION-REPORT.md) — audit evidence
- [gap-analysis.md](./gap-analysis.md) — feature coverage vs. Mighty Networks
