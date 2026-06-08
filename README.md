# Atherix Digital Space

Atherix Digital Space is a polished personal blog, developer toolbox, project showcase, guestbook, and browser arcade built with vanilla HTML, CSS, JavaScript, Express, and SQLite.

## Highlights

- Blog list and article reader with hash routes such as `#post/post-1`
- Admin CRUD APIs for posts, projects, comments, and image uploads
- Developer tools: JSON formatter, Markdown preview, image conversion, Pomodoro, codec/hash tools, and synth piano
- Premium browser arcade:
  - Cyber Astro-Runner platform game
  - Starcore Survivor
  - Prism Boss Rush
  - Cyber Heist
  - Alchemy Chain
- PWA shell with a conservative Service Worker cache for static assets
- Production hardening:
  - strict security headers and CSP
  - production CORS allow-list
  - required production `JWT_SECRET`
  - API input validation
  - image upload signature checks
  - source/config file disclosure blocking
  - rate limits for login, comments, and uploads

## Quick Start

```bash
npm ci
npm run check
npm run smoke:api
npm run smoke:games
npm start
```

Open:

```text
http://127.0.0.1:3000
```

## Environment

Copy `.env.example` to `.env` for production-style runs and replace every placeholder:

```bash
cp .env.example .env
```

Required production values:

- `NODE_ENV=production`
- `PORT`
- `DB_PATH`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ALLOWED_ORIGINS`

## Verification

```bash
npm audit --audit-level=moderate
npm run check
npm run smoke:api
npm run smoke:games
```

`smoke:api` starts a temporary production server and verifies API health, security headers, CORS behavior, sensitive-file blocking, input validation, admin login, and forged image upload rejection.

`smoke:games` starts a temporary local server and drives a headless browser through blog reading, the main platform game Space/Enter behavior, all premium arcade panels, canvas rendering, and Service Worker registration.

## Docker

```bash
docker compose up -d --build
docker compose ps
```

The Compose setup uses `.env`, stores SQLite data under `./data`, and persists uploads under `./uploads`.

## GitHub

The repository includes:

- CI for npm install, audit, syntax checks, API smoke tests, and Docker build
- Dependabot for npm packages and GitHub Actions

After adding a remote:

```bash
git remote add origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

## Security Notes

Do not commit `.env`, `blog.db`, `data/`, `node_modules/`, or runtime uploads. See `DEPLOYMENT.md` for production deployment details.
