# Kinora

A full-stack streaming platform built as a portfolio project — catalog browsing, adaptive
playback, per-profile personalisation, and synchronised watch parties.

> **Not affiliated with any commercial streaming service.** Kinora is an independent
> demonstration project with its own branding. Catalog metadata comes from
> [TMDB](https://www.themoviedb.org/); playback uses royalty-free sample footage. There is no
> DRM and no licensed content.

---

## Status

Built in phases, so the app runs end-to-end at every checkpoint rather than accumulating
half-finished features.

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation — monorepo, schemas, auth, RBAC, CI, tests | ✅ Complete |
| 2 | Browse & watch — catalog, detail pages, HLS player, progress | ⏳ Next |
| 3 | Profiles, lists, ratings & reviews, recommendations | ⏳ Planned |
| 4 | Search — Atlas Search, autocomplete, filters | ⏳ Planned |
| 5 | Real-time — watch parties, chat, notifications | ⏳ Planned |
| 6 | Social — follows, activity feed, shared watchlists | ⏳ Planned |
| 7 | Admin & analytics dashboards | ⏳ Planned |
| 8 | Accessibility, performance and security polish + full docs | ⏳ Planned |

**Phase 1 delivers:** registration with email verification, login/logout, JWT access +
refresh with rotation and reuse detection, password reset, change password, session
management ("sign out on all devices"), Google/GitHub OAuth (when configured), and
role-based access control enforced on both the API and the client.

---

## Quick start

**Requirements:** Node.js 20+ and a MongoDB instance. Nothing else — no API keys, no cloud
accounts.

```bash
git clone <your-repo-url> kinora && cd kinora
npm install
cp .env.example .env
npm run seed
npm run dev
```

Client on <http://localhost:3000>, API on <http://localhost:4000>.

`npm run seed` prints the generated admin credentials. It is idempotent — re-running it will
not duplicate accounts or reset a password you are already using.

### MongoDB

Local (macOS):

```bash
brew install mongodb-community && brew services start mongodb-community
```

Or point `MONGODB_URI` at a free MongoDB Atlas M0 cluster.

### Works with an empty `.env`

Every external integration is optional in development, and the app degrades honestly rather
than crashing:

| Not configured | What happens instead |
|---|---|
| SMTP | Verification and reset links are logged by the API and returned in the response, so the flows stay completable. **Non-production only** — gated on both `NODE_ENV` and the missing transport. |
| Google / GitHub OAuth | The social buttons are not rendered at all. The client asks `GET /api/v1/features` what the deployment can actually do. |
| Cloudinary | Uploads fall back to local disk; the bundled avatar set still works. |
| TMDB | `npm run seed` uses committed fixtures. `npm run seed:tmdb` needs a key. |
| Atlas Search | Search falls back to a MongoDB text index — works, but without fuzzy matching or autocomplete. |
| `JWT_*_SECRET` | Ephemeral per-process secrets are generated, so sessions do not survive a restart. **Production refuses to boot without real ones.** |

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Client, API and shared-package watcher together |
| `npm run build` | Build all three workspaces |
| `npm test` | API integration tests (Vitest + Supertest, real MongoDB) |
| `npm run test:e2e` | Browser journeys (Playwright) |
| `npm run lint` | ESLint across client and server |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm run seed` | Create the admin and demo accounts |

`npm run test:e2e` starts its own client and API on ports 3010/4010 against the test
database, so it never collides with a running dev session or touches development data.

---

## Architecture

```
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  Next.js 16  │  HTTPS │  Express 5   │        │   MongoDB    │
│  React 19    │───────▶│  Node + TS   │───────▶│   Mongoose   │
│  (Vercel)    │◀───────│  (Render)    │◀───────│   (Atlas)    │
└──────────────┘  JSON  └──────────────┘        └──────────────┘
       │                       │
       │  access token in      │  Cloudinary (media)
       │  memory + httpOnly    │  TMDB (metadata, ingest only)
       │  refresh cookie       │  SMTP (verification, reset)
       ▼                       ▼
  ┌──────────────────────────────────┐
  │  @kinora/shared                  │
  │  Zod schemas + DTO types, used   │
  │  by BOTH sides of the wire       │
  └──────────────────────────────────┘
```

### Workspaces

```
/shared    Zod contracts + DTO types. Compiled to dist/ and consumed by both sides,
           so a schema change surfaces as a compile error rather than a runtime 422.
/server    Express API. config → middleware → routes → controllers → services → models.
/client    Next.js App Router. app / components / hooks / context / lib / types.
```

Each layer owns one job: controllers parse and respond, services hold business logic,
models define schema, middleware handles cross-cutting concerns.

---

## Authentication design

The part most worth reviewing, so here is the reasoning rather than just the mechanism.

**Access token** — a 15-minute JWT held in a JavaScript variable, never in `localStorage`.
Web storage is readable by any script on the page, so an XSS bug there becomes a durable
account takeover; a token in a closure dies with the page.

**Refresh token** — an opaque random string, never a JWT, stored only as a SHA-256 digest
and delivered as a `httpOnly` `SameSite` cookie. It must be revocable on demand, and a
self-contained token cannot be un-issued. A database leak yields hashes, not sessions.

**Rotation with reuse detection** — every refresh issues a new token and retires the old
one. Tokens are grouped into a *family* (one login plus everything rotated from it). If a
retired token is ever presented again, the string has leaked, so the entire family is
revoked. The legitimate user is signed out too — we cannot tell them from the attacker, so
both must re-authenticate.

**Single-flight refresh on the client** — when six requests 401 simultaneously, they share
one refresh call. Without that, five would present an already-rotated token, and the
server would correctly read its own client as an attacker and revoke the session.

**Immediate invalidation** — `requireAuth` re-reads the user on every request and compares
the token's `iat` against `credentialsChangedAt`. A password change or role downgrade takes
effect on the next request, not at the next login.

**Three layers of brute-force defence** — per-IP rate limiting, per-account rate limiting
(a botnet defeats the first; one host spraying many accounts defeats the second), and
durable account lockout on the user record that survives a process restart.

**Uniform failure responses** — wrong password and unknown account return an identical
message, code and roughly identical latency, so the endpoint cannot enumerate accounts.
`forgot-password` and `resend-verification` always report success for the same reason.

**Profile grants** — selecting a profile mints a signed, account-scoped token. A raw
profile id in a header would be forgeable, which would reduce a PIN lock to a suggestion.

---

## Testing

- **API integration** (`server/tests`) — Supertest against the real Express app and a real
  MongoDB, so index behaviour and unique constraints are genuinely exercised. Covers the
  auth surface, token rotation and reuse detection, RBAC, and a privilege-escalation probe.
- **End-to-end** (`client/e2e`) — Playwright drives a real browser through registration,
  verification, session persistence across reload, deep-link return-after-login, admin
  lockout, and two accessibility invariants (skip link focus, error/field association).

Both run in CI against a MongoDB service container.

---

## Design

Original branding, deliberately. Cloning a real service's logo, wordmark or exact brand
colour is a trademark problem once the project is on a public URL, and a pixel-clone reads
as *traced* rather than *built*. The target is interaction and layout fidelity under
Kinora's own identity.

Every colour, radius and motion curve lives in one `@theme` block in
`client/app/globals.css`. Nothing hardcodes a hex value, so rebranding is a single-file
edit.

- **Canvas** `#0B0B0F` — near-black, not pure black: pure black crushes shadow detail and
  makes poster art look like it is floating in a void.
- **Accent** `#F0B429` (saffron) — outside the red family so it cannot read as an
  impersonation, and it clears 8:1 contrast on the canvas. CTA text on the accent is
  near-black, not white; white on saffron is roughly 2:1 and fails WCAG AA outright.
- **Motion** — every token is an ease-out or spring curve. Linear easing is the clearest
  single tell of an unpolished interface.

> **A naming rule worth knowing:** Tailwind v4 turns every `--color-*` entry in `@theme`
> into a utility, so a token named `--color-base` generates a `text-base` *colour* utility
> that silently shadows Tailwind's built-in `text-base` *font-size*. Token names here avoid
> Tailwind's scale words (`base`, `sm`, `md`, `lg`, `xl`) entirely.

---

## Deployment

| Piece | Host | Free-tier caveat |
|---|---|---|
| Client | Vercel | Generous; the practical limit is build minutes. |
| API | Render | **Spins down after ~15 min idle**; the next request pays a 30–60s cold start. `GET /api/v1/health` is a cheap keep-alive target. |
| Database | MongoDB Atlas M0 | **512 MB cap**, shared CPU. Fine for a demo catalog; stores metadata and progress only, never media. |
| Media | Cloudinary | 25 credits/month covering storage, transformations and bandwidth. |

Split deployment is cross-site, so set `CROSS_SITE_COOKIES=true`. That switches the refresh
cookie to `SameSite=None`, which requires `Secure` and gives up SameSite's CSRF protection —
the strict CORS allow-list and the fact that refresh is the only cookie-authenticated
endpoint are what cover that gap.

Production refuses to start without `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MONGODB_URI`
and `CLIENT_URL`, rather than booting half-configured.

---

## Explicitly out of scope

Called out as deliberate decisions, not oversights:

- **DRM** (Widevine/FairPlay) and licensed content. Real DRM needs a paid licence server and
  content deals; sample footage demonstrates the playback pipeline without pretending.
- **Commercial CDN delivery.** Origin-served HLS is fine at demo scale and wrong at real
  scale.
- **Payments and subscription billing.**
- **Native mobile apps.**
- **Any paid third-party API or infrastructure tier.**

---

## Licence

MIT. TMDB metadata is used under their terms; this product uses the TMDB API but is not
endorsed or certified by TMDB.
