# ShareVibe Folder Structure Plan

Date: 2026-05-26
Scope: structure-only refactor. No business logic, UI redesign, database schema, or feature behavior changes are planned.

## Current Folder Tree Summary

Framework and project roots:

- `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json`
- Firebase and deployment files: `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`, `firebase-applet-config.json`, `nginx-sharevibe.conf`, deployment scripts
- Generated/local artifacts at root: `dist/`, `out/`, `tmp/`, `test-results/`, logs, screenshots, archives

Frontend:

- `src/main.tsx`: Vite React entrypoint
- `src/App.tsx`: SPA coordinator and query-string view routing
- `src/index.css`: global Tailwind/CSS bundle
- Flat app files in `src/`: `AdminPanel.tsx`, `MainPage.tsx`, brand components, config/constants, Firebase/auth helpers, storage helpers
- Existing folders: `components/`, `context/`, `hooks/`, `services/`, `security/`, `seo/`, `remotion/`, `tests/`, `utils/`

Backend:

- `backend/src/index.ts`, `backend/src/worker.ts`
- `backend/src/routes/`, `backend/src/services/`, `backend/src/middleware/`, `backend/src/queue/`, `backend/src/utils/`, `backend/src/db/`
- `backend/prisma/`

Functions:

- `functions/index.js`
- `functions/package.json`

## Proposed Folder Tree

Keep framework-sensitive files where they are:

```text
src/
  main.tsx
  App.tsx
  index.css
  vite-env.d.ts
```

Professional frontend organization:

```text
src/
  components/
    brand/
      BrandLogo.tsx
      BrandSignature.tsx
    common/
      ErrorBoundary.tsx
    pricing/
      PricingPlans.tsx
    ui/
      DropdownSelect.tsx
  config/
    access.ts
    app.ts
    brand.ts
    pricing.ts
    ui.ts
  context/
    CafeContext.tsx
  hooks/
    index.ts
    useGalleryData.ts
    usePageMeta.ts
    usePaginatedGallery.ts
    useUploadComposer.ts
  lib/
    audit/
      auditIntegration.ts
    auth/
      googleAuth.ts
    firebase/
      client.ts
    storage/
      mediaStorage.ts
      pendingUpload.ts
  pages/
    admin/
      AdminPanel.tsx
    landing/
      MainPage.tsx
  security/
    examples/
      SecureFormExample.tsx
    ...
  seo/
  services/
    api/
      emailService.ts
      qrService.ts
    sharing/
      storyShareService.ts
  tests/
  utils/
  remotion/
```

Backend source remains unchanged for this pass:

```text
backend/src/
  index.ts
  worker.ts
  middleware/
  queue/
  routes/
  services/
  utils/
  db/
```

## Files Planned To Move

Frontend page files:

- `src/MainPage.tsx` -> `src/pages/landing/MainPage.tsx`
- `src/AdminPanel.tsx` -> `src/pages/admin/AdminPanel.tsx`

Reusable components:

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

Config files:

- Update `vite.config.ts`, `vitest.config.ts`, and `tsconfig.json` so `@/*` points to `src/*` instead of repository root.

Documentation:

- Update `AGENTS.md` to describe the new frontend structure.
- Update README path references where they point to moved files.
- Add `FOLDER_STRUCTURE_REPORT.md` and `FOLDER_STRUCTURE_TODO.md`.

## Risk Level

Overall risk: Medium.

Reasons:

- The app has very large files with many relative imports.
- The refactor moves infrastructure files used by runtime code.
- Vite alias changes can affect future imports.
- Backend source is intentionally not moved to avoid mixing structural cleanup with API behavior risk.

Low-risk areas:

- Moving leaf UI components with clear import paths.
- Moving config/constants files with direct import updates.

Higher-risk areas:

- Moving Firebase/auth/storage helpers because many app flows depend on them.
- Moving `AdminPanel.tsx` because it is a large lazy-loaded module.

## Safety Strategy

1. Create this plan before editing.
2. Move files in batches:
   - Components/pages
   - Config/constants
   - Lib/infrastructure
   - Services
   - Alias/docs updates
3. Update imports immediately after each batch.
4. Run `npm run lint` with increased heap after meaningful batches when practical.
5. Run final verification:
   - `npm run lint`
   - `npm test -- --run`
   - `npm --prefix backend run build`
   - `npm run build`
6. Search for broken references to moved paths.
7. Do not delete uncertain files. Document uncertain/generated files in `FOLDER_STRUCTURE_TODO.md`.
