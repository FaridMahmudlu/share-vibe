# ShareVibe Production Deployment Checklist

## Before Deployment

- [ ] No real secrets in tracked files.
- [ ] `.deploy.env` exists locally and is ignored.
- [ ] `SHAREVIBE_DEPLOY_USER` is not `root`.
- [ ] SSH key auth works for the deploy user.
- [ ] `SHAREVIBE_DEPLOY_PATH` is set or `npm run deploy:discover` confirms one path with high confidence.
- [ ] Backend environment includes Firebase Admin credentials and `BREVO_WEBHOOK_TOKEN`.
- [ ] Firebase admin custom claims are set for production admins.
- [ ] `npm run lint` passes.
- [ ] `npm test -- --run` passes.
- [ ] `npm run build` passes.
- [ ] `npm --prefix backend run build` passes.
- [ ] `npm --prefix functions run build --if-present` passes.
- [ ] `npm run security:audit` passes or documented non-breaking exceptions are accepted.

## Deployment

- [ ] Run `npm run deploy:production`.
- [ ] Confirm backup creation in the remote `backups/` directory.
- [ ] Confirm release activation.
- [ ] Confirm `npm run deploy:health`.
- [ ] If health fails, confirm rollback completed.

## Current Gate Status

- Deployment was not attempted on 2026-06-05.
- `npm run deploy:check` failed closed because `SHAREVIBE_DEPLOY_USER` is configured as `root`, password fallback is unsupported on this Windows script path, and `SHAREVIBE_DEPLOY_PATH` is not set.
- `npm run deploy:discover` did not connect to the server because deployment credentials failed validation.
- Current production health check passed for `https://sharevibe.co` with HTTP 200.
- Backend dependency audit still reports moderate transitive `uuid` advisories; the available automatic fix is forced/breaking and was not applied.
- Next deploy attempt requires a non-root deploy user, SSH key authentication, and either a confirmed `SHAREVIBE_DEPLOY_PATH` or successful autodiscovery.
