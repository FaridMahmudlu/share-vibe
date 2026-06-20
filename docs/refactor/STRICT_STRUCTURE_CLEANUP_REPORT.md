# ShareVibe Strict Structure Cleanup Report

Date: 2026-05-26
Scope: structure cleanup only. No business logic, UI redesign, feature change, database schema change, or new dependency was introduced.

## Final Root Tree

```text
/
  .env.example
  .firebaserc
  .gitignore
  AGENTS.md
  README.md
  package.json
  package-lock.json
  index.html
  vite.config.ts
  vitest.config.ts
  tsconfig.json
  firebase.json
  firestore.rules
  firestore.indexes.json
  storage.rules
  backend/
  config/
  docs/
  functions/
  ops/
  public/
  scripts/
  src/
```

Generated/local folders may also exist locally and are ignored: `dist/`, `node_modules/`, `.firebase/`, `.codex/`, and `ops/_local/`.

## Final Source Tree Summary

```text
src/
  main.tsx
  vite-env.d.ts
  app/
    App.tsx
  styles/
    index.css
  pages/
    landing/
    admin/
  components/
    brand/
    common/
    pricing/
    ui/
  config/
  context/
  hooks/
  lib/
  remotion/
  security/
  seo/
  services/
  tests/
  utils/
```

`src/app/App.tsx`, `src/pages/admin/AdminPanel.tsx`, and `src/styles/index.css` remain high-risk monoliths. They were moved only; internals were not refactored.

## Final Backend And Functions Summary

```text
backend/
  package.json
  package-lock.json
  tsconfig.json
  .env.example
  .gitignore
  README.md
  FILE_STRUCTURE.md
  INTEGRATION_GUIDE.md
  prisma/
  src/
```

```text
functions/
  index.js
  package.json
```

Backend systemd service files were moved to `ops/server/`. Backend generated build output remains ignored under `backend/dist/`.

## Files Moved

Root docs:

- `FOLDER_STRUCTURE_PLAN.md` -> `docs/refactor/FOLDER_STRUCTURE_PLAN.md`
- `FOLDER_STRUCTURE_REPORT.md` -> `docs/refactor/FOLDER_STRUCTURE_REPORT.md`
- `FOLDER_STRUCTURE_TODO.md` -> `docs/refactor/FOLDER_STRUCTURE_TODO.md`
- `REFACTOR_TODO.md` -> `docs/refactor/REFACTOR_TODO.md`
- `PROJECT_AUDIT_REPORT.md` -> `docs/audit/PROJECT_AUDIT_REPORT.md`
- `PRODUCTION_IMPROVEMENT_PLAN.md` -> `docs/production/PRODUCTION_IMPROVEMENT_PLAN.md`

Docs:

- Existing docs were grouped under `docs/audit/`, `docs/deployment/`, `docs/geo/`, `docs/performance/`, `docs/production/`, `docs/security/`, and `docs/seo/`.
- `src/security/README.md` -> `docs/security/FRONTEND_SECURITY_README.md`
- `src/security/QUICK_START.md` -> `docs/security/FRONTEND_SECURITY_QUICK_START.md`

Config:

- `access-emails.mjs` -> `config/access/emails.mjs`
- `firebase-applet-config.json` -> `config/firebase/firebase-applet-config.json`
- `firestore.rules.template` -> `config/firebase/firestore.rules.template`
- `firebase-blueprint.json` -> `config/ai-studio/firebase-blueprint.json`
- `metadata.json` -> `config/ai-studio/metadata.json`

Scripts and ops:

- `scripts/firebase-deploy.mjs` -> `scripts/firebase/firebase-deploy.mjs`
- `scripts/generate-firestore-rules.mjs` -> `scripts/firebase/generate-firestore-rules.mjs`
- `scripts/generate-sitemaps.mjs` -> `scripts/maintenance/generate-sitemaps.mjs`
- `scripts/generate-sitemaps.ts` -> `scripts/maintenance/generate-sitemaps.ts`
- `deploy.ps1` -> `scripts/deploy/deploy.ps1`
- `nginx-sharevibe.conf` -> `ops/nginx/sharevibe.conf`
- `backend/sharevibe-api.service` -> `ops/server/sharevibe-api.service`
- `backend/sharevibe-worker.service` -> `ops/server/sharevibe-worker.service`
- `ssh-deploy.js` -> `ops/deployment/private/ssh-deploy.js`

Frontend:

- `src/App.tsx` -> `src/app/App.tsx`
- `src/index.css` -> `src/styles/index.css`

Local artifacts:

- Root logs and archives were moved to ignored `ops/_local/` folders.
- Root QA screenshots were moved to `docs/assets/qa-screenshots/`.
- Unclear root `image.png` was moved to `docs/assets/manual-review/image.png`.
- The old root `image.png` path was removed from Git tracking; the preserved manual-review copy is ignored.

## Imports Updated

- `src/main.tsx` now imports `src/app/App.tsx` and `src/styles/index.css`.
- `src/app/App.tsx` now uses the existing `@/*` alias for app imports.
- `src/lib/firebase/client.ts` now imports Firebase config from `config/firebase/firebase-applet-config.json`.
- Documentation examples and active path references were updated for the new `src/app`, `src/styles`, `config/`, `scripts/`, and `ops/` locations.

## Scripts Updated

- `package.json` scripts now point to:
  - `scripts/firebase/generate-firestore-rules.mjs`
  - `scripts/maintenance/generate-sitemaps.mjs`
  - `scripts/firebase/firebase-deploy.mjs`
- `scripts/firebase/firebase-deploy.mjs` now resolves the project root from `scripts/firebase/`.
- `scripts/firebase/generate-firestore-rules.mjs` now reads `config/access/emails.mjs` and `config/firebase/firestore.rules.template`.
- `scripts/maintenance/generate-sitemaps.mjs` now writes to `../../public` from its new location.
- `scripts/deploy/deploy.ps1` now resolves `dist` and the deploy archive from the project root.

## Files Ignored

`.gitignore` now covers:

- Root/backend/functions dependency and build output folders.
- Local browser/test/tmp output.
- `ops/_local/`.
- `ops/deployment/private/`.
- `docs/assets/manual-review/`.
- Logs, archives, zips, and deployment zip output.
- Environment files while preserving `.env.example` and `backend/.env.example`.

## Files Kept In Root And Why

- `index.html`: Vite HTML entry.
- `package.json`, `package-lock.json`: npm root package and lockfile.
- `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`: root frontend tooling.
- `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`: Firebase CLI root configuration and rule targets.
- `README.md`, `AGENTS.md`, `.gitignore`, `.env.example`: repository entry docs and root tool conventions.

## Files Requiring Manual Review

- `ops/deployment/private/ssh-deploy.js`: preserved locally and ignored because it contains a hardcoded private credential. Remove the credential in a dedicated security task.
- `docs/assets/manual-review/image.png`: moved from root, purpose unclear.
- `ops/_local/`: preserved logs, archives, browser profile, test output, and temporary artifacts. Review before deleting locally.
- `public/story-templates/` and root public brand image paths were not moved to avoid breaking saved/public URLs.
- `functions/` has no build script; only `serve`, `deploy`, `logs`, and `test` scripts are defined.

## Verification Commands

Commands were run with `C:\Program Files\nodejs` temporarily added to `PATH` where needed.

- `npm run generate:rules`: PASS.
- `npm run lint` with `NODE_OPTIONS=--max-old-space-size=8192`: PASS.
- `npm test -- --run`: PASS, 1 test file and 8 tests.
- `npm --prefix backend run build`: PASS.
- `npm run generate:sitemaps`: PASS.
- `npm run build`: PASS.
- `npm --prefix functions run build --if-present`: PASS/no-op; no functions build script exists.
- Search for stale runtime imports and old moved source paths: PASS.
- Search for root-level `.log`, archive, zip, and screenshot clutter: PASS.
- Search for generated artifacts still tracked by Git patterns: PASS.

## Pass/Fail Status

PASS. The structure cleanup builds, typechecks, tests, and preserves framework-required root files.
