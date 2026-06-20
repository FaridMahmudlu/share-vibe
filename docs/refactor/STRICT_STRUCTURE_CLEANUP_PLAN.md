# ShareVibe Strict Structure Cleanup Plan

Date: 2026-05-26
Scope: structure cleanup only. No business logic, UI redesign, feature change, database schema change, dependency addition, or full security hardening is planned.

## Current Root Tree Summary

Must stay in root:

- Vite/npm entry and config: `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`.
- Firebase CLI config and deploy targets: `.firebaserc`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`.
- Repository guidance: `README.md`, `AGENTS.md`, `.gitignore`, `.env.example`.
- Tooling/local hidden folders that are expected at root or ignored: `.git/`, `.vscode/`, `node_modules/`, `.firebase/`.

Documentation currently in root:

- `FOLDER_STRUCTURE_PLAN.md`, `FOLDER_STRUCTURE_REPORT.md`, `FOLDER_STRUCTURE_TODO.md`, `PROJECT_AUDIT_REPORT.md`, `PRODUCTION_IMPROVEMENT_PLAN.md`, `REFACTOR_TODO.md`.

Config/templates currently in root:

- `access-emails.mjs`, `firebase-applet-config.json`, `firebase-blueprint.json`, `metadata.json`, `firestore.rules.template`.

Scripts and ops currently in root:

- `deploy.ps1`, `ssh-deploy.js`, `nginx-sharevibe.conf`.

Generated/local artifacts currently in root:

- Logs: `.codex-*.log`, `devserver.*.log`, `vite-admin-email.*.log`, `firebase-debug.log`.
- Archives and deploy packages: `assets.tar.gz`, `assets.zip`, `backend-dist.tar.gz`, `backend-src.tar.gz`, `deploy.zip`, `dist.tar.gz`, `sharevibe-admin-deploy.tar.gz`.
- QA screenshots/images: `admin-*.png`, `image.png`.
- Generated folders: `dist/`, `out/`, `tmp/`, `test-results/`, `.chrome-profile/`.

## Current Source Summary

Frontend:

- `src/main.tsx`: Vite React entrypoint.
- `src/App.tsx`: large SPA coordinator and query-string routing.
- `src/index.css`: large global CSS bundle.
- Existing professional folders: `pages/`, `components/`, `config/`, `context/`, `hooks/`, `lib/`, `services/`, `security/`, `seo/`, `remotion/`, `tests/`, `utils/`.
- Non-code docs still live in `src/security/`.

Backend:

- `backend/src/`: Express API, routes, middleware, services, queue, utilities, worker.
- `backend/prisma/`: Prisma schema, migration SQL, seed.
- `backend/dist/`: generated build output.
- Backend root has package/config files plus docs and service unit files.

Functions:

- `functions/index.js`, `functions/package.json`.
- No functions build script is currently defined.

## Proposed Professional Structure

Root:

```text
/
  src/
  backend/
  functions/
  public/
  docs/
  scripts/
  ops/
  config/
  package.json
  package-lock.json
  index.html
  vite.config.ts
  vitest.config.ts
  tsconfig.json
  firebase.json
  .firebaserc
  firestore.rules
  firestore.indexes.json
  storage.rules
  README.md
  AGENTS.md
  .gitignore
  .env.example
```

Docs:

```text
docs/
  audit/
  refactor/
  security/
  production/
  performance/
  seo/
  geo/
  deployment/
  assets/
```

Scripts:

```text
scripts/
  deploy/
  firebase/
  maintenance/
  dev/
  database/
```

Ops:

```text
ops/
  nginx/
  firebase/
  server/
  deployment/
  _local/
```

Config:

```text
config/
  access/
  ai-studio/
  firebase/
```

Source:

```text
src/
  app/
  styles/
  pages/
  components/
  config/
  context/
  hooks/
  lib/
  services/
  security/
  seo/
  remotion/
  tests/
  utils/
```

## Files Planned To Move

Root documentation:

- `FOLDER_STRUCTURE_PLAN.md` -> `docs/refactor/FOLDER_STRUCTURE_PLAN.md`
- `FOLDER_STRUCTURE_REPORT.md` -> `docs/refactor/FOLDER_STRUCTURE_REPORT.md`
- `FOLDER_STRUCTURE_TODO.md` -> `docs/refactor/FOLDER_STRUCTURE_TODO.md`
- `REFACTOR_TODO.md` -> `docs/refactor/REFACTOR_TODO.md`
- `PROJECT_AUDIT_REPORT.md` -> `docs/audit/PROJECT_AUDIT_REPORT.md`
- `PRODUCTION_IMPROVEMENT_PLAN.md` -> `docs/production/PRODUCTION_IMPROVEMENT_PLAN.md`

Existing docs:

- Move security docs into `docs/security/`.
- Move deployment docs into `docs/deployment/`.
- Move SEO/GEO docs into `docs/seo/` or `docs/geo/`.
- Move production/checklist docs into `docs/production/`.
- Move performance docs into `docs/performance/`.
- Keep general architecture/API/testing docs under `docs/production/` or `docs/refactor/` only where appropriate.

Root config and templates:

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
- `ssh-deploy.js` -> `ops/deployment/private/ssh-deploy.js` and document for security cleanup.

Frontend source:

- `src/App.tsx` -> `src/app/App.tsx`
- `src/index.css` -> `src/styles/index.css`
- `src/security/README.md` -> `docs/security/FRONTEND_SECURITY_README.md`
- `src/security/QUICK_START.md` -> `docs/security/FRONTEND_SECURITY_QUICK_START.md`

Generated/local artifacts:

- Move root logs and archives into ignored `ops/_local/` folders when preserving them is safer than deleting.
- Move root QA screenshots into `docs/assets/qa-screenshots/`.
- Move unclear `image.png` into `docs/assets/manual-review/image.png`.

## Files That Must Stay In Root And Why

- `index.html`: Vite HTML entrypoint.
- `package.json`, `package-lock.json`: npm root package and lockfile.
- `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`: root frontend tooling configs.
- `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`: Firebase CLI expects these root paths unless deploy config is also changed.
- `README.md`, `AGENTS.md`, `.gitignore`, `.env.example`: repository entry documentation and root-level tool conventions.

## Risky Files That Need Caution

- `firebase-applet-config.json`: used by frontend Firebase initialization and deploy scripts. Move only with import/script/doc updates.
- `firestore.rules.template`: source for generated Firestore rules. Move only with generator updates and verification.
- `deploy.ps1`: path-sensitive deployment script. Move only with project-root path handling.
- `ssh-deploy.js`: contains a hardcoded private credential. Move to ignored private ops storage and document for later security cleanup without exposing the credential.
- `src/App.tsx` and `src/index.css`: high-risk monoliths. Move only, do not refactor internals.
- `backend/dist/`, root archives, logs, and screenshots: generated or local evidence. Preserve or ignore, do not treat as source code.

## Safety Strategy

1. Create this plan before moving files.
2. Move docs/config/scripts/ops/source files in small batches.
3. Update imports, package scripts, Firebase script paths, docs links, and config references immediately after each batch.
4. Preserve uncertain artifacts under documented manual-review or ignored local-artifact folders.
5. Run verification:
   - `npm run lint`
   - `npm test -- --run`
   - `npm run build`
   - `npm --prefix backend run build`
   - functions build only if a build script exists
   - path/reference searches
6. Fix only errors caused by this structure cleanup.
