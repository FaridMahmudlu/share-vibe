# ShareVibe Folder Structure Report

Date: 2026-05-26
Scope: structure-only refactor. Runtime behavior, UI design, feature set, database schema, and dependency set were not intentionally changed.

## Old Structure Summary

- Frontend framework files were already in the correct Vite locations: `src/main.tsx`, `src/App.tsx`, `src/index.css`, and `index.html`.
- Page-level modules, app config, Firebase/auth/storage helpers, and some reusable components were mixed directly under `src/`.
- `src/components/` contained reusable UI plus one security example component.
- `src/services/` contained API service clients and sharing helpers in one flat folder.
- Backend structure under `backend/src/`, Prisma files under `backend/prisma/`, Firebase Functions under `functions/`, scripts under `scripts/`, docs under `docs/`, and public assets under `public/` were already recognizable and were left in place.

## New Structure Summary

- `src/pages/landing/`: public landing page module.
- `src/pages/admin/`: admin and owner portal module.
- `src/components/brand/`: brand UI components.
- `src/components/common/`: app-wide reusable components.
- `src/components/pricing/`: pricing UI components.
- `src/components/ui/`: small generic UI controls.
- `src/config/`: public app, access, brand, pricing, and UI constants.
- `src/lib/`: infrastructure helpers for Firebase, auth, storage, and audit integration.
- `src/services/api/`: browser API clients for backend surfaces.
- `src/services/sharing/`: browser sharing service wrappers.
- `src/security/examples/`: security example components separated from reusable app UI.

## Files Moved

Pages:

- `src/MainPage.tsx` -> `src/pages/landing/MainPage.tsx`
- `src/AdminPanel.tsx` -> `src/pages/admin/AdminPanel.tsx`

Components:

- `src/BrandLogo.tsx` -> `src/components/brand/BrandLogo.tsx`
- `src/BrandSignature.tsx` -> `src/components/brand/BrandSignature.tsx`
- `src/DropdownSelect.tsx` -> `src/components/ui/DropdownSelect.tsx`
- `src/components/ErrorBoundary.tsx` -> `src/components/common/ErrorBoundary.tsx`
- `src/components/PricingPlans.tsx` -> `src/components/pricing/PricingPlans.tsx`
- `src/components/SecureFormExample.tsx` -> `src/security/examples/SecureFormExample.tsx`

Config/constants:

- `src/accessConfig.ts` -> `src/config/access.ts`
- `src/brandAssets.ts` -> `src/config/brand.ts`
- `src/config.ts` -> `src/config/app.ts`
- `src/pricingConfig.ts` -> `src/config/pricing.ts`
- `src/uiConfig.ts` -> `src/config/ui.ts`

Lib/infrastructure:

- `src/firebase.ts` -> `src/lib/firebase/client.ts`
- `src/googleAuth.ts` -> `src/lib/auth/googleAuth.ts`
- `src/mediaStorage.ts` -> `src/lib/storage/mediaStorage.ts`
- `src/pendingUpload.ts` -> `src/lib/storage/pendingUpload.ts`
- `src/auditIntegration.ts` -> `src/lib/audit/auditIntegration.ts`

Services:

- `src/services/emailService.ts` -> `src/services/api/emailService.ts`
- `src/services/qrService.ts` -> `src/services/api/qrService.ts`
- `src/services/storyShareService.ts` -> `src/services/sharing/storyShareService.ts`

## Imports Updated

- Runtime imports were updated in `src/App.tsx`, `src/main.tsx`, `src/hooks/useGalleryData.ts`, `src/hooks/usePaginatedGallery.ts`, `src/pages/landing/MainPage.tsx`, `src/pages/admin/AdminPanel.tsx`, moved component files, moved lib files, and moved service files.
- Path aliases were normalized so `@/*` points to `src/*` in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`.
- Documentation path references were updated in `AGENTS.md`, `README.md`, `PROJECT_AUDIT_REPORT.md`, `src/security/QUICK_START.md`, `docs/ADVANCED_FEATURES.md`, and `docs/TESTING.md`.

## Files Deleted

- None.

## Files Kept Because Uncertain

- Generated/build/runtime artifacts currently present at the repository root were not deleted: `dist/`, `out/`, `tmp/`, `test-results/`, `.chrome-profile/`, logs, screenshots, archives, and deploy packages.
- Historical audit references in `docs/SECURITY_AUDIT_REPORT.md` were not rewritten because they appear to describe findings at the time of that report. Current structure references were updated in active project docs.
- Existing public asset locations were not changed because asset URLs, manifest references, sitemap behavior, and deployment cache paths should be reviewed together before moving them.

## Verification Commands

Commands were run with `C:\Program Files\nodejs` temporarily added to `PATH` where needed.

- `npm run lint` with `NODE_OPTIONS=--max-old-space-size=8192`: PASS.
- `npm test -- --run`: PASS, 1 test file and 8 tests.
- `npm --prefix backend run build`: PASS.
- `npm run build`: PASS.
- Search for stale runtime imports to moved files under `src/`: PASS, no matches.
- Search for old moved source paths still existing: PASS, no old-path source copies found.
- Search for empty source directories under `src/`: PASS, no empty directories found.
- Search for stale documentation references: PASS for active docs; only move lists and the historical `docs/SECURITY_AUDIT_REPORT.md` references remain intentionally documented.

## Remaining Manual Checks

- Run browser smoke checks for landing, gallery upload, share modal, admin, and owner views at mobile, tablet, and desktop widths.
- Decide whether generated artifacts, logs, screenshots, and archives should be deleted locally and added to ignore rules if they are currently tracked.
- Review historical docs if the team wants all old-path references rewritten for readability instead of preserving original audit context.
- Consider later splitting `src/App.tsx`, `src/pages/admin/AdminPanel.tsx`, and `src/index.css` by feature after this structure-only pass.
