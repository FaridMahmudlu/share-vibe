# Deployment Autodiscovery Report

Generated: 2026-06-06T17:34:16.003Z

## Result

- Status: blocked
- Discovered path: not confirmed
- Confidence: none

## Evidence

- Local ops/nginx candidate: /var/www/sharevibe/html
- Remote Nginx matching root count: 0
- Remote Nginx matching alias count: 0
- Remote Nginx matching proxy_pass count: 0

## Notes

- Remote discovery was not attempted because required deployment connection variables are missing or invalid.
- Set deployment credentials and rerun npm run deploy:discover, or provide SHAREVIBE_DEPLOY_PATH explicitly.
- The repository Nginx sample contains a local candidate, but local config alone is not reliable enough to deploy.

No credentials, private keys, tokens, or raw server config contents are stored in this report.
