# ShareVibe Agent Instructions

These instructions apply to the whole repository.

## Detected Tech Stack

- Frontend: Vite 6, React 19, TypeScript, Tailwind CSS v4 via `@tailwindcss/vite`, large global CSS in `src/styles/index.css`, `lucide-react`, `motion`, Firebase Web SDK.
- Frontend data/auth: Firebase Auth with Google sign-in, Firestore, Firebase Storage.
- Backend API: Express 4, TypeScript, Prisma 5, PostgreSQL, BullMQ/Redis, Brevo email API, Helmet, CORS.
- Cloud Functions: Firebase Functions, Node 20, Firebase Admin SDK, callable functions for admin custom claims.
- SEO/PWA: static `index.html` meta, runtime meta/schema utilities in `src/seo`, `public/robots.txt`, `public/sitemap*.xml`, `public/manifest.json`.
- Video: Remotion scripts under `src/remotion`.
- Deployment: Firebase Hosting/Firestore/Storage/Functions plus a VPS/Nginx deployment path for `sharevibe.co` with `/api` proxied to the backend.

## Package Manager

- Use npm. The root and `backend/` have `package-lock.json`.
- Do not introduce pnpm, yarn, or bun unless the project is explicitly migrated.

## Commands

- Install frontend dependencies: `npm install`
- Install backend dependencies: `npm --prefix backend install`
- Install functions dependencies: `npm --prefix functions install`
- Frontend dev server: `npm run dev`
- Backend API dev server: `npm --prefix backend run dev`
- Backend worker dev process: `npm --prefix backend run worker`
- Firebase Functions emulator: `npm --prefix functions run serve`
- Frontend lint/typecheck: `npm run lint`
- Backend typecheck/build: `npm --prefix backend run build`
- Frontend tests: `npm test -- --run`
- Frontend coverage: `npm run test:coverage`
- Functions tests: `npm --prefix functions test` if Jest is installed/configured.
- Frontend production build: `npm run build`
- Backend production build: `npm --prefix backend run build`
- Generate Firestore rules: `npm run generate:rules`
- Generate sitemaps: `npm run generate:sitemaps`
- Deploy hosting: `npm run deploy:hosting`
- Deploy rules: `npm run deploy:rules`
- Deploy frontend and rules: `npm run deploy:prod`

Local tool note: this Windows shell may not include `C:\Program Files\nodejs` on `PATH`. If `npm` is not found, temporarily prefix the command with `$env:Path="C:\Program Files\nodejs;$env:Path";`. The root typecheck can require a larger heap on this codebase, for example `$env:NODE_OPTIONS="--max-old-space-size=8192"; npm run lint`.

## Architecture Rules

- Do not rewrite the app from scratch.
- Preserve the current SPA architecture unless a routing refactor is explicitly requested.
- Current view routing is query-string driven in `src/app/App.tsx`:
  - landing view: default `/`
  - cafe/gallery view: `?screen=app&cafe=...`
  - admin view: `?screen=admin`
  - owner portal: `?screen=owner`
- Treat `src/app/App.tsx`, `src/pages/admin/AdminPanel.tsx`, and `src/styles/index.css` as high-risk monoliths. Refactor them incrementally behind existing behavior and verify after each meaningful step.
- Keep Firebase collection names stable unless a migration plan is provided: `media`, `cafes`, `cafes/{slug}/campaigns`, `cafeOwnerAccess`, `users`.
- Keep backend API routes under `/api` and public unsubscribe routes under `/public` unless deployment routing is updated at the same time.
- Do not change the visual identity except for responsiveness, accessibility, or production correctness.

## Folder and File Structure Rules

- `src/`: frontend application code.
- `src/app/`: SPA coordinator/root app module.
- `src/pages/`: page-level view modules (`landing`, `admin`).
- `src/components/`: reusable UI components grouped by domain (`brand`, `common`, `pricing`, `ui`).
- `src/config/`: app constants, public config helpers, brand/pricing/access/ui constants.
- `src/context/`: React context providers.
- `src/hooks/`: reusable React hooks.
- `src/lib/`: infrastructure helpers for Firebase, auth, storage, and audit logging.
- `src/services/`: browser API clients and service wrappers grouped by external surface (`api`, `sharing`).
- `src/security/`: frontend security helpers only; related docs live under `docs/security/`.
- `src/seo/`: SEO/schema/meta utilities.
- `src/styles/`: global stylesheet entry and style layers.
- `src/remotion/`: Remotion compositions only.
- `backend/src/`: Express API, middleware, queue, services, routes.
- `backend/prisma/`: Prisma schema, migrations, seeds.
- `functions/`: Firebase Cloud Functions only.
- `scripts/`: local helper scripts grouped by purpose (`deploy`, `firebase`, `maintenance`, `dev`, `database`).
- `config/`: repo-level non-framework config and templates, including Firebase client config, Firestore rule templates, and access email sources.
- `ops/`: server/deployment operations files such as Nginx and systemd units. `ops/_local/` and `ops/deployment/private/` are ignored local-only storage.
- `public/`: public static assets, manifest, robots, sitemaps.
- `docs/`: project documentation.
- Do not add source code inside `dist/`, `out/`, `tmp/`, `test-results/`, `.firebase/`, `.chrome-profile/`, `ops/_local/`, `ops/deployment/private/`, `node_modules/`, or generated archives.
- New production docs may live at the repository root only when explicitly requested; otherwise use `docs/`.

## Coding Conventions

- Use TypeScript for frontend and backend changes.
- Follow existing React functional component and hook patterns.
- Prefer small extracted helpers/hooks over expanding `App.tsx` or `AdminPanel.tsx`.
- Use existing theme tokens and CSS class patterns before adding new styling systems.
- Use `lucide-react` icons for UI iconography when available.
- Keep text and legal/marketing claims grounded in verified project facts. Do not invent reviews, awards, statistics, addresses, legal claims, or company history.
- Keep comments brief and only where they clarify non-obvious logic.

## Security Rules

- Do not hardcode secrets, tokens, private keys, service account JSON, database URLs, Brevo keys, API tokens, or private credentials.
- Do not expose environment variables in client code unless they are intentionally public `VITE_` values.
- Do not commit `.env` files, logs, database dumps, uploads, generated private files, archives, or service account files.
- Treat Firebase config as public client config, but do not print or duplicate live keys in docs or logs. Use restrictions, App Check, and rules for real protection.
- Backend API authentication must not rely on caller-controlled headers in production. Verify Firebase ID tokens server-side before trusting user id, email, or role.
- Restrict CORS for production domains before public launch.
- Keep Firestore and Storage rules aligned with frontend/backend authorization.
- Run `npm run generate:rules` before deploying rules when templates change.
- Public-read collections and storage objects must be intentional product decisions and documented.
- Avoid logging PII, emails, tokens, auth headers, message bodies, or uploaded media URLs in production.

## Responsive UI Rules

- Preserve the existing premium cafe visual identity.
- Keep all primary flows usable at mobile widths: landing, QR gallery upload, share modal, owner/admin portal, tables, settings, campaigns, QR, customers.
- Avoid text overflow and horizontal scrolling on mobile unless the component is intentionally a scrollable table/control.
- Use stable dimensions for cards, media, toolbars, icon buttons, counters, and modals.
- Honor `prefers-reduced-motion` for motion-heavy areas.
- Validate real browser behavior after meaningful UI changes.

## SEO and GEO Rules

- Main domain is `https://sharevibe.co`.
- Do not add fake sitemap URLs, fake cafe pages, fake blog pages, fake social profiles, fake phone numbers, fake addresses, fake reviews, or fake awards.
- Keep canonical URLs, sitemap URLs, robots rules, Open Graph tags, and in-app routing consistent.
- Public pages should have crawlable, factual titles/descriptions and structured data based only on real content.
- Private/admin/owner/API routes must remain blocked from indexing.
- GEO content should answer concrete buyer questions with factual, source-of-truth product details from this repo.
- Do not create unsupported hreflang routes or language alternates without real localized pages.

## Forbidden Actions

- Do not delete existing features.
- Do not rewrite the whole project from scratch.
- Do not commit secrets, `.env` files, logs, database dumps, uploads, generated private files, archives, or service account files.
- Do not expose API keys/tokens in responses or documentation.
- Do not use destructive git commands.
- Do not change production deployment scripts, Firebase rules, or database schema without a verification and rollback plan.
- Do not force risky production changes. Document risky work in TODO/planning docs first.
