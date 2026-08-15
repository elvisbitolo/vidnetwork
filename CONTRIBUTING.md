# Contributing

Thanks for your interest in contributing to VidNetwork.

> This is a **private, single-owner project** (a client product). Large
> architectural changes should be discussed before they're written. Small,
> well-tested improvements are welcome.

## Getting started

1. Clone the repo and install dependencies: `npm install`
2. Copy `.env.example` → `.env.local` and configure Firebase credentials.
3. Run the dev server: `npm run dev`
4. Run checks before opening a PR:

```bash
npm run lint
npm test
npm run build
```

CI runs all three on every push/PR, so keeping them green locally saves a cycle.

## Code conventions

- **JavaScript (ESM)** throughout — no TypeScript in this project.
- **Pure logic goes in `*-core.js`** modules under `src/lib/server/` with unit
  tests in `src/lib/server/__tests__/`. They must import nothing from
  `@/` (node:test can't resolve the alias) — use relative imports.
- **API routes** live next to pages (`src/app/**/route.js`), use the guards in
  `src/lib/server/authorize.js`, and return `NextResponse.json(...)`.
- **Client components** read/write through API routes; direct Firestore
  reads from the client SDK are acceptable for realtime data.
- Don't add comments unless they explain *why* (the code should read cleanly).
- Follow the existing file structure and naming.

## Testing

```bash
npm test
```

Tests use `node:test` + `node:assert/strict`. Add or update tests whenever you
touch pure logic (validators, state machines, gating rules).

## Commits

- Write clear, concise commit messages describing the *what* and *why*.
- Group related changes; keep the history linear and reviewable.
- Never commit secrets or `.env.local`.

## Pull requests

1. Branch from `main` (`git checkout -b your-feature`).
2. Implement your change with tests.
3. Run lint + test + build locally.
4. Open a PR; the CI workflow will verify it automatically.
