# API reference

Base URL: `http://localhost:4000/api/v1` (development).

## Conventions

Every response uses one of two envelopes:

```jsonc
// 2xx
{ "success": true, "data": { /* ... */ } }

// 4xx / 5xx
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",       // stable, machine-readable
    "message": "Please correct the highlighted fields",
    "details": { "email": ["Enter a valid email address"] }  // 422 only
  }
}
```

Branch on `code`, never on `message` — messages are written for humans and will
change. `details` is keyed by field path so React Hook Form can consume it
directly.

### Authentication

| Header / cookie | Carries | Required by |
|---|---|---|
| `Authorization: Bearer <jwt>` | Access token, 15 min | 🔒 routes |
| `X-Kinora-Profile: <jwt>` | Profile grant from `/profiles/select` | 👤 routes |
| `kinora_rt` cookie (httpOnly) | Refresh token, 30 days | `POST /auth/refresh` only |

Legend: **🔒** needs a session · **👤** needs a selected profile ·
**👑** needs `role: admin` · **🌐** public (personalises when a session exists)

### Rate limits

| Scope | Window | Limit |
|---|---|---|
| Global | 1 min | 300 |
| Auth endpoints (per IP) | 15 min | 20 |
| Auth endpoints (per account) | 15 min | 10 |
| Mail dispatch (per address) | 1 hour | 5 |
| Search | 1 min | 120 |
| Writes | 1 min | 40 |

Plus a durable third layer: 8 consecutive failed logins locks the account for
15 minutes, surviving a process restart.

---

## Auth — `/auth`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/providers` | 🌐 | Which OAuth providers this deployment has configured |
| POST | `/register` | 🌐 | Creates account + first profile. Returns `devVerificationUrl` when SMTP is unset outside production |
| POST | `/login` | 🌐 | Uniform error for wrong password and unknown account |
| POST | `/refresh` | cookie | Rotates the refresh token; replaying a used one revokes the family |
| POST | `/logout` | 🌐 | Revokes the presented session only |
| POST | `/logout-all` | 🔒 | Revokes every session |
| GET | `/me` | 🔒 | Current account |
| GET | `/sessions` | 🔒 | Active sessions with user-agent and IP |
| POST | `/verify-email` | 🌐 | Single-use token |
| POST | `/resend-verification` | 🌐 | Always reports success (no account enumeration) |
| POST | `/forgot-password` | 🌐 | Always reports success |
| POST | `/reset-password` | 🌐 | Signs the user in and revokes all other sessions |
| POST | `/change-password` | 🔒 | Requires the current password |
| GET | `/google`, `/github` | 🌐 | Mounted only when configured, else 404 |

<details>
<summary><code>POST /auth/register</code></summary>

```jsonc
// request
{ "name": "Ada", "email": "ada@example.com",
  "password": "Str0ngPassword!", "confirmPassword": "Str0ngPassword!" }

// 201
{ "success": true, "data": {
  "user": { "id": "…", "email": "ada@example.com", "role": "user",
            "isEmailVerified": false, "authProviders": ["local"] },
  "accessToken": "eyJ…", "expiresIn": 900,
  "devVerificationUrl": "http://localhost:3000/verify-email?token=…"
}}
```
Password policy: ≥10 chars, one lowercase, one uppercase, one digit — enforced
by the same Zod schema on both client and server.
</details>

---

## Profiles — `/profiles`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | 🔒 | All profiles on the account + avatar keys |
| POST | `/` | 🔒 | Max 5. Kids profiles are capped at PG regardless of request |
| POST | `/select` | 🔒 | Verifies the PIN and mints the profile grant |
| POST | `/clear` | 🔒 | Clears the active-profile cookie |
| GET | `/active` | 👤 | The profile the grant resolves to |
| PATCH | `/:id` | 🔒 | Ownership enforced by the query filter |
| PUT | `/:id/pin` | 🔒 | Changing or clearing requires the current PIN |
| DELETE | `/:id` | 🔒 | Cascades progress, lists, ratings, reviews. Last profile cannot be deleted |

---

## Catalog — `/catalog`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/filters` | 🌐 | Genre / language / rating vocabulary |
| GET | `/browse` | 🌐 | Paginated, filtered, sorted; movies and shows merged |
| GET | `/home` | 👤 | Personalised hero + rows |
| GET | `/titles/:slug` | 🌐 | Detail + viewer state |
| GET | `/titles/by-id/:mediaType/:id` | 🌐 | Same, addressed by id |
| GET | `/titles/:slug/similar` | 🌐 | Content-based similarity |
| GET | `/shows/:showId/episodes` | 🌐 | `?season=1`; includes per-episode progress |
| GET | `/episodes/:episodeId` | 🌐 | Playback payload |

`/browse` query parameters: `page`, `limit` (≤100), `type`, `genre`, `language`,
`rating`, `yearFrom`, `yearTo`, `runtimeMin`, `runtimeMax`, `minScore`, `sort`
(`popularity` `rating` `releaseDate` `title` `runtime` `newest`), `order`, `q`.
Array filters accept either repetition (`?genre=A&genre=B`) or a comma list.

> A signed-in profile always has its maturity limit applied server-side. A kids
> profile cannot widen it by editing the request — the filter is derived from the
> profile document, not the query.

---

## Library — `/library` 👤

| Method | Path | Notes |
|---|---|---|
| POST | `/progress` | Player heartbeat; single indexed upsert |
| GET | `/progress/continue` | Continue Watching (one row per series) |
| GET | `/progress/history` | Paginated watch history |
| DELETE | `/progress/:mediaId` | Remove from history |
| GET | `/lists/:kind` | `my_list` · `favorites` · `watch_later` |
| POST | `/lists` | Idempotent add |
| DELETE | `/lists` | Remove (body carries the target) |
| POST | `/reactions` | `like` · `dislike` · `none` |

---

## Reviews & ratings — `/reviews`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/titles/:mediaId` | 🌐 | `?sort=helpful\|newest\|oldest\|score` |
| PUT | `/ratings` | 👤 | 0.5–5 in half steps; refreshes the title aggregate |
| DELETE | `/ratings/:mediaType/:mediaId` | 👤 | |
| POST | `/` | 👤 | One review per profile per title; body sanitised on write |
| PATCH | `/:id` | 👤 | Ownership via query filter |
| DELETE | `/:id` | 👤 | Also removes its helpful votes |
| POST | `/:id/helpful` | 👤 | Toggles; cannot vote for your own |

---

## Search — `/search`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | 🌐 | Returns `engine: "atlas"\|"local"` and `didYouMean` |
| GET | `/autocomplete` | 🌐 | Prefix matches ranked first |
| GET | `/trending` | 🌐 | Most-searched terms, last 7 days |
| GET | `/history` | 👤 | This profile's recent searches |
| DELETE | `/history` | 👤 | |

Local search runs three passes: text index → substring regex → Levenshtein
distance (`didYouMean: true`). Atlas Search replaces all three with one
`$search` stage when `ATLAS_SEARCH_ENABLED=true`.

---

## Watch parties — `/parties` 👤

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Creates a party, returns a 6-character code |
| GET | `/:code` | State, with the position **projected** to now |
| POST | `/:code/end` | Host only |
| POST | `/:code/invite` | Raises a notification for the target profile |

The live session runs over Socket.IO — see [Realtime](#realtime) below.

---

## Social — `/social`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/profiles/:handle` | 🌐 | 404s for private profiles (does not confirm existence) |
| GET | `/profiles/:handle/list` | 🌐 | Shared watchlist only — `my_list`, never favourites |
| PUT | `/handle` | 👤 | Opt in/out of being public. Kids profiles refused |
| POST/DELETE | `/follow/:profileId` | 👤 | |
| GET | `/followers`, `/following` | 👤 | |
| GET | `/feed` | 👤 | Read-time fan-out over who you follow |
| GET | `/discover` | 👤 | Public profiles you are not following |

---

## Notifications — `/notifications` 👤

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Items + unread count |
| POST | `/read` | `{ ids }` marks some, omitting it marks all |

---

## Admin — `/admin` 👑

| Method | Path | Notes |
|---|---|---|
| GET | `/overview` | Counts for the dashboard header |
| GET | `/analytics` | `?days=7\|30\|90` |
| GET | `/catalog` | Admin table, includes unpublished drafts |
| POST/PATCH/DELETE | `/movies[/:id]` | Delete cascades viewer state |
| POST/PATCH/DELETE | `/shows[/:id]` | Delete cascades seasons + episodes |
| POST/PATCH/DELETE | `/seasons[/:id]` | Recounts the parent show |
| POST/PATCH/DELETE | `/episodes[/:id]` | Recounts the parent show |
| GET | `/users` | Paginated, searchable |
| PUT | `/users/:id/role` | Cannot demote yourself or the last admin; revokes their sessions |
| GET | `/moderation/reviews` | Queue, most-reach first |
| PUT | `/moderation/reviews/:id` | Hide / restore (reversible, non-destructive) |

---

## Artwork — `/artwork` 🌐

`GET /artwork/:slug/poster.svg` · `GET /artwork/:slug/backdrop.svg`

Deterministic SVG generated from the slug, used when a title has no stored
artwork. Public and uncredentialed because these are `<img>` sources and a
browser will not attach an `Authorization` header to one; nothing is exposed
that the slug does not already reveal.

---

## Health — `/health` 🌐

Reports database connectivity and the live feature flags. Returns **503** when
Mongo is unreachable, so an uptime check can tell "process up" from "actually
working".

---

## Realtime

Socket.IO shares the HTTP server. The handshake requires **both** tokens:

```ts
io('http://localhost:4000', {
  auth: { token: accessToken, profileToken: profileGrant },
});
```

| Direction | Event | Payload |
|---|---|---|
| → | `party:join` | `{ code }` |
| → | `party:leave` | `{ code }` |
| → | `party:control` | `{ code, action: 'play'\|'pause'\|'seek', positionSeconds }` |
| → | `party:chat` | `{ code, body, atSeconds }` |
| → | `party:reaction` | `{ code, emoji, atSeconds }` |
| ← | `party:state` | `{ state, messages }` — full state on join |
| ← | `party:sync` | `{ action, positionSeconds, atServerTime, byProfileId }` |
| ← | `party:members` | `{ members }` |
| ← | `party:message` | One chat / reaction / system message |
| ← | `party:error` | `{ message }` |
| ← | `notification:new` | A `NotificationDTO` |

Every inbound payload is validated with the same Zod schemas the REST layer
uses. A socket is authenticated once at handshake but **authorised per event** —
`party:control` re-checks host permission against the database each time.

`atServerTime` exists so clients can compensate for latency: the receiver adds
its own elapsed time before seeking, instead of landing permanently behind by
one network round trip.

---

## Error codes

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `details` holds per-field messages |
| `INVALID_CREDENTIALS` | 401 | Wrong password *or* unknown account |
| `ACCOUNT_LOCKED` | 429 | Too many failed attempts |
| `TOKEN_EXPIRED` | 401 | Refresh and retry |
| `CREDENTIALS_CHANGED` | 401 | Password changed; sign in again |
| `REFRESH_REUSED` | 401 | Token replay — the whole family was revoked |
| `PROFILE_REQUIRED` | 400 | Select a profile first |
| `PROFILE_GRANT_INVALID` | 403 | Grant expired or belongs to another account |
| `PIN_REQUIRED` / `INVALID_PIN` | 403 / 401 | Profile is locked |
| `ROLE_REQUIRED` | 403 | Admin only |
| `EMAIL_TAKEN` | 409 | |
| `HANDLE_TAKEN` | 409 | |
| `LAST_PROFILE` / `LAST_ADMIN` | 400 | Refused to leave the system unusable |
| `HOST_ONLY` | 403 | Only the party host may control playback |
| `FEATURE_UNAVAILABLE` | 503 | Integration not configured on this deployment |
