# Yarnery Lounge — Client Transfer Requirements

This document covers everything needed to transfer the Yarnery Lounge project from the developer to the client (Mamameer / Christa Patel).

---

## 1. Accounts the Client Must Create

The client needs to create all of these accounts with her own email (`Mamameer@gmail.com`):

| Service | URL | Purpose | Free Tier? |
|---------|-----|---------|------------|
| Vercel | https://vercel.com | Hosting & deployment | Yes |
| GitHub | https://github.com | Source code repository | Yes |
| Firebase | https://console.firebase.google.com | Database, auth, storage | Yes (Spark) |
| Shopify | https://www.shopify.com | Payments, subscriptions & the marketing site (speakeasy landing page) | Yes (paid plan) |
| LiveKit | https://livekit.io | Video rooms | Yes (limited) |
| Resend | https://resend.com | Transactional emails | Yes (100/day) |
| Google Search Console | https://search.google.com/search-console | SEO | Yes |

---

## 2. Environment Variables — Where to Get Each One

### Firebase (Client SDK)
| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → General → Your apps → Web app → `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same page → `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same page → `projectId` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same page → `storageBucket` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same page → `messagingSenderId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same page → `appId` |

### Firebase Admin (Server SDK)
| Variable | Where to get it |
|----------|----------------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service accounts → Generate new private key → Download JSON → Paste entire JSON contents |
| `FIREBASE_PROJECT_ID` | Same page → `project_id` from the JSON |
| `FIREBASE_CLIENT_EMAIL` | Same page → `client_email` from the JSON |
| `FIREBASE_PRIVATE_KEY` | Same page → `private_key` from the JSON |

### Payments (Shopify)
Payments are handled through **Shopify** (products, subscriptions, and the marketing/landing site at `secretyarnery.com`). The app does **not** use a payment gateway directly.

- Membership tiers are sold as Shopify products (currently: **Flirting**, **Hooking Up**, **Moving In** — monthly/annual).
- Shopify order data is used by the app to determine membership status (paid / overdue / ended) — automated syncing is planned; until then membership state is managed via the `subscriptions/{uid}` collection.

### LiveKit
| Variable | Where to get it |
|----------|----------------|
| `LIVEKIT_URL` | LiveKit Cloud Dashboard → Settings → Copy WebSocket URL (starts with `wss://`) |
| `LIVEKIT_API_KEY` | LiveKit Dashboard → API Keys → Copy key |
| `LIVEKIT_API_SECRET` | LiveKit Dashboard → API Keys → Copy secret |

### Resend (Email)
| Variable | Where to get it |
|----------|----------------|
| `RESEND_API_KEY` | Resend Dashboard → API Keys → Create API Key → Copy key (starts with `re_`) |
| `EMAIL_FROM` | Set to `onboarding@resend.dev` for testing, or `no-reply@herdomain.com` after domain verification |

### Push Notifications (VAPID)
| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Generate at https://vapidkeys.com or use existing keys |
| `VAPID_PRIVATE_KEY` | Same source as above |
| `VAPID_SUBJECT` | Set to `mailto:hello@yarnerylounge.vercel.app` |

### App Settings
| Variable | Value |
|----------|-------|
| `CRON_SECRET` | Generate a random string (use https://randomkeygen.com) |
| `NEXT_PUBLIC_APP_URL` | `https://yarnerylounge.vercel.app` (or her custom domain) |

---

## 3. Transfer Checklist

### Developer Actions
- [ ] Transfer GitHub repository to client
- [ ] Invite client to Vercel project
- [ ] Invite client to Firebase project
- [ ] Give client Shopify account access
- [ ] Give client LiveKit dashboard access
- [ ] Update Vercel env vars with client's keys
- [ ] Deploy final version
- [ ] Test all features work
- [ ] Remove developer admin access from app

### Client Actions
- [ ] Create all accounts (Section 1)
- [ ] Generate Firebase service account JSON
- [ ] Set up Shopify products (tier products + prices, monthly/annual)
- [ ] Confirm payment status (paid / overdue / ended) ties into the app's membership status
- [ ] Create LiveKit project
- [ ] Create Resend API key
- [ ] Send all API keys to developer
- [ ] Accept Vercel transfer
- [ ] Accept GitHub transfer
- [ ] Accept Firebase ownership
- [ ] Confirm test purchase (Shopify) updates membership status
- [ ] Verify emails are sending
- [ ] Verify video rooms work

---

## 4. Shopify Product Setup (Membership Tiers)

Create the membership products in Shopify (Products → Add product). Each tier keeps its description close to the **speakeasy landing page** copy. Suggested products:

### Product 1: Flirting
- Virtual tier product, $0 (join/free)
- Description: the free way in — intro rooms, community chat, and the basics.

### Product 2: Hooking Up
- Monthly $7.95 / Annual $79.50
- Description: the full calendar — deeper rooms, groups, and all events.

### Product 3: Moving In
- Monthly $17.95 / Annual $179.50
- Description: everything + VIP perks, priority matches, and host privileges.

Set the app's membership `tier` and status (paid / overdue / ended) from Shopify order data. No payment env variables exist in the app — payments happen on Shopify.

---

## 5. Shopify Payment Status Check

1. Purchases happen on Shopify (the client's `secretyarnery.com` store).
2. The app reads membership status from the `subscriptions/{uid}` collection: `tier`, `status` (`active` / `past_due` / `canceled` / `inactive`), and `currentPeriodEnd`.
3. Until Shopify order data is synced automatically, membership should be maintained manually (or via a future Shopify app/webhook).

---

## 6. Domain & SEO

If the client has a custom domain:
1. Add domain in Vercel → Settings → Domains
2. Update DNS records at domain registrar
3. Update `NEXT_PUBLIC_APP_URL` in Vercel
4. Update OpenGraph URL in `src/app/page.js` metadata
5. Update `manifest.webmanifest` start_url
6. Resubmit sitemap in Google Search Console

---

## 7. Post-Transfer Testing

Test these features after transfer:
- [ ] User signup (Google auth)
- [ ] User login
- [ ] Dashboard loads
- [ ] Feed posts work
- [ ] Chat works
- [ ] Live rooms work (create room, join room)
- [ ] Courses page loads
- [ ] Events page loads
- [ ] Membership status reflects the paid tier (Shopify order)
- [ ] Admin panel works
- [ ] Music player works in rooms
- [ ] PWA install prompt appears
- [ ] Push notifications work
- [ ] Email sends (welcome email on signup)

---

## 8. Environment Variables Template

Copy this template and fill in the values:

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# LiveKit
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Payments (Shopify — handled in the Shopify admin, not the app)
# No payment API keys are needed in the app.

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:hello@yarnerylounge.vercel.app

# App
CRON_SECRET=
NEXT_PUBLIC_APP_URL=https://yarnerylounge.vercel.app

# Resend
RESEND_API_KEY=
EMAIL_FROM=onboarding@resend.dev
```
