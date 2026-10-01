# Kinora

A full-stack streaming platform — multi-profile accounts, adaptive HLS playback,
a recommendation engine built from real signals, synchronised watch parties, a
social layer, and an admin panel that publishes to the live site.

> **Not affiliated with Netflix.** Kinora borrows the *interaction* grammar of
> modern streaming UIs — hover-expanding cards, peek-scrolling rows, full-bleed
> heroes — under its own branding. No Netflix wordmark, typeface, colour or
> asset is used anywhere in this project.

```
Next.js 16 · React 19 · TypeScript · Tailwind v4 · TanStack Query · Framer Motion
Express 5 · Mongoose 9 · Socket.IO · Zod · Pino · MongoDB
```

---

## Quick start

**Requires:** Node ≥ 20 and a local MongoDB (`brew install mongodb-community`).

```bash
git clone <repo> kinora && cd kinora
npm install
cp .env.example .env    # every value is optional in development
npm run seed            # 50 films, 4 series, 16 episodes, ratings
npm run dev
```

Client on `http://localhost:3000`, API on `http://localhost:4000`.

Seeded accounts:

| Account | Password | |
|---|---|---|
| `demo@kinora.local` | `KinoraDemo2026!` | two profiles — Demo and a Kids profile |
| `admin@kinora.local` | *printed by the seed* | set `SEED_ADMIN_*` in `.env` to choose |

### It runs with an empty `.env`

That is a design constraint, not an accident. No TMDB key, no Atlas cluster, no
Cloudinary account, no SMTP server, no OAuth apps — clone and run.

| Without credentials | What happens |
|---|---|
| No TMDB key | Catalog seeds from committed fixtures of **public-domain and Creative-Commons films** with real metadata |
| No poster CDN | Posters are **composed as SVG per title** — genre-driven artwork, real billing block, deterministic from the slug |
| No Atlas Search | Search falls back to a text index + substring + Levenshtein typo tolerance |
| No SMTP | Verification and reset links are logged, and returned in API responses (development only) |
| No OAuth apps | Social buttons are hidden; the routes are not mounted at all |
| No Cloudinary | Uploads fall back to local disk; the bundled avatar set still works |
| No JWT secrets | Generated per process, with a startup warning that sessions will not survive a restart |

Each of these is a genuine code path, not a stub. `GET /api/v1/features` reports
what a given deployment can actually do, and the UI renders from that — so a
missing credential is a hidden button, never a 500 on click.

---

## What is built

<table>
<tr><td width="50%" valign="top">

**Accounts & profiles**
- Register, verify email, forgot/reset password
- JWT access + refresh with **rotation and reuse detection**
- Google + GitHub OAuth (feature-flagged)
- Up to 5 profiles; kids profiles; PIN locks
- Per-profile language, maturity, playback and notification preferences

**Browse & watch**
- Personalised home: hero + earned rows
- Filterable, sortable, paginated browse
- Detail pages with cast, similar titles, seasons and episodes
- **Adaptive HLS player**: quality ladder, PiP, speed, subtitles,
  skip-intro from chapter data, next-episode countdown, keyboard shortcuts
- Continue Watching and per-episode progress

</td><td width="50%" valign="top">

**Personalisation**
- My List / Favourites / Watch Later
- Half-star ratings, thumbs, reviews with spoiler tags and helpful votes
- **Recommendations from real signals** — see below

**Search**
- Full-text, prefix, and typo-tolerant
- Debounced instant results, history, trending terms
- Atlas Search when available, local fallback otherwise

**Realtime & social**
- Watch parties: synced playback, host controls, chat, emoji reactions, presence
- Live notifications over the same socket
- Public profiles, follow, shared watchlists, activity feed

**Admin**
- Catalog CRUD with inline publish/feature toggles
- User management with role changes
- Review moderation
- Analytics dashboard (Recharts)

</td></tr>
</table>

---

## Recommendations

Three strategies, blended, with **no hardcoded title lists anywhere**.

**1. Content-based.** Each profile gets an 18-dimensional taste vector, one
dimension per genre, built from its watch history, ratings and thumbs. Signals
are weighted by how much they actually express taste:

```
completed +3   started +1   rated ≥3.5 +5   rated <3.5 −3   like +4   dislike −5
```

A title's weight is divided across its genres, so a five-genre title does not
count five times. The catalog is then ranked by **cosine similarity** against
that vector, computed in an aggregation pipeline. Cosine rather than dot product
because it compares direction and ignores magnitude — otherwise a title tagged
with many genres wins for having more non-zero dimensions.

**2. Collaborative-lite.** One aggregation over the ratings collection: find
profiles that rated the same titles ≥4, require ≥2 shared titles (one overlap is
coincidence), then surface what *those* profiles rated highly that this one has
not seen, weighted by overlap strength.

**3. Popularity.** The cold-start fallback. Below three signals a profile has no
taste to model, and the rows say "Trending now" rather than "Picked for you" —
labelling a popularity list as personalisation is the lie that makes users stop
trusting recommendations.

Rows explain themselves in the UI (the ⓘ next to a row title), and the home feed
de-duplicates across *recommendation* rows while letting genre rows repeat
titles — because "what horror do you have?" is a different question from "what
should I watch?".

`server/src/services/recommendation.service.ts`

---

## Security

| | |
|---|---|
| **Passwords** | bcrypt cost 12; identical Zod policy enforced client and server |
| **Access tokens** | 15-minute JWT, held in JS memory only — never `localStorage` |
| **Refresh tokens** | Opaque, SHA-256 hashed at rest, `httpOnly` cookie, rotated on every use |
| **Reuse detection** | Replaying a rotated token revokes the entire token family |
| **Instant invalidation** | `credentialsChangedAt` voids outstanding JWTs on password change |
| **Brute force** | Three layers: per-IP limit, per-account limit, and durable 8-strike lockout |
| **Enumeration** | Login, registration-resend and password-reset give identical answers for known and unknown addresses, with a timing equaliser on the no-user path |
| **Authorization** | Every profile-scoped query filters on `userId`/`profileId` — ownership is structural, not a separate `if` someone can forget |
| **PIN locks** | Selection mints a signed grant; a bare profile id in a header would make PINs decoration |
| **NoSQL injection** | Operator keys stripped from bodies before any route sees them |
| **XSS** | Review HTML sanitised to a tag allow-list **on write**, so the dangerous form is never stored |
| **Headers** | Helmet on the API, strict CSP on the client |
| **CORS** | Explicit allow-list, never a reflector — a wildcard with `credentials: true` is CSRF |

---

## Testing

```bash
npm run typecheck   # shared + server + client
npm run lint        # ESLint, both packages
npm test            # Vitest integration suite (needs mongod)
npm run test:e2e    # Playwright
```

The server suite runs against a real MongoDB (`kinora_test`), not mocks — these
are integration tests, and the things most worth testing here are index
constraints, aggregation correctness and middleware ordering, none of which a
mock exercises.

CI runs lint + typecheck + tests on every push, with a MongoDB service container.

---

## Project layout

```
shared/     Zod schemas and DTOs imported by BOTH sides.
            One definition of a password policy, one of a catalog filter.
server/
  src/
    config/       env validation, db, logger, passport
    middleware/   auth, validation, rate limits, sanitisation, errors
    controllers/  parse validated input → call a service → shape a response
    services/     business logic and queries
    models/       Mongoose schemas, indexes, document methods
    routes/       URL shape and middleware composition
    sockets/      Socket.IO handlers
    seed/         fixtures + idempotent seeding
  tests/
client/
  app/            Next.js App Router
  components/     catalog · player · profiles · party · social · admin · ui
  context/        auth and profile providers
  hooks/          HLS, sockets, debounce, library actions
  lib/            API clients, utilities
docs/
  architecture.md · schema.md · api.md · deployment.md
```

A controller never imports a model; a service never imports `express`. Both are
greppable, which is what makes the boundary hold up under a deadline.

---

## Documentation

| | |
|---|---|
| [Architecture](docs/architecture.md) | System diagram, request lifecycle, auth model, trade-offs |
| [Schema](docs/schema.md) | Collections, indexes, TTL policy, denormalisation |
| [API reference](docs/api.md) | Every endpoint, auth requirements, error codes, socket events |
| [Deployment](docs/deployment.md) | Vercel + Render + Atlas, with free-tier caveats |

---

## Content and licensing

The seeded catalog is entirely **public domain or Creative Commons**, with real
metadata:

- **50 films**, including *Metropolis*, *Nosferatu*, *The Phantom of the Opera*,
  *The Passion of Joan of Arc*, *Häxan*, *The 39 Steps*, *The Lodger*,
  *Scarlet Street*, *The Stranger*, *The Hitch-Hiker*, *My Man Godfrey*,
  *Meet John Doe*, *Sherlock Jr.*, *Steamboat Bill, Jr.*, *House on Haunted
  Hill*, *The Last Man on Earth* and *Night of the Living Dead* — all public
  domain, with real directors, cast and dates.
- The Blender open movies — *Big Buck Bunny*, *Sintel*, *Tears of Steel*,
  *Elephants Dream*, *Cosmos Laundromat*, *Spring*, *Sprite Fright*,
  *Coffee Run*, *Agent 327*, *Caminandes* and *Charge* — © Blender
  Foundation / Blender Studio, CC-BY.

Playback uses long-standing public HLS test streams from **Mux**
(`test-streams.mux.dev`) and **Apple** (`devstreaming-cdn.apple.com`). These are
genuine adaptive multi-rendition manifests, so quality switching, buffering and
seeking are really exercised rather than simulated.

TMDB is supported for metadata ingest and, when used, requires their attribution.

---

## Explicitly out of scope

Called out deliberately, not skipped quietly:

- **DRM** (Widevine/FairPlay) — requires licensed key servers and commercial
  agreements. Kinora plays unencrypted sample media only.
- **Licensed content and commercial CDN delivery** — no rights, and no free tier.
- **Payments and subscription billing** — no payment processor is integrated.
- **Native mobile apps** — the web client is responsive; that is the scope.
- **Anything requiring a paid tier** — the whole project must run free.

---

## What I would do differently at scale

The honest list of what breaks first, and what it would take to fix.

**Rate limiting is in-memory.** Correct for one Render dyno, wrong the moment
there are two — each instance would grant the full budget. Fix: a Redis store
behind the same `express-rate-limit` interface. One-line swap, deliberately
deferred because the free tier cannot run two instances anyway.

**Watch-party presence is in-memory.** Same shape of problem: members connected
to different instances would not see each other. Fix: the Socket.IO Redis
adapter, which also handles cross-instance broadcast.

**The activity feed fans out on read.** Query who you follow, then their events.
Simple, no duplication, and fine to thousands of follows. It falls over the
moment someone has 100k followers. Fix: write-time fan-out into per-follower
inboxes, or a hybrid that fans out for normal accounts and pulls for celebrity
ones. Not built, because building a hybrid for a catalog of 24 titles would be
architecture theatre.

**Analytics are computed per request.** Milliseconds today. Past roughly 10⁶
watch rows the `$lookup`-heavy genre pipeline becomes the slowest thing in the
app. Fix: a nightly rollup into a `daily_metrics` collection, serving the
dashboard from pre-aggregated points.

**Collaborative filtering is O(neighbours × their ratings).** Bounded at 200
neighbours today. A real system precomputes an item-item similarity matrix
offline and serves a lookup. The current version is honest about being "lite".

**Denormalised aggregates are recomputed, not incremented.** Safe, but every
rating write triggers a full re-aggregation for that title. At high write volume
this becomes contention. Fix: `$inc` the counters and reconcile on a schedule —
faster, but drift becomes possible, which is why the safe version shipped first.

**No CDN in front of media.** Sample streams are served by their own hosts. Real
delivery needs signed URLs, edge caching and per-region origins.

**Search is two implementations.** Atlas Search when configured, a hand-rolled
three-pass fallback otherwise — including Levenshtein distance computed in Node.
Maintaining both is a real cost. It exists because "search is broken unless you
have Atlas" would violate the clone-and-run constraint. In a product with one
known deployment target, the fallback would be deleted.

**Images are generated SVG.** Sharp, tiny, cacheable, and honest about being
placeholders. Real artwork means an image pipeline: upload, transcode to
multiple sizes and formats, serve from a CDN with a signed URL.

---

MIT
