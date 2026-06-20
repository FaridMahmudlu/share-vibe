# ShareVibe Project Audit Report

Date: 2026-05-26
Domain: https://sharevibe.co
Scope: repository architecture, production readiness, security posture, responsive UI, performance, SEO, GEO, and QA. No application behavior was changed.

## Executive Summary

ShareVibe is a Vite React SPA backed by Firebase Auth, Firestore, and Storage, with a separate Express/Prisma email marketing backend and Firebase callable functions for admin custom claims. The project has substantial product surface already implemented: public landing, QR gallery/upload flow, owner/admin portal, campaigns, customers, QR stands, templates, analytics, and email sending.

The main production risks are trust-boundary and maintainability issues: very large frontend monolith files, backend API authentication that currently trusts headers instead of verifying Firebase ID tokens, SEO assets that list unimplemented or placeholder routes, and deployment/build artifacts stored in the repository root. These should be handled incrementally, not through a rewrite.

## Detected Stack

- Frontend framework: Vite 6 + React 19 + TypeScript.
- Styling: Tailwind CSS v4 plus a large global stylesheet in `src/styles/index.css`.
- UI/animation: `lucide-react`, `motion`.
- Frontend auth/data: Firebase Auth, Firestore, Firebase Storage.
- Backend API: Express + TypeScript + Prisma + PostgreSQL.
- Backend jobs: BullMQ + Redis worker.
- Email provider: Brevo REST API.
- Cloud functions: Firebase Functions on Node 20 with Firebase Admin SDK.
- Testing: Vitest/jsdom for frontend; functions package has a Jest script but no confirmed Jest setup.
- Deployment: Firebase Hosting/Firestore/Storage/Functions plus VPS/Nginx config for `sharevibe.co` and `/api` proxying.
- Package manager: npm.

## Current Folder Structure Summary

- `src/`: React frontend application.
- `src/app/App.tsx`: SPA root, query-string routing, auth state, gallery, upload, media actions, SEO meta updates.
- `src/pages/landing/MainPage.tsx`: public marketing/landing page, pricing, FAQ, legal modal, owner CTA.
- `src/pages/admin/AdminPanel.tsx`: admin and owner portal, dashboard, gallery management, campaigns, customers, QR, templates, settings.
- `src/components/`: reusable UI grouped by domain: `brand`, `common`, `pricing`, and `ui`.
- `src/config/`: public app, access, brand, pricing, and UI constants.
- `src/context/`: `CafeContext`.
- `src/hooks/`: gallery/upload/page-meta hooks.
- `src/lib/`: Firebase, auth, storage, and audit infrastructure helpers.
- `src/services/`: browser clients grouped by external surface: `api` and `sharing`.
- `src/security/`: frontend validation, browser security helpers, RBAC examples, audit helpers, docs.
- `src/seo/`: runtime meta/schema utilities.
- `src/remotion/`: Remotion explainer composition.
- `backend/src/`: Express API routes, services, queue, middleware.
- `backend/prisma/`: Prisma schema, migration SQL, seed.
- `functions/`: Firebase callable functions for custom claims/admin migration.
- `scripts/`: Firestore rule generation, Firebase deploy helper, sitemap generation.
- `public/`: robots, manifest, sitemaps, icons, story templates.
- `docs/`: existing setup, deployment, SEO, security, and architecture docs.
- Generated or operational artifacts currently present at root: `dist/`, `out/`, `tmp/`, `test-results/`, logs, screenshots, archives, and deploy packages.

## Routing and Page Model

The frontend does not use React Router or Next.js routing. `src/app/App.tsx` selects views from `window.location.search`.

- Public landing: `/`
- Gallery/app flow: `?screen=app&cafe={slug}` and related `media`, `table`, `masa` query params.
- Admin portal: `?screen=admin`
- Owner portal: `?screen=owner`
- Internal SEO meta uses canonical examples such as `/cafe/{slug}`, but the current initial view parser is query-string based.

Public pages:

- Landing page content in `MainPage`.
- Cafe/gallery view in `App`.
- Public Firestore reads for `media`, `cafes`, and website campaigns.
- Public unsubscribe endpoints in backend under `/public`.

Private/admin pages:

- Admin mode and owner mode are rendered by `AdminPanel`.
- Access is driven by Firebase Auth, super-admin email checks, `cafeOwnerAccess`, owner email, and admin email lists.

## Frontend Architecture

Strengths:

- Admin code is lazy-loaded from `App.tsx`.
- Some expensive UI is memoized.
- Firebase gallery queries are scoped by cafe slug and limited.
- Hooks and services have started to be extracted.
- SEO utilities and schema helpers exist.
- Error boundary is installed at app root.

Risks:

- `src/app/App.tsx` is about 2,600 lines, `src/pages/admin/AdminPanel.tsx` about 10,900 lines, and `src/styles/index.css` about 20,900 lines. This makes regression risk high.
- Routing, data loading, auth, upload logic, modal state, and SEO updates are concentrated in `App.tsx`.
- Admin portal combines many product domains in one file.
- CSS ownership is hard to reason about because global styles for landing, app, and admin live together.
- Some extracted hooks appear underused compared with duplicated logic in `App.tsx`.

## Backend/API Architecture

Backend entrypoint: `backend/src/index.ts`

- Express app with `helmet()`, `cors()`, JSON and URL encoded body limits.
- Routes mounted under `/api`.
- Public unsubscribe mounted under `/public`.
- Scheduled campaign dispatch runs inside the API process every 60 seconds.
- Worker exists separately at `backend/src/worker.ts`.

API areas:

- Campaigns
- Customers
- Analytics
- QR stands and QR stand requests
- Email templates
- Settings
- Unsubscribe

Risks:

- `authMiddleware` currently trusts `X-Firebase-Id`, `X-Firebase-Email`, and `X-User-Role` headers. A comment says production would validate Firebase JWT tokens, but validation is not implemented there.
- `cors()` is currently open to all origins.
- Multiple modules instantiate their own `PrismaClient`, which can exhaust database connections under load.
- Scheduled campaign processing inside the API process can duplicate work if multiple API instances run.
- No backend test or lint script is defined.

## Authentication and Authorization

Frontend:

- Firebase Google sign-in via popup locally and redirect in production-like hosts.
- Firebase auth persistence is browser local persistence.
- Owner/admin access uses hardcoded super-admin emails, Firestore `cafeOwnerAccess`, cafe `ownerEmail`, and `adminEmails`.

Firestore/Functions:

- Firestore rules prefer custom claim `admin == true` but still include legacy hardcoded email fallback.
- Firebase callable functions can set/list/migrate admin custom claims.

Backend:

- Role and identity are derived from request headers sent by frontend service clients.
- Cafe scoping checks Prisma ownership/admin emails after user resolution.

Highest priority security issue:

- Backend API must verify Firebase ID tokens server-side before trusting identity or role.

## Database and Storage Usage

Firebase Firestore:

- `media`
- `cafes`
- `cafes/{cafeId}/campaigns`
- `cafeOwnerAccess`
- `users`

Firebase Storage:

- `/media/{cafeSlug}/{mediaId}`
- `/campaigns/{cafeSlug}/{fileName}`
- `/cafes/{cafeSlug}/settings/{fileName}`
- `/admin/{adminId}/{fileName}`

PostgreSQL via Prisma:

- Users, cafes, cafe settings, QR stands, customers, campaigns, templates, email recipients/logs, media stats, unsubscribe records, rate limits.

Risks:

- Firestore public reads are broad. This may be intentional for public galleries, but privacy expectations must be documented per field.
- Storage campaign uploads allow any authenticated user to upload under a cafe slug. If campaign files are treated as cafe-private later, this needs owner/admin enforcement.
- Firebase config is stored in a JSON file in the repository. Firebase web config is public by design, but production must rely on App Check, API key restrictions, and rules.

## Deployment Platform

Detected deployment paths:

- Firebase Hosting configured by `firebase.json`, serving `dist` with SPA fallback.
- Firebase Firestore and Storage rules in root.
- Firebase Functions in `functions/`.
- `scripts/firebase/firebase-deploy.mjs` deploys hosting and named Firestore database rules using `config/firebase/firebase-applet-config.json`.
- `ops/nginx/sharevibe.conf` serves `sharevibe.co`, proxies `/api/` to `localhost:3001`, and proxies Firebase auth helper paths.
- `scripts/deploy/deploy.ps1` builds a zip from `dist` and copies to a VPS web root.

Risk:

- The repo has two deployment stories. Production ownership should clarify whether Firebase Hosting, VPS/Nginx, or both are authoritative.

## Environment Variables

Root `.env.example` includes:

- Firebase public config placeholders
- `VITE_ENV`
- `VITE_API_URL`
- Sentry flags
- analytics/debug flags
- upload/media limits

Backend `.env.example` includes:

- `DATABASE_URL`
- `REDIS_URL`
- `BREVO_API_KEY`
- sender fields
- Brevo sandbox/base URL
- global/per-cafe/per-campaign limits
- `PORT`
- `NODE_ENV`

Other detected client env:

- `VITE_EMAIL_API_BASE` is used by email and QR services but is not present in the root `.env.example`.

## SEO and GEO Status

Strengths:

- `index.html` has title, description, canonical, robots, Open Graph, Twitter, manifest, and base JSON-LD.
- Runtime meta updates exist in `src/seo/utils.ts`.
- Schema helpers exist in `src/seo/schemas.ts`.
- Robots and sitemap files exist.

Risks:

- SPA-only rendering limits crawlability of dynamic cafe/gallery/admin state.
- Sitemaps include routes that are not implemented as real routed pages in the current app (`/about`, `/features`, `/pricing`, `/blog`, example cafe pages, example blog pages).
- Some structured data/social/contact fields look placeholder-like and should not ship as factual claims unless verified.
- `hreflang` includes `/en/`, but no real English route was detected.
- Actual app links use query parameters, while canonical/meta/sitemap examples use path routes. This weakens SEO consistency and GEO answer confidence.

## Responsive UI Status

Strengths:

- Many responsive media queries are present.
- Mobile-specific constraints exist for app/gallery headers and hero sections.
- Buttons and modals generally use flex/grid responsive patterns.
- Reduced-motion handling appears in parts of the landing/app CSS.

Risks:

- The admin UI surface is large and should be browser-tested at mobile/tablet/desktop sizes after each change.
- The large global CSS file makes unintended responsive regressions likely.
- Several dense admin views contain tables, toolbars, filters, and modals that need explicit QA.

## Performance Status

Strengths:

- Vite build uses Terser and drops console output.
- Vendor chunks are split for Firebase, motion, React, and icons.
- Admin panel is lazy loaded.
- Images generally use `loading="lazy"` and `decoding="async"` in UI.
- Firestore media query limit is present.

Risks:

- React app remains client-rendered only.
- External Unsplash images and Google Fonts affect LCP and privacy/performance.
- Massive CSS increases parse and maintainability cost.
- Realtime listeners and API calls in large admin views need profiling.
- Multiple Prisma clients and in-process scheduler can hurt backend scalability.

## Commands Discovered

Root:

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm test -- --run`
- `npm run test:coverage`
- `npm run generate:rules`
- `npm run generate:sitemaps`
- `npm run deploy:hosting`
- `npm run deploy:rules`
- `npm run deploy:prod`

Backend:

- `npm --prefix backend install`
- `npm --prefix backend run dev`
- `npm --prefix backend run worker`
- `npm --prefix backend run build`
- `npm --prefix backend run start`
- `npm --prefix backend run db:migrate`
- `npm --prefix backend run db:push`
- `npm --prefix backend run db:seed`

Functions:

- `npm --prefix functions install`
- `npm --prefix functions run serve`
- `npm --prefix functions run deploy`
- `npm --prefix functions run logs`
- `npm --prefix functions test`

## Verification Results

Commands run on 2026-05-26:

- `npm test -- --run`: passed, 1 test file and 8 tests.
- `npm --prefix backend run build`: passed.
- `npm run build`: passed. Build output included `dist/index.html`, a 467 kB CSS asset, a 500 kB Firebase vendor chunk, and split React, motion, admin, and app chunks.
- `npm run lint`: initially failed because Node was not on the shell `PATH`, then failed with the default Node heap limit during `tsc --noEmit`. Re-run with `C:\Program Files\nodejs` temporarily added to `PATH` and `NODE_OPTIONS=--max-old-space-size=8192`; passed.

Tooling note: `git` and `npm` were not available on the initial shell `PATH`; Node/npm exist under `C:\Program Files\nodejs`.

## Main Architectural Risks

1. Backend API auth trusts request headers instead of verifying Firebase ID tokens.
2. Very large frontend and CSS monoliths make production changes risky.
3. Hardcoded super-admin emails exist across frontend, backend, Firestore rules, and functions.
4. SEO assets include unimplemented or placeholder URLs and claims.
5. Query-string routing and canonical path URLs are inconsistent.
6. Deployment target is ambiguous between Firebase Hosting and VPS/Nginx.
7. Generated/build/deployment artifacts and logs are present in the working tree.
8. Backend has no test/lint command and multiple Prisma clients.
9. Production CORS is not restricted.
10. Public media/cafe/campaign reads need explicit privacy acceptance and field review.

## Recommended Next Codex Task

Start with a focused security hardening task:

Implement backend Firebase ID token verification in `backend/src/middleware/auth.ts`, update frontend API clients to send `Authorization: Bearer <idToken>`, restrict production CORS to `https://sharevibe.co` and approved local dev origins, then run backend build and frontend verification.
