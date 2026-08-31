# Yarnery Lounge

Yarnery Lounge is an **open membership community platform**: live video rooms,
courses, events, groups, chat and engagement tools in one web app. It is built
as a close equivalent of the Mighty Networks product surface for a single
community operated by a Host.

LiveKit powers real-time video, Firebase provides auth and data, and Vercel
hosts the app + Blob storage for uploads. Anyone who signs up gets full
role-based access to the community — there are **no paid tiers right now**;
transactions are planned to be added later on **Shopify**. Everything members
can do is gated server-side, with Firestore rules as a backstop.

- **Stack:** Next.js 16 (App Router) · React 19 · Firebase (Auth + Firestore) · LiveKit · Vercel Blob · Vercel
- **Requires:** Node.js 24
- **Status:** feature-complete per the client scope; open access (see [docs/CURRENT-STATE.md](./docs/CURRENT-STATE.md))

## How to run it

```bash
npm install
cp .env.example .env.local   # fill in credentials
node scripts/set-owner.mjs you@example.com   # promote yourself to owner
npx firebase deploy --only firestore:rules,firestore:indexes
npm run dev                  # http://localhost:3000
```

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm test` | Server unit tests (`node:test`, 140 tests) |

Full setup details: [docs/SETUP.md](./docs/SETUP.md).

## Architecture overview

```
Browser (React client)
  │  httpOnly session cookie (Firebase Auth)
  ▼
Next.js App Router
  ├── Pages (client/server components)     ── realtime Firestore reads
  ├── API routes (route.js)                ── server-side business logic
  │     │  guards: requireUser / requireOwner / requireModerator …
  │     ▼
  ├── src/lib/server/*                     ── Admin SDK, LiveKit, email
  └── *-core.js modules                    ── pure, unit-tested logic
```

- **Pages & API** live together under `src/app/` (App Router colocation).
- **Server business logic** is in `src/lib/server/`; pure decision logic is
  extracted into `*-core.js` modules with `node:test` suites.
- **Client reads** use the Firebase client SDK (realtime feeds, chat); **all
  writes** go through server API routes.
- **Uploads** (profile photos) go through `/api/upload` → an optional
  **Vercel Blob** store; without a `BLOB_READ_WRITE_TOKEN` they fall back to
  base64 stored in Firestore.
- **Security boundary** is server-side authorization; rules in
  `firestore.rules` backstop direct client access.

More: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Documentation

| Doc | Purpose |
|---|---|
| [docs/CURRENT-STATE.md](./docs/CURRENT-STATE.md) | What exists now (built, verified, remaining gaps) |
| [docs/PRODUCT.md](./docs/PRODUCT.md) | What the product is (positioning, features, business model) |
| [docs/ROLES.md](./docs/ROLES.md) | Who can do what (roles & permissions) |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | How the software works |
| [docs/SECURITY.md](./docs/SECURITY.md) | Security policy & reporting |
| [docs/SETUP.md](./docs/SETUP.md) | Developer setup & decisions log |
| [docs/PRD.md](./docs/PRD.md) | What we want to build (requirements) |
| [docs/PRODUCTION-AUDIT.md](./docs/PRODUCTION-AUDIT.md) | Production-readiness audit evidence |
| [docs/REMEDIATION-REPORT.md](./docs/REMEDIATION-REPORT.md) | Audit remediation status |
| [docs/SECURITY-MATRIX.md](./docs/SECURITY-MATRIX.md) | Security controls (rules + server) |
| [docs/AUTHORIZATION-MATRIX.md](./docs/AUTHORIZATION-MATRIX.md) | Role × action × resource matrix |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contributing guide |

## License

Private project — all rights reserved. Not open source.