# ShareVibe Folder Structure TODO

Date: 2026-05-26

No required code TODOs are known from the structure refactor. Verification passed after moving files and updating imports.

## Manual Cleanup Decisions

- Decide whether to remove or ignore generated/local artifacts currently present at the repository root: `dist/`, `out/`, `tmp/`, `test-results/`, `.chrome-profile/`, logs, screenshots, archives, and deploy packages.
- Do not delete those files blindly because some may be intentionally retained deployment artifacts or local QA evidence.

## Historical Documentation

- `docs/SECURITY_AUDIT_REPORT.md` still references old paths such as `src/accessConfig.ts`, `src/AdminPanel.tsx`, and `src/pendingUpload.ts`.
- These references were kept because the file appears to be a historical audit report. Update them only if the team wants historical reports normalized to current paths.

## Future Refactors

- Split `src/App.tsx` into smaller route/view, gallery, upload, SEO, and modal modules.
- Split `src/pages/admin/AdminPanel.tsx` into feature folders for dashboard, gallery, campaigns, customers, QR, templates, and settings.
- Split `src/index.css` into smaller domain-owned CSS files or Tailwind layers after browser visual regression checks are in place.
- Consider extracting shared frontend types into `src/types/` once interfaces are reused across multiple modules.
- Consider moving public images/icons into `public/assets/` only with a URL, manifest, sitemap, and cache review.
- Consider backend structure cleanup later, especially shared Prisma client ownership, after authentication and CORS hardening are addressed.
