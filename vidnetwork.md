# VidNetwork — What I Built For You & How We Hand It Over

> This is my walkthrough of the system I've built for you. It explains what the platform does
> today, how you get in as admin, what's needed to make it production-ready on your own
> accounts, and exactly how we'll move it over to you.

---

## 1. What I've built for you

VidNetwork is a **paid membership community platform** with social features, live video rooms,
courses, events, and monetization — modeled on how Mighty Networks works.

### What your members experience
- They **sign up** (Google or email/password) and get a **14-day free trial** of a paid plan
  (no credit card required to start).
- After login they land on a **dashboard** showing KPIs, a member-growth chart, recent
  activity, upcoming live rooms, messages, notifications, content performance, and onboarding
  progress.
- A **left sidebar** organizes everything: Dashboard · Content (Courses, Live Rooms, Events,
  Recordings) · Community (Feed, Discovery, Members, Groups, Spaces, Chat, Search, Leaderboard)
  · and admin sections for you.

### Features I've put in place (verified, current)
| Area | What it does |
|---|---|
| **Auth & accounts** | Google sign-in + email/password, session cookies, profiles (name, bio, headline, location, **avatar upload**), account settings, member directory. |
| **Content** | Posts feed (text, images, hashtags), comments, likes/recognitions, articles in Spaces, search, discovery page. |
| **Spaces & Groups** | Public/private/invite-only spaces, groups with join/member lists, collections that organize spaces in the sidebar. |
| **Live video chat** | **LiveKit** rooms: real-time video/audio chat, screen share, broadcasting (only hosts can publish), co-hosts, scheduled opening times, capacity. Rooms are gated: space membership required; **premium-tier spaces require a Premium subscription**; broadcast publishing is host-only. |
| **Events** | Event calendar, RSVPs with reminders, recurring events, **paid tickets** (Stripe checkout), attendance tracking, ICS download. |
| **Courses** | Course/lesson system, progress tracking, completion badges, **paid courses** (one-time purchase or subscription access). |
| **Recordings** | Live room recordings with download/transcription permissions. |
| **Monetization** | **Stripe subscriptions** (Standard $20/mo or $200/yr · Premium $40/mo or $400/yr), 14-day trial, card/PayPal, promo codes, plan switching with proration, **one-time purchases** for courses/events/spaces, purchase receipts. |
| **Gamification** | Points, daily streaks, badges, leaderboard (ranked by points), member-to-member recognitions. |
| **Notifications** | In-app notification bell with unread badge, email notifications, **web push** (VAPID). |
| **Chat** | Direct/group chat (conversation inbox). |
| **Automations** | Triggers on signup / post / purchase / lesson-complete / RSVP etc. (badges, notifications, announcements). |
| **Admin panel** | Rooms, courses, collections, questions/scheduler, scoped hosts, moderation (reports + keyword filtering), settings, analytics, income, promo codes, automations, announcements. |
| **Dashboard analytics** | Member growth/activity charts (staff only), revenue estimates, engagement, live viewer counts. |

---

## 2. How the system works

1. **Login** → Firebase signs the user in; the server issues a **session cookie**.
2. **Access control**: every page and API checks the session plus the user's `role` and
   `subscription`.
   - Without an active subscription → redirected to `/pricing`.
   - Video rooms, premium spaces, and paid content are **gated on the server** (the LiveKit
     token endpoint checks membership + tier before granting access).
3. **Payments** run through **Stripe**: checkout → webhook → Firestore (`subscriptions`,
   `purchases`). A 14-day trial starts automatically on first subscription.
4. **Live video** runs on **LiveKit**; the platform hands out short-lived tokens per room.
5. **Crons** handle scheduled events, question reminders, and automations (protected by a secret
   key).

---

## 3. Admin access — how you get in as admin

**You can get in as full admin.** There are three roles:

| Role | Access |
|---|---|
| **Member** | Default. Content, chat, rooms, events, courses they have access to. No admin. |
| **Moderator** | Scoped admin tools (assigned via "Scoped hosts"): moderation queue (reports, keyword filter) and host tools for assigned rooms/spaces. |
| **Owner** | Full admin: manage rooms, courses, collections, questions, hosts, moderation, **settings**, analytics, income, promo codes, automations, announcements. Owner badge shows in your top-right profile menu. |

### How you become Owner
The moment your account exists in the system, I promote you by running a script against the
Firebase project:

```bash
node scripts/set-owner.mjs <your-email>
```

It looks up your Firebase user by email and sets `role: "owner"` on your profile. From then on
you see the full admin menu and the "Owner" badge in your profile menu.
(While we're still on my test environment, I'll run it on my Firebase; after we migrate, I'll
run it on yours.)

---

## 4. The tech stack — what the system is running on

| Service | What it's used for | Currently configured to |
|---|---|---|
| **Firebase** (Firestore + Auth) | Database, auth, web push messaging | My project `christa-patel` |
| **Stripe** | Subscriptions, payments, invoices | My Stripe account + price IDs |
| **Vercel** | Hosting/deployment | My project `community`, live at `vidnetwork.vercel.app` |
| **LiveKit** | Live video rooms | My LiveKit keys |
| **Web Push (VAPID)** | Browser notifications | My key pair |

Everything is configured through environment variables: `FIREBASE_*`, `NEXT_PUBLIC_FIREBASE_*`,
`STRIPE_*` (secret key, webhook secret, 4 price IDs), `LIVEKIT_*`, `VAPID_*`, `CRON_SECRET`,
`NEXT_PUBLIC_APP_URL`.

**One honest caveat:** right now avatar uploads are stored as data URLs in the profile because
the Firebase project has **no billing account / Cloud Storage enabled**. Once we move to your
project I recommend enabling Firebase Storage so avatars and files upload properly.

---

## 5. Is it production-ready?

The platform is deployed, builds cleanly, has 147 passing tests and 0 lint errors. Before I'd
call it truly production-grade on your name, I want to close these gaps:

- [ ] **Enable Firebase Storage** (needs a billing account) and move avatar/file uploads off
      data URLs (otherwise there's a ~5–10 MB upload ceiling).
- [ ] **Harden Firestore/Storage security rules** for client-side reads.
- [ ] **Lapsed-user emails** (expiring-trial and expired-subscription reminders — currently only
      in-app + Stripe webhook emails).
- [ ] **Rate limiting that survives serverless cold starts** (current limiter is in-memory).
- [ ] Admin member list **pagination** (currently caps at 500 members).
- [ ] Optional **E2E test suite** for payments and live rooms.
- [ ] Your **custom domain**, SSL, and your brand colors/logo.

---

## 6. Moving it to you — my recommended handover plan

The point is to have the platform running on **your own** Firebase, Stripe, Vercel, and LiveKit
accounts, fully separated from mine.

### Step 0 — Agreement
I hand you the full source (Git repo) + this document. I recommend we **start your project
fresh** on your accounts rather than copying my data, so there's no cross-tenant mess.

### Step 1 — You create the accounts (no code needed)
1. **Firebase** project (free tier is fine to start; add billing to enable Storage). Enable
   Authentication (Google + email/password) and Firestore.
2. **Stripe** account — create the 4 prices (Standard/Premium × monthly/yearly) and a
   **webhook endpoint** → `/api/webhooks/stripe` (events: `checkout.session.completed`,
   `customer.subscription.*`, `invoice.*`, `charge.refunded`).
3. **LiveKit** cloud project → get API key/secret/URL.
4. **Vercel** project → connect the Git repo, add your domain.

### Step 2 — Configure
I copy the env vars from §4 into your Vercel project (or `.env.local`), pointed at **your**
Firebase/Stripe/LiveKit values. Price IDs go in `STRIPE_PRICE_*`.

### Step 3 — Deploy & verify
- Deploy to Vercel. We smoke-test together: signup → 14-day trial → subscribe → open a live
  room → purchase a paid event/course → admin panel → notifications.
- Import `firestore.indexes.json` if you rebuild the database, and upload security rules.

### Step 4 — Make you admin & onboard you
- **I** run `node scripts/set-owner.mjs <your-email>` on **your** Firebase to promote you to
  Owner (or I add a simple admin button in the UI instead).
- I walk you through: creating rooms/spaces/courses, setting plans and prices, reading
  analytics, sending invitations, and using moderation.

### Step 5 — Cut over
- We point your domain (e.g., `members.yourbrand.com`) at the new deployment, update
  `NEXT_PUBLIC_APP_URL` + Firebase authorized domains, and I shut down/stop my test deployment.

### What I recommend
- **No data copying** — you launch clean with real members created on your instance.
- Think of this as **license + setup + handover**: I include the migration, your admin
  training, and a 30–90 day support window after launch.
- Your recurring costs (Stripe, LiveKit, Firebase, Vercel) are **your** operating expenses,
  billed to you directly — not bundled into my fee.
