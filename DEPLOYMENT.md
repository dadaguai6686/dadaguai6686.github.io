# Deployment Notes

## Required Environment Variables

- `NODE_ENV=production`
- `PORT=3000`
- `JWT_SECRET`: long random string for admin JWT signing
- `ADMIN_USERNAME`: initial admin username when the database is empty
- `ADMIN_PASSWORD`: initial admin password when the database is empty
- `ALLOWED_ORIGINS`: comma-separated browser origins allowed to call the API

Copy `.env.example` to `.env` for local production-style testing.

## Local Checks

```bash
npm ci
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

Do not commit:

- `.env`
- `node_modules/`
- `blog.db`
- runtime files under `uploads/`
