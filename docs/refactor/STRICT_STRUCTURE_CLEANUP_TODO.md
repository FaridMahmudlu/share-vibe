# ShareVibe Strict Structure Cleanup TODO

Date: 2026-05-26

No required code fixes are known from the strict structure cleanup. Verification passed after the moves.

## Manual Review

- Review `ops/deployment/private/ssh-deploy.js` and remove the hardcoded private credential in a dedicated security task. The file is preserved locally and ignored.
- Review `docs/assets/manual-review/image.png` and decide whether it is useful documentation evidence or can be removed.
- Review `ops/_local/` and delete local logs, archives, browser profiles, test output, and temporary files when no longer needed.

## Future Structure Work

- Split `src/app/App.tsx` into smaller app, gallery, upload, auth, SEO, and modal modules.
- Split `src/pages/admin/AdminPanel.tsx` by admin feature area.
- Split `src/styles/index.css` into smaller style layers after visual regression coverage exists.
- Consider a public asset URL migration plan before moving `public/story-templates/`, `public/sharevibe-icon.png`, or `public/sharevibe-logo.png`.
- Consider adding a real `functions` build/test setup if Firebase Functions work will continue.

## Not Done In This Task

- No backend auth/CORS hardening.
- No Firestore or Storage rule behavior changes.
- No database schema changes.
- No SEO route/content corrections.
- No UI redesign or responsive redesign.
