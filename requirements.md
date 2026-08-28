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
| Stripe | https://dashboard.stripe.com | Payments & subscriptions | Yes (no monthly fee) |
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

### Stripe
| Variable | Where to get it |
|----------|----------------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key (starts with `sk_test_`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Add endpoint → Copy signing secret (starts with `whsec_`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys → Publishable key (starts with `pk_test_`) |
| `STRIPE_PRICE_MONTHLY` | Stripe Dashboard → Product catalog → Create product → Add price → Copy price ID (starts with `price_`) |
| `STRIPE_PRICE_YEARLY` | Same as above, create yearly price |
| `STRIPE_PRICE_STANDARD_MONTHLY` | Same as above (standard tier monthly) |
| `STRIPE_PRICE_STANDARD_YEARLY` | Same as above (standard tier yearly) |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Same as above (premium tier monthly) |
| `STRIPE_PRICE_PREMIUM_YEARLY` | Same as above (premium tier yearly) |

**Stripe Setup Steps:**
1. Create Stripe account at https://dashboard.stripe.com
2. Complete business verification
3. Go to Developers → API keys → Copy publishable and secret keys
4. Go to Product catalog → Create products:
   - "Community Standard Monthly" → price: $9/mo
   - "Community Standard Yearly" → price: $90/yr
   - "Community Premium Monthly" → price: $19/mo
   - "Community Premium Yearly" → price: $190/yr
5. Copy each price ID
6. Go to Developers → Webhooks → Add endpoint:
   - URL: `https://yarnerylounge.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.upcoming`
7. Copy the webhook signing secret

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
- [ ] Give client Stripe dashboard access
- [ ] Give client LiveKit dashboard access
- [ ] Update Vercel env vars with client's keys
- [ ] Deploy final version
- [ ] Test all features work
- [ ] Remove developer admin access from app

### Client Actions
- [ ] Create all accounts (Section 1)
- [ ] Generate Firebase service account JSON
- [ ] Set up Stripe products and prices
- [ ] Set up Stripe webhook
- [ ] Create LiveKit project
- [ ] Create Resend API key
- [ ] Send all API keys to developer
- [ ] Accept Vercel transfer
- [ ] Accept GitHub transfer
- [ ] Accept Firebase ownership
- [ ] Verify Stripe is working (test a subscription)
- [ ] Verify emails are sending
- [ ] Verify video rooms work

---

## 4. Stripe Product Setup (Detailed)

Create these products in Stripe Dashboard → Product catalog:

### Product 1: Community Standard
- Name: "Community Standard"
- Description: "Access to live rooms, courses, events, and community features"
- Prices:
  - Monthly: $9.00 USD
  - Yearly: $90.00 USD

### Product 2: Community Premium
- Name: "Community Premium"
- Description: "Everything in Standard plus premium courses, exclusive events, and priority support"
- Prices:
  - Monthly: $19.00 USD
  - Yearly: $190.00 USD

After creating each price, copy the price ID (starts with `price_`) and use it in the environment variables.

---

## 5. Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://yarnerylounge.vercel.app/api/webhooks/stripe`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.upcoming`
5. Click "Add endpoint"
6. Copy the signing secret (starts with `whsec_`)
7. Use this as `STRIPE_WEBHOOK_SECRET` in Vercel

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
- [ ] Subscription checkout works (Stripe test mode)
- [ ] Webhook receives events
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

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_YEARLY=
STRIPE_PRICE_STANDARD_MONTHLY=
STRIPE_PRICE_STANDARD_YEARLY=
STRIPE_PRICE_PREMIUM_MONTHLY=
STRIPE_PRICE_PREMIUM_YEARLY=

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
