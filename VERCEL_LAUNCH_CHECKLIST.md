# Vercel Team Handoff — Deployment & Environment Checklist

This project is a **Next.js (App Router) + Firebase** community platform. When the client adds you to her **Vercel Team** as a **Developer (or Owner)** and takes over billing, use this checklist so nothing is missed. She owns the paid plan from *her* account; you keep pushing from this repo.

---

## 1. Vercel — team access & billing

- [ ] Client creates/owns a **Vercel Team** and adds you as **Developer** (or Owner) with access to the project.
- [ ] Client applies the **paid plan** (Pro / Hobby-max) to the project from her account. Hobby limits (function memory/timeout, bandwidth, 1 non-production deployment) block several features — this must be upgraded for production.
- [ ] Client adds your **Git repo** (GitHub: `elvisbitolo/yarnerylounge`) and Vercel auto-deploys on push to `main`.
- [ ] Add a custom domain (e.g. `app.secretyarnery.com`) in **Project → Settings → Domains**, and set `NEXT_PUBLIC_APP_URL` to the final public URL.
- [ ] In **Project → Settings → Environment Variables**, add every variable below (Production branch), plus any Preview override you need.

## 2. Environment variables (Production)

Copy these from your local `.env.local` (or generate fresh where noted). **Never** commit these to git.

| Variable | Where it's used | Required? |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | client Firebase init | yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | client Firebase init | yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | client + server | yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | client Firebase init | yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | client Firebase init | yes |
| `FIREBASE_SERVICE_ACCOUNT` | Admin SDK (`admin.js`) — JSON string | yes |
| `FIREBASE_PROJECT_ID` | Admin SDK | yes |
| `FIREBASE_CLIENT_EMAIL` | Admin SDK | yes |
| `FIREBASE_PRIVATE_KEY` | Admin SDK | yes |
| `NEXT_PUBLIC_APP_URL` | links, email, cron base URL | yes |
| `MESSAGE_ENCRYPTION_KEY` | chat encryption (`crypto.js`) — 32-byte base64 key | yes |
| `BLOB_READ_WRITE_TOKEN` | image/cover uploads to Vercel Blob | yes |
| `BLOB_STORE_ID` | Vercel Blob | yes |
| `LIVEKIT_URL` | live video rooms | yes |
| `LIVEKIT_API_KEY` | live video rooms | yes |
| `LIVEKIT_API_SECRET` | live video rooms | yes |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | web push | yes |
| `VAPID_PRIVATE_KEY` | web push | yes |
| `VAPID_SUBJECT` | web push | yes |
| `CRON_SECRET` | `/api/cron/*` + automations bearer token | yes |
| `RESEND_API_KEY` | transactional/DM emails | yes |
| `EMAIL_FROM` | email sender | yes |

> **Payments:** handled on **Shopify** (the client's `secretyarnery.com` store), not in the app. No payment keys are required in the app. Membership status (paid / overdue / ended) is read from `subscriptions/{uid}` — sync Shopify order data into that collection when payments go live.

## 3. External services to verify from the client's accounts

- [ ] **Firebase** — project `christa-patel`. Firestore rules + indexes up to date (see §4). Auth providers enabled (email/magic link, Google).
- [ ] **LiveKit** — a cloud project URL/keys; webhook URL configured to `https://<your-domain>/api/webhooks/livekit`.
- [ ] **Resend** — **domain verified** (`resend.com/domains`). Currently on trial it only sends to `elvisbitolo11@gmail.com`; DM notifications fail with 403 until a real sending domain is verified.
- [ ] **Vercel Blob** — enabled (produces `BLOB_READ_WRITE_TOKEN`).
- [ ] **Shopify** — tier products (Flirting / Hooking Up / Moving In, monthly & annual) created; order data synced to `subscriptions/{uid}`.

## 4. Firestore indexes & rules (deploy these)

Run from the repo (`yarnerylounge/`):

```
firebase deploy --only firestore:indexes
firebase deploy --only firestore:rules
```

The following composite indexes are **required** for features; if missing, queries fail at runtime:

- `stickers`: `toUid ASC , createdAt DESC`
- `typing`: `conversationId ASC , lastTypedAt ASC`
- `messages` (chat pinned): `pinned ASC , pinnedAt DESC`
- Existing functional indexes for notifications, feed, discovery, etc.

## 5. Vercel Cron jobs (defined in `vercel.json`)

- [ ] `GET /api/cron/event-reminders` — daily 12:00 UTC
- [ ] `GET /api/cron/scheduled-questions` — daily 00:00 UTC

These require `CRON_SECRET` to be set. On hobby they run scheduled anyway, but Pro is safer.

## 6. Post-deploy smoke test

1. Load `/` — landing renders.
2. Sign up / log in — session cookie set over HTTPS.
3. Create a post — appears in feed without refresh (server read fix).
4. Send a DM — open chat, react, pin, see typing + read receipts.
5. Upload an avatar/cover — goes to Blob; music upload/stream is auth-gated.
6. Trigger a push notification; verify Resend DM email (after domain verified).
7. Join a live room — LiveKit token + participants work.

## 7. Notes / known non-blocking items

- Rate limiting is in-memory (per-serverless-instance); at scale, move to Upstash/Vercel KV. Not launch-blocking.
- A strong Content-Security-Policy is intentionally NOT yet set because it needs the exact Firebase/LiveKit/Blob domains from the paid environment; safe headers (`nosniff`, `X-Frame-Options` DENY, HSTS, `strict-origin-when-cross-origin`) are already added in `next.config.mjs`.
- Backups: enable Firestore **scheduled backups** in the Firebase console for a paid product.
