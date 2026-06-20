# ShareVibe Security Checklist

## Required Before Production Deploy

- [ ] Rotate the previously exposed deployment credential category listed in `SECRET_ROTATION_TODO.md`.
- [ ] Create a non-root deploy user with SSH key authentication.
- [ ] Set backend Firebase Admin credentials.
- [ ] Set `BREVO_WEBHOOK_TOKEN` and configure Brevo to send it.
- [ ] Set Firebase admin custom claims for production admins.
- [ ] Confirm no production route depends on frontend-only admin checks.
- [ ] Re-run `npm run generate:rules` before deploying Firestore rules.
- [ ] Confirm Storage public-read media behavior is intentional.
- [ ] Resolve or formally accept remaining backend dependency audit advisories.
- [ ] Run the full deployment checklist in `docs/deployment/DEPLOYMENT_CHECKLIST.md`.

## Operational Controls

- [ ] Restrict Firebase API keys by domain in Google Cloud.
- [ ] Enable Firebase App Check where compatible.
- [ ] Restrict CORS to production origins in production.
- [ ] Review logs to avoid PII, tokens, auth headers, and uploaded media URLs.
- [ ] Keep `.env`, `.deploy.env`, keys, archives, dumps, logs, uploads, and service accounts out of git.
