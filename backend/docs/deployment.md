# Deployment guide

Free tier throughout: Vercel (client), Render (API), MongoDB Atlas M0. Every
limit below is real and will be hit — they are documented rather than discovered.

## 1. MongoDB Atlas

1. Create a free **M0** cluster.
2. **Database Access** → add a user with *Read and write to any database*.
3. **Network Access** → add `0.0.0.0/0`. Render's free tier has no static
   egress IP, so an allow-list of specific addresses cannot work.
4. Copy the connection string and append the database name:
   `mongodb+srv://user:pass@cluster.mongodb.net/kinora?retryWrites=true&w=majority`

### Optional: Atlas Search

Without this, search falls back to a MongoDB text index — functional, but no
fuzzy matching or autocomplete. To enable it, create an index named
`titles_search` on **both** `movies` and `tvshows`:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title":     [{ "type": "string" }, { "type": "autocomplete", "tokenization": "edgeGram" }],
      "overview":  { "type": "string" },
      "keywords":  { "type": "string" },
      "directors": { "type": "string" },
      "cast":      { "type": "document", "fields": { "name": { "type": "string" } } }
    }
  }
}
```

Then set `ATLAS_SEARCH_ENABLED=true`. The code path switches automatically; no
other change is needed.

> **M0 limits:** 512 MB storage, 500 collections, shared CPU, no backups.
> The TTL indexes on ephemeral collections (sessions, parties, chat,
> notifications, search history, activity) exist specifically so the 512 MB is
> not consumed by data nobody will ever read.

## 2. API on Render

**New → Web Service**, connect the repository.

| Setting | Value |
|---|---|
| Root directory | *(leave blank — the build needs the workspace root)* |
| Build command | `npm ci && npm run build:shared && npm run build -w @kinora/backend` |
| Start command | `npm run start -w @kinora/backend` |
| Health check path | `/api/v1/health` |

Environment variables:

```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://…/kinora
JWT_ACCESS_SECRET=<64 hex chars>
JWT_REFRESH_SECRET=<64 hex chars, different>
CLIENT_URL=https://your-app.vercel.app
SERVER_URL=https://your-api.onrender.com
CROSS_SITE_COOKIES=true
```

Generate the secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server **refuses to start** in production without these, and refuses if the
two secrets are equal. Booting half-configured is worse than not booting.

### `CROSS_SITE_COOKIES` is load-bearing

Vercel and Render are different sites, so the refresh cookie is cross-site. It
must be `SameSite=None`, which browsers only honour with `Secure`. Setting this
flag switches both. Leave it `false` for same-origin or local development, where
`SameSite=Lax` gives free CSRF protection.

With `SameSite=None`, SameSite is no longer providing that protection. What
covers the gap: a strict CORS allow-list (not a reflector), `credentials: true`
paired with explicit origins only, and the fact that `POST /auth/refresh` is the
sole cookie-authenticated endpoint — every other mutation needs the Bearer token,
which a cross-site attacker cannot read.

### Free-tier cold starts

Render spins a free service down after ~15 minutes idle. The next request pays
**30–60 seconds**. Options:

- Accept it, and say so on the landing page.
- Ping `/api/v1/health` every 10 minutes from a free cron (cron-job.org,
  GitHub Actions schedule). This is against the spirit of the free tier if
  abused; a 10-minute interval is the polite end.
- Upgrade to the $7/month instance.

The health endpoint is deliberately excluded from request logging so a keep-alive
pinger does not drown the log.

## 3. Client on Vercel

**Add New → Project**, import the repository.

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Root directory | `client` |
| Build command | `cd .. && npm ci && npm run build:shared && npm run build -w @kinora/frontend` |
| Install command | `npm ci` |

Environment variable:

```bash
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
```

This is baked in at build time and is public — it is a URL, not a secret. It
also feeds the CSP `connect-src` and `img-src` directives, so changing the API
host requires a **rebuild**, not just an env update.

### Preview deployments

Each Vercel preview gets its own URL, which CORS will reject. Either add them to
`CORS_EXTRA_ORIGINS` (comma-separated) or accept that previews talk to nothing.

## 4. Seed the deployment

```bash
MONGODB_URI="mongodb+srv://…/kinora" \
SEED_ADMIN_EMAIL="you@example.com" \
SEED_ADMIN_PASSWORD="…" \
npm run seed
```

Run from your machine against the production URI. The seed is idempotent — it
never overwrites an existing account's password, so re-running after a schema
change is safe.

With a TMDB key, `npm run seed:tmdb` replaces the fixture metadata and generated
artwork with real TMDB data and posters.

## 5. Optional integrations

| Feature | Variables | Without it |
|---|---|---|
| Email | `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | Links logged server-side; returned in API responses in dev only |
| Google OAuth | `GOOGLE_CLIENT_ID` `GOOGLE_CLIENT_SECRET` | Button hidden, route 404s |
| GitHub OAuth | `GITHUB_CLIENT_ID` `GITHUB_CLIENT_SECRET` | Same |
| Cloudinary | `CLOUDINARY_CLOUD_NAME` `CLOUDINARY_API_KEY` `CLOUDINARY_API_SECRET` | Uploads fall back to local disk; bundled avatars still work |
| TMDB | `TMDB_API_KEY` | `npm run seed:tmdb` unavailable; fixtures still seed |

OAuth callback URLs must be registered with each provider:

```
https://your-api.onrender.com/api/v1/auth/google/callback
https://your-api.onrender.com/api/v1/auth/github/callback
```

## 6. Post-deploy checklist

```bash
# 1. API is up and reached the database
curl https://your-api.onrender.com/api/v1/health
# → { "data": { "status": "ok", "database": "connected", "features": {…} } }

# 2. Security headers are present
curl -I https://your-app.vercel.app | grep -i "content-security-policy\|x-frame"

# 3. CORS rejects an unlisted origin
curl -H "Origin: https://evil.example" -I https://your-api.onrender.com/api/v1/health

# 4. Sign in, pick a profile, play something, reload — it resumes
```

Then confirm in the browser: the refresh cookie is `HttpOnly` + `Secure` +
`SameSite=None`, and the access token appears in **no** storage (it lives in JS
memory only, which is the point).

## Troubleshooting

| Symptom | Cause |
|---|---|
| Sign-in works, reload signs you out | `CROSS_SITE_COOKIES` not `true` on a split deployment |
| CORS errors in console | `CLIENT_URL` does not exactly match the Vercel origin (trailing slash counts) |
| Images blocked, console CSP error | `NEXT_PUBLIC_API_URL` changed without rebuilding the client |
| First request takes ~45s | Render cold start; expected on the free tier |
| Search returns nothing for typos | `ATLAS_SEARCH_ENABLED` false — that is the documented fallback |
| `Refusing to start in production without…` | Working as intended; set the named variables |
