# ShareVibe Security Report

Generated: 2026-06-05

## Vulnerabilities Found

- Admin authorization was split across frontend allowlists, Firestore assumptions, Firebase custom claims, and backend/database-derived checks.
- Backend cafe admin access still allowed legacy ownership/admin-email paths instead of a single policy source.
- Firebase callable admin helpers could rely on broad admin-style custom claims instead of ShareVibe-specific Super Owner policy.
- Firestore/Storage rules had legacy admin checks and insufficient cafe-scoped custom-claim alignment.
- Upload rules needed stricter size/type/extension/path checks.
- Backend request protection needed stronger headers, smaller body limits, and endpoint-specific rate limiting.
- Public HTML/Nginx security headers and CSP needed tightening.
- SEO metadata and robots rules exposed unsupported or unnecessary public claims/paths.
- Dependency audit found high backend dependency advisories and remaining moderate transitive advisories.

## Fixed

- Added `config/access/policy.json` as the central access policy source and generated adapters for frontend, backend, and Firebase Functions.
- Added `npm run generate:access-policy` and wired deployment verification to regenerate access adapters and Firestore rules before build/deploy.
- Backend admin/cafe authorization now checks the central access policy and ShareVibe-specific roles instead of trusting frontend-only state, raw headers, Prisma cafe ownership, or settings `adminEmails`.
- Firebase callable functions now require central-policy Super Owner access for privileged admin actions and can sync ShareVibe-specific owner/manager/Super Owner custom claims.
- Frontend sign-in now attempts to sync ShareVibe access claims after Firebase Auth login and refreshes the ID token.
- Firestore rules were regenerated from the central policy template and now use ShareVibe-specific custom claims plus generated static fallback checks.
- Storage rules now use ShareVibe custom claims for admin access and enforce stricter content type, extension, size, metadata, and path checks for media/logo/campaign uploads.
- Backend security middleware now disables `x-powered-by`, sets stronger Helmet/CSP/HSTS-related headers, adds `Permissions-Policy`, reduces body limits, and applies endpoint-specific rate limits for sensitive/expensive routes.
- Nginx reference config now disables version tokens and removes unsafe script inline allowances from CSP.
- Public `index.html` removed placeholder analytics and unsupported inline Organization JSON-LD claims.
- `robots.txt` was reduced to public crawl/sitemap directives without listing internal/private paths.
- Backend high dependency advisories were fixed with a safe audit fix; audit gates now fail on high/critical issues.

## Remaining Risks

- `config/access/policy.json` is intentionally empty until real production Super Owner/cafe owner/manager emails are supplied. Deploying rules/functions without that data can lock out admins unless runtime fallbacks are configured.
- Full CVE-003/CVE-004 upload hardening still requires moving image uploads through a backend/Cloud Function pipeline for magic-byte validation, image normalization, and EXIF stripping. Firebase Storage Rules cannot inspect file bytes or remove metadata.
- Backend audit still reports moderate transitive `uuid` advisories through dependency chains where the available npm fix is forced/breaking.
- Password/MFA enforcement is delegated to Firebase Auth/Google sign-in and must be finalized in the identity provider for privileged users.
- Firebase Functions, Firestore rules, and Storage rules must be deployed separately from the static VPS deploy for the server-side authorization changes to take effect in production.

## Verification Summary

- `npm run generate:access-policy`: passed.
- `npm run generate:rules`: passed.
- `npm run lint`: passed.
- `npm test -- --run`: passed, 1 test file and 8 tests.
- `npm --prefix backend run build`: passed.
- `npm --prefix functions test`: passed.
- `npm --prefix functions run build --if-present`: passed.
- `npm run build`: passed.
- `npm run security:audit`: passed for high/critical gates; backend still reports documented moderate `uuid` advisories.
- Tracked sensitive artifact filename scan: no tracked `.env`, `.deploy.env`, private key, dump, log, archive, upload, or build output was found; `.env.example` is intentionally tracked.
- `npm run deploy:check`: failed closed because the configured deployment user is `root`, password fallback is not supported by this Windows script path, and `SHAREVIBE_DEPLOY_PATH` is not set.
- `npm run deploy:discover`: failed closed for the same deployment environment errors.
- `npm run deploy:health`: passed for current `https://sharevibe.co` with HTTP 200.
- Production deploy: not attempted because deployment safety gates failed.
