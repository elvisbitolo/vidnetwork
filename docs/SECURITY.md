# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Send a private report instead:

- Open a [GitHub security advisory](https://github.com/elvisbitolo/vidnetwork/security/advisories/new)
  on this repository, or
- Email the repository owner directly (see the project owner in GitHub).

Include:

1. The affected endpoint, route, or file (and line numbers if possible).
2. A description of the vulnerability and how to reproduce it.
3. Expected vs. actual behavior.
4. Impact (what data/action is exposed).
5. (Optional) a proposed fix.

## Scope

This policy covers the web application, its API routes, and the Firebase
security rules/storage rules in this repository. It does **not** cover
third-party services (Firebase, Stripe, LiveKit, AWS S3, Resend, Vercel) — those
have their own security processes.

## Response

- Acknowledgment of receipt within **3 business days**.
- A triage decision and timeline within **10 business days**.
- Fixes are prioritized by severity; you'll be credited unless you prefer not to.

## Supported versions

Only the latest commit on `main` is supported. Releases are not tagged; please
always verify against `main`.

## Security model summary

The system's security boundary is **server-side authorization**. Firestore and
Storage rules backstop direct client access. Key controls:

- Session-based auth via httpOnly cookies (Firebase `createSessionCookie`).
- Email verification required before a session is created.
- Server-side guards for every action (`requireUser`, `requireActiveMember`,
  `requireOwner`, …) — see [ROLES.md](./ROLES.md) and
  [AUTHORIZATION-MATRIX.md](./AUTHORIZATION-MATRIX.md).
- Webhooks (Stripe/LiveKit) are signature-verified and idempotent.
- Payments: amount verification on purchase completion, auto-refund on
  mismatch, access revocation on refunds.
- Rate limiting on sensitive endpoints.
- Secrets live in environment variables only; `.env*` is gitignored
  (except `.env.example`).
- Full detail: [SECURITY-MATRIX.md](./SECURITY-MATRIX.md).
