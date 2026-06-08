# Deployment Notes

## Required Environment Variables

- `NODE_ENV=production`
- `PORT=3000`
- `DB_PATH`: SQLite database path; keep this on a persistent disk or volume
- `JWT_SECRET`: long random string for admin JWT signing
- `ADMIN_USERNAME`: initial admin username when the database is empty
- `ADMIN_PASSWORD`: initial admin password when the database is empty
- `ALLOWED_ORIGINS`: comma-separated browser origins allowed to call the API

Copy `.env.example` to `.env` for local production-style testing.

## Local Checks

```bash
npm ci
npm audit --audit-level=moderate
npm run check
npm start
```

Then open:

```text
http://127.0.0.1:3000/api/health
```

## GitHub

This project includes a basic GitHub Actions workflow at `.github/workflows/ci.yml`.
It runs `npm ci` and `npm run check` on pushes and pull requests.

## Docker

Create a production `.env` file before running Compose:

```bash
cp .env.example .env
```

Then replace every placeholder value, especially `JWT_SECRET`, `ADMIN_PASSWORD`,
and `ALLOWED_ORIGINS`.

```bash
docker compose up -d --build
docker compose ps
```

The container includes a `/api/health` healthcheck and runs as the non-root
`node` user. Compose mounts `./data` to store `blog.db` and mounts `./uploads`
for images. Back up both directories so posts, projects, comments, and uploaded
images survive redeploys.

Do not commit:

- `.env`
- `node_modules/`
- `blog.db`
- `data/`
- runtime files under `uploads/`
