# Architecture

## System overview

```mermaid
flowchart TB
    subgraph browser["Browser"]
        next["Next.js 16 App Router<br/>React 19 · TanStack Query"]
        hls["hls.js<br/>adaptive playback"]
        sio_c["socket.io-client"]
    end

    subgraph vercel["Vercel — static + SSR"]
        next
    end

    subgraph render["Render — Node process"]
        api["Express 5 REST API<br/>/api/v1"]
        sio_s["Socket.IO<br/>same HTTP server"]
        art["SVG artwork generator"]
    end

    subgraph data["MongoDB Atlas (M0)"]
        db[("14 collections<br/>+ TTL indexes")]
        atlas["Atlas Search index<br/><i>optional</i>"]
    end

    subgraph external["Third-party — all optional"]
        tmdb["TMDB<br/>metadata ingest"]
        cloud["Cloudinary<br/>uploads"]
        smtp["SMTP<br/>verification mail"]
        oauth["Google / GitHub<br/>OAuth"]
        streams["Mux + Apple<br/>public HLS test streams"]
    end

    next -->|"JSON over HTTPS<br/>Bearer access token"| api
    next -->|"httpOnly refresh cookie"| api
    sio_c <-->|"WebSocket<br/>JWT + profile grant"| sio_s
    hls -->|"manifest + segments"| streams
    next -->|"&lt;img&gt; src"| art

    api --> db
    api -.->|"when ATLAS_SEARCH_ENABLED"| atlas
    api -.-> tmdb
    api -.-> cloud
    api -.-> smtp
    api -.-> oauth

    classDef optional stroke-dasharray: 4 4
    class external,atlas optional
```

Everything with a dashed border is optional. With none of it configured the app
still runs: search falls back to a MongoDB text index, artwork is generated as
SVG, verification links are logged instead of emailed, OAuth buttons are hidden,
and uploads fall back to local disk. That is the offline-first constraint, and
it is why a reviewer can `git clone && npm run dev` with an empty `.env`.

## Request lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Middleware chain
    participant Ctl as Controller
    participant S as Service
    participant DB as MongoDB

    C->>M: GET /api/v1/catalog/home
    Note over M: requestId → pino → helmet → CORS<br/>→ rate limit → body parse → sanitize
    M->>M: requireAuth (verify JWT, re-read user)
    M->>M: requireProfile (verify signed grant, check ownership)
    M->>Ctl: req.user, req.profile, req.validated
    Ctl->>S: buildHomeFeed(profile)
    S->>DB: taste vector + rows ($unionWith, $facet)
    DB-->>S: documents
    S-->>Ctl: HomeFeedDTO
    Ctl-->>C: { success: true, data }
```

Rate limiting sits **before** body parsing so a flood costs a counter increment
rather than a JSON parse. Sanitisation sits **after** parsing because it edits
the parsed body. Auth sits after both so an unauthenticated flood is rejected
without a database round trip.

## Layering

| Layer | Owns | Never does |
|---|---|---|
| `routes/` | URL shape, middleware composition | Business logic |
| `middleware/` | Cross-cutting concerns (auth, validation, limits, errors) | Domain decisions |
| `controllers/` | Parse validated input, call one service, shape the response | Query the database |
| `services/` | Business logic, queries, aggregations | Touch `req`/`res` |
| `models/` | Schema, indexes, document methods | Know about HTTP |

The rule that keeps this honest: a controller never imports a model, and a
service never imports `express`. Both are checkable by grep, which is what makes
the boundary survive contact with a deadline.

## Authentication

Three token types, each with a different job:

```mermaid
flowchart LR
    login["POST /auth/login"] --> at["Access token<br/>JWT · 15 min<br/>in JS memory"]
    login --> rt["Refresh token<br/>opaque · 30 days<br/>httpOnly cookie"]
    select["POST /profiles/select"] --> pt["Profile grant<br/>JWT · 30 days<br/>header + cookie"]

    at -->|"Authorization: Bearer"| req["Every request"]
    pt -->|"X-Kinora-Profile"| req
    rt -->|"on 401 TOKEN_EXPIRED"| rotate["POST /auth/refresh<br/>rotates the family"]
    rotate --> at
```

- **Access token** is a JWT so it verifies without a database hit — but
  `requireAuth` still loads the user, because a JWT cannot know the account was
  deleted or demoted thirty seconds ago. `credentialsChangedAt` invalidates
  tokens issued before a password change.
- **Refresh token** is opaque, not a JWT: revocation has to be authoritative and
  a self-contained token cannot be un-issued. Only its SHA-256 digest is stored.
  Tokens form a *family* per login; replaying a rotated token revokes the whole
  family, which is the standard reuse-detection response.
- **Profile grant** proves the profile was actually selected — and that its PIN,
  if any, was satisfied. A bare profile id in a header would be forgeable, which
  would reduce PIN locks to decoration.

## Data model

See [`docs/schema.md`](./schema.md) for the collection diagram.

## Recommendation pipeline

```mermaid
flowchart TD
    signals["WatchProgress · Rating · Reaction<br/>(most recent 120 of each)"] --> vec["Taste vector<br/>18-dimensional, one per genre"]
    vec --> cold{"< 3 signals?"}
    cold -->|yes| pop["Popularity fallback<br/>honestly labelled 'Trending'"]
    cold -->|no| cb["Content-based<br/>cosine similarity"]
    cold -->|no| cf["Collaborative-lite<br/>aggregation over ratings"]
    cb --> rows["Home rows, de-duplicated"]
    cf --> rows
    pop --> rows
```

Weights are asymmetric on purpose: a dislike is `-5` against a completed watch
at `+3`, because one bad experience should move the vector further than one
passive one. Each title's weight is divided across its genres so a five-genre
title does not count five times.

## Deliberate trade-offs

| Decision | Why | What breaks at scale |
|---|---|---|
| Read-time feed fan-out | Simple; no duplication | A celebrity account with 100k followers |
| In-memory rate limiting | One free-tier dyno | Multiple instances each get their own budget |
| In-memory party presence | Same | Presence splits across instances |
| Analytics computed per request | Milliseconds at this size | Needs rollups past ~10⁶ watch rows |
| Denormalised `averageScore` | Sorting without a join | Recompute drifts if a writer is missed |
| Levenshtein fuzzy fallback | Works without Atlas | O(candidates); Atlas Search does it properly |

Every one of these is the right call for a free-tier portfolio deployment and
the wrong call for a product with real traffic. Knowing which is which is the
point.
