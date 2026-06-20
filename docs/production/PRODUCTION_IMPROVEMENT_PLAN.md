# ShareVibe Production Improvement Plan

Date: 2026-05-26
Principle: safe incremental changes only. Do not delete features, rewrite the project, or change visual identity unless required for responsiveness, accessibility, security, or correctness.

## 1. Folder/File Structure Refactor

Goal: reduce production change risk without changing behavior.

Priority tasks:

1. Move generated and operational artifacts out of source control scope.
   - Review root artifacts: `dist/`, `out/`, `tmp/`, `test-results/`, `*.log`, screenshots, `*.zip`, `*.tar.gz`.
   - Expand `.gitignore` for archives, screenshots, test artifacts, local browser profiles, and generated deploy packages.
   - Do not delete user files in this pass unless explicitly requested.

2. Split high-risk frontend monoliths incrementally.
   - Extract `App.tsx` gallery/upload/auth/view helpers into small hooks/components.
   - Extract `AdminPanel.tsx` by domain: dashboard, posts/gallery, campaigns, QR, customers, marketing/templates, stats, settings.
   - Keep public props and behavior stable during each extraction.

3. Split global CSS by ownership.
   - Keep current visual identity.
   - Group CSS by landing, app/gallery, admin, shared tokens, and utilities.
   - Avoid broad selector rewrites unless covered by browser verification.

4. Clarify deployment ownership.
   - Decide whether `sharevibe.co` is primarily served by Firebase Hosting, VPS/Nginx, or a hybrid setup.
   - Keep `firebase.json`, `ops/nginx/sharevibe.conf`, and deploy scripts consistent with that decision.

Verification after each meaningful refactor:

- `npm run lint`
- `npm test -- --run`
- `npm run build`
- `npm --prefix backend run build` if backend files changed

## 2. Security

Goal: harden auth, authorization, secrets, and public data boundaries before production expansion.

Priority tasks:

1. Verify Firebase ID tokens in backend.
   - Replace header-trust in `backend/src/middleware/auth.ts` with server-side Firebase Admin token verification.
   - Accept `Authorization: Bearer <idToken>`.
   - Derive uid, email, email verification, and custom claims from the verified token only.
   - Keep existing cafe ownership checks, but base them on verified identity.

2. Restrict production CORS.
   - Allow `https://sharevibe.co` and `https://www.sharevibe.co`.
   - Allow local dev origins such as `http://localhost:3000` only outside production.
   - Document any Firebase auth helper origins.

3. Remove legacy super-admin email dependency.
   - Complete custom-claims migration.
   - Remove hardcoded email fallback from frontend/backend/rules only after claims are verified in production.
   - Keep a rollback plan.

4. Review Firebase rules against product privacy.
   - Confirm public read on `media`, `cafes`, and campaigns is intentional.
   - Confirm Storage read publicness is intentional for gallery media.
   - Tighten `/campaigns/{cafeSlug}` Storage upload to cafe owners/managers if those files are not public user uploads.

5. Add App Check and API key restrictions.
   - Keep Firebase web config public but restrict abuse through Firebase console controls.
   - Do not duplicate live keys in documentation.

6. Protect backend operations.
   - Add rate limiting for auth-sensitive and write-heavy endpoints.
   - Ensure request body limits match real payload needs.
   - Remove sensitive production logs.
   - Use a shared Prisma client pattern.
   - Move scheduled campaign dispatch to one controlled worker/cron path if scaling API horizontally.

7. Secret hygiene.
   - Do not commit `.env`, service account files, tokens, dumps, logs, private generated files, uploads, or archives.
   - Verify backend production environment has `DATABASE_URL`, `REDIS_URL`, `BREVO_API_KEY`, sender settings, and limits.

Verification:

- `npm --prefix backend run build`
- `npm run lint`
- Firebase rules dry-run/emulator tests if added
- Manual auth tests: unauthenticated, normal user, owner, manager, super admin

## 3. Responsive UI

Goal: make the existing experience robust on mobile, tablet, and desktop without redesigning the brand.

Priority tasks:

1. Establish viewport QA matrix.
   - Mobile: 360x740, 390x844, 430x932.
   - Tablet: 768x1024, 1024x768.
   - Desktop: 1366x768, 1440x900, 1920x1080.

2. Test critical flows.
   - Landing navigation and pricing CTA.
   - Google sign-in entry points.
   - QR gallery upload modal.
   - Image preview/edit/upload progress.
   - Share modal and story share.
   - Owner/admin dashboard.
   - Posts/gallery management.
   - Campaign editor.
   - Customers table/export.
   - QR stand management.
   - Settings and billing/admin users.

3. Fix only verified layout defects.
   - Text overflow.
   - Horizontal page overflow.
   - Button label clipping.
   - Modal viewport clipping.
   - Dense admin toolbars on mobile.
   - Tables that need intentional horizontal scroll.

4. Preserve visual identity.
   - Keep current cafe colors, typography, premium dark/warm style, and icon language unless accessibility requires adjustment.

Verification:

- Browser screenshots for the matrix above.
- `npm run lint`
- `npm run build`

## 4. Performance

Goal: improve real user performance while preserving feature behavior.

Priority tasks:

1. Measure first.
   - Use Lighthouse or browser performance traces on landing, gallery, and admin.
   - Track bundle sizes after `npm run build`.

2. Frontend improvements.
   - Reduce initial JS by keeping admin lazy and considering further lazy chunks for heavy admin subviews.
   - Replace remote Unsplash hero/gallery examples with optimized local or CDN-controlled assets where appropriate.
   - Add responsive image sizes where real assets are used.
   - Keep Google Fonts intentional; consider self-hosting or reducing families.
   - Split and prune global CSS after ownership is clear.

3. Data/loading improvements.
   - Keep gallery queries bounded.
   - Add pagination/infinite loading if galleries grow.
   - Avoid realtime listeners for admin data that does not need realtime behavior.

4. Backend improvements.
   - Reuse Prisma clients.
   - Separate worker/scheduler responsibilities from API process for horizontal scaling.
   - Add cache headers for static assets based on final hosting platform.

Verification:

- `npm run build`
- Compare chunk sizes and Lighthouse/Core Web Vitals before and after.
- `npm --prefix backend run build` for backend changes.

## 5. SEO

Goal: make public search signals factual, crawlable, and consistent with the actual app.

Priority tasks:

1. Align routing, canonical URLs, and sitemaps.
   - Either implement real path handling for `/cafe/{slug}` or change canonical/sitemaps to the actual query-string URLs.
   - Remove sitemap routes that do not exist.

2. Remove unsupported SEO claims.
   - Remove fake or placeholder social profiles, phone numbers, addresses, cafe pages, blog URLs, and image URLs.
   - Do not publish fake reviews, fake awards, fake statistics, or fake legal claims.

3. Fix language alternates.
   - Remove `/en/` hreflang until a real English route exists.
   - Keep Turkish metadata accurate for current content.

4. Add real public content routes only when content exists.
   - Privacy policy, terms, cookie policy, and commercial communication text currently appear inside the landing modal. Decide whether they need standalone crawlable pages.

5. Structured data.
   - Keep Organization/WebSite data factual.
   - Do not include LocalBusiness aggregate ratings or address fields unless verified per cafe.

Verification:

- `npm run generate:sitemaps`
- `npm run build`
- Inspect `dist/index.html` and generated `public/sitemap*.xml`
- Search Console validation after deployment

## 6. GEO

Goal: make ShareVibe understandable and citeable by AI search systems without inventing facts.

Priority tasks:

1. Create factual product source pages.
   - What ShareVibe does.
   - How QR photo sharing works.
   - What cafe owners can manage.
   - What data is collected.
   - Pricing/plan facts only if current and accurate.
   - Security and privacy summary based on implemented controls.

2. Add concise FAQ content grounded in product reality.
   - Installation flow.
   - Guest upload flow.
   - Owner/admin permissions.
   - Email marketing availability.
   - Data retention and deletion.

3. Keep entity consistency.
   - Use the same product name, domain, descriptions, and support/contact details across `index.html`, schema, manifest, robots, docs, and public copy.

4. Avoid unsupported authority signals.
   - No fake awards, media mentions, customer counts, ratings, testimonials, addresses, or legal guarantees.

Verification:

- Manual content review against repo/source of truth.
- SEO schema validation.
- No unsupported claims in public files.

## 7. Final Production QA

Goal: verify the full production story end to end before launch or major release.

QA checklist:

1. Commands.
   - `npm run lint`
   - `npm test -- --run`
   - `npm run build`
   - `npm --prefix backend run build`
   - `npm run generate:rules`
   - `npm run generate:sitemaps`

2. Firebase.
   - Firestore rules deployed to the intended database.
   - Storage rules deployed.
   - Functions deployed and callable.
   - Custom claims migration complete.
   - Auth authorized domains include production domain.

3. Backend.
   - API starts with production env.
   - Worker starts with production env.
   - Redis and PostgreSQL health verified.
   - Brevo sandbox/live mode intentionally set.
   - Unsubscribe links work.

4. Browser flows.
   - Landing loads.
   - Owner sign-in works.
   - Unauthorized users cannot access private data.
   - Owner can manage only owned/managed cafe.
   - Super admin can manage intended workspaces.
   - Guest can upload to intended public gallery.
   - Upload limits and delete windows behave as expected.
   - Campaign creation, scheduling, sending, archive/restore work.
   - Customer export works.
   - QR stand sync/request works.

5. SEO/GEO.
   - Robots and sitemaps are production accurate.
   - Canonicals are consistent.
   - Structured data validates.
   - No fake or placeholder public claims.

6. Monitoring and rollback.
   - Error tracking configured or consciously disabled.
   - Server logs avoid sensitive data.
   - Deployment rollback path documented for frontend, backend, rules, and functions.

Final gate:

- Do not ship if backend auth still trusts caller-controlled identity headers.
