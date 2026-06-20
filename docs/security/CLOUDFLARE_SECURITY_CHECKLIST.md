# Cloudflare Security Checklist

For `sharevibe.co`:

- [ ] Force HTTPS and enable HSTS only after certificate and subdomain readiness are confirmed.
- [ ] Enable WAF managed rules for OWASP common attacks.
- [ ] Add rate limiting for `/api/*`, `/public/webhooks/*`, and expensive form/API endpoints.
- [ ] Block obvious bad bots and known malicious IP reputation categories.
- [ ] Keep caching conservative for the SPA HTML and API responses.
- [ ] Cache static hashed assets aggressively.
- [ ] Enable bot fight or equivalent bot protection if it does not break Firebase Auth.
- [ ] Confirm `/api/*` is proxied only to the intended backend origin.
- [ ] Monitor 4xx/5xx spikes after enabling rules.
