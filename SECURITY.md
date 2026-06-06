# Security Policy

## Supported Scope

This repository is a personal blog and browser arcade application backed by Express and SQLite. Security fixes should target the current `main` branch.

## Reporting Issues

Do not disclose sensitive vulnerabilities publicly before they are fixed. Report issues privately to the repository owner after the GitHub remote is configured.

## Production Baseline

Before deployment, set:

- `NODE_ENV=production`
- a long random `JWT_SECRET`
- a strong `ADMIN_PASSWORD`
- a strict `ALLOWED_ORIGINS` value
- a persistent `DB_PATH`

Run:

```bash
npm audit --audit-level=moderate
npm run check
npm run smoke:api
npm run smoke:games
```

## Built-In Guards

- CSP, HSTS, frame, referrer, permissions, and content-type headers
- production CORS allow-list
- source/config file disclosure blocking
- required production JWT secret
- API input validation
- image upload signature validation
- rate limits for login, comments, and uploads
- conservative Service Worker that skips `/api/`
