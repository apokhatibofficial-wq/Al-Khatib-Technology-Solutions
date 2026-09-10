# Tak-C.taxi — backend

Ride-hailing platform for Idlib, Syria (تكسي / TAK-C.TAXI): passenger PWA,
driver PWA and admin SPA over one backend that owns fares, distances and ride
state. Full spec: the architecture document supplied with this project
("وثيقة المعمارية والتنفيذ — Tak-C.taxi", v1.0).

This is a separate, self-contained project living alongside — not inside —
the unrelated Idlib Platform app at the repo root. The two share no code,
schema, or database; see that app's own `README.md` for what it is.

## Why this doesn't reuse the root app's stack

The root app is a single Next.js/Prisma monolith. The architecture doc calls
for a different shape on purpose (§2): a standalone Fastify + TypeScript
backend, PostgreSQL **+ PostGIS**, Redis for live state, a WebSocket layer,
and self-hosted map tiles/routing (explicitly *not* Google Maps — §2 lays out
the export-control/sanctions risk of depending on Google's billing for a
service operating from Syria, and the resulting single point of failure for
fare calculation). Folding that into the existing Next.js app would fight
its own spec, so it's its own project instead.

## What's built (Phase 1 — database & migrations)

Per the doc's own closing instructions (§15), work proceeds in the phase
order it specifies. This phase is exactly: **(1) database schema & migrations**,
plus the minimum server scaffold needed to run and verify them.

- `prisma/schema.prisma` — every table from §3, with the doc's explicit
  design rules applied: money as integer cents (never decimals), every
  ride/invoice carrying the `pricingVersionId` it was priced under, no city
  hardcoded (pricing and service area are per-`City` rows).
- PostGIS geography columns (`pickup`, `dest`, driver/city points and the
  city boundary polygon) via Prisma's `Unsupported(...)` type. Prisma Client
  has no native geography type, so reads/writes to these columns go through
  `$queryRaw`/`$executeRaw` in later phases — the same way the doc's own §7
  pseudocode is raw SQL throughout, not ORM-abstracted.
  GIST indexes for all of them are hand-added in the migration SQL (Prisma's
  `@@index` only emits btree).
- One deliberate departure from a literal reading of §3: there is no
  `in_ride`/live-location column on `Driver`. §7's matching query reads from
  a `driver_live` source, a different name from this `drivers` table — read
  against §1's architecture diagram (Redis holds live locations, locks and
  queues), that split looks intentional. Fast-path driver availability for
  matching belongs in Redis in phase 4/5, not as a column here that would
  become a second, driftable source of truth.
- Fastify server bootstrap: config loading (`src/config/env.ts`, zod-validated),
  a Prisma client singleton over the `pg` driver adapter (`src/db/client.ts`),
  and a `/health` route that does a real `SELECT 1` against the database —
  verified both under `tsx` (dev) and as a compiled `tsc` build (`dist/`),
  including the DB-down failure path (`503`) and graceful shutdown on
  `SIGTERM`.

No route-level business logic beyond that existed yet as of phase 1 — no
`/rides`, `/driver`, `/admin`, etc. Adding stub modules for those ahead of
actually building them was deliberately avoided, and still is.

## What's built (Phase 2 — auth & sessions)

`src/modules/auth/` — endpoints exactly matching §4's auth list (`POST
/auth/otp/request`, `/auth/otp/verify`, `/auth/google`, `/auth/refresh`,
`/auth/logout`, `GET /me`), plus one the doc's role model requires but
doesn't separately list: `POST /auth/admin/mfa/verify`.

- **OTP** (`otp.ts`) — primary auth path (§5). Codes are HMAC-hashed at
  rest (never stored in plaintext), rate-limited per phone (60s cooldown,
  5/hour), capped at 5 verify attempts. No SMS vendor is named in the doc
  (just a generic `OTP_PROVIDER_KEY`), so sending is behind a small
  interface: in development it logs the code instead of sending it; in
  production (`env.ts`) the server now refuses to boot at all without
  `OTP_PROVIDER_KEY` set, and even with it set, `sendOtpCode()` throws
  loudly rather than silently no-op'ing — wiring the actual vendor call is
  a fast-follow, not something to fake.
- **Google OAuth** (`google.ts`) — server-side authorization-code exchange
  (§5: "بتبديل الرمز على السيرفر لا في المتصفح"), real `id_token`
  verification against Google's live JWKS via `jose`. Deliberate scope
  decision: since `users` has no email column (phone is the identity
  anchor, unique + not null) and Google supplies no phone number, Google
  sign-in can only ever *log in* an account that already exists by
  `googleSub` — it can't originate a new phone-less account. A `no_account`
  response tells the client to verify by phone first; a "link my Google
  account" endpoint is a natural follow-up, not built here.
- **Admin MFA** (`totp.ts` + the `/auth/admin/mfa/verify` route) — §10 marks
  MFA mandatory for admin. Google resolves *identity* (by matching
  `AdminUser.email`); a short-lived signed ticket (5 min, structurally
  distinct from a real access token) bridges to a required TOTP step before
  any admin session is actually issued.
- **Sessions** (`sessions.ts`, `jwt.ts`) — access tokens are 10-minute JWTs
  (§5), never persisted. Refresh tokens are JWTs too (so
  `JWT_REFRESH_SECRET` alone can't forge one) delivered as
  `HttpOnly; Secure; SameSite=Strict` cookies, with each one's `jti`
  tracked in `Session` for rotation + reuse detection: presenting an
  already-rotated/revoked token doesn't just fail, it revokes every session
  in that rotation chain (`familyId`). Verified against the real DB, not
  just typechecked: rotation, replay-of-a-rotated-token, and
  replay-after-logout all correctly return `reuse_detected` and kill the
  whole chain — see the commit history for the exact curl flow this was
  tested with.
- **`requireAuth`** (`guard.ts`) is the one guard phase 2 actually needs
  (backs `GET /me`). Role-scoped guards (`requireAdminRole`, a driver
  guard) belong to whichever phase adds their first real protected route —
  phase 4's ride endpoints, phase 7's admin panel.

A real, non-obvious fix this phase forced: `User.fullName` had to become
nullable. A brand-new phone number has no name on file at the moment OTP
verification first succeeds — profile completion is a separate, later step
(not yet built; `GET /me` just returns `fullName: null` until it exists).

## What's built (Phase 3 — pricing + geo + fare quote)

- **`GeoProvider`** (`src/modules/geo/provider.ts`) — the abstraction §2
  explicitly asks for ("طبقة تجريد GeoProvider تسمح بتشغيل Google لاحقًا
  بتغيير إعداد واحد"). `osrm.ts` and `nominatim.ts` are real clients against
  those projects' actual documented HTTP APIs (not guessed) — note OSRM
  takes coordinates as `lng,lat`, the opposite of this codebase's own
  `{lat, lng}` convention, which is exactly the kind of detail worth getting
  right rather than hand-waved. `POST /geo/geocode`, `/geo/reverse`,
  `/geo/route` (§4) expose them directly.
- **Pricing engine** (`pricing/engine.ts`) — a pure function implementing
  §9's fare formula exactly, cents in, cents out. The doc names the
  waiting-minutes step `ceil_or_prorate` without picking one; this rounds
  up to the next full minute (how a physical taxi meter would bill it) —
  a one-line, clearly-commented choice if the real business rule differs.
- **`POST /rides/quote`** (`pricing/quote.ts` + `routes.ts`) — resolves
  which `City` the pickup point actually falls inside via a real PostGIS
  `ST_Contains` check (`geo/city.ts`), not a nearest-match guess; finds
  that city's currently-effective `PricingVersion`; calls the real geo
  route for actual road distance/duration; prices it; stores the quote
  server-side with a 2-minute expiry (not specified by the doc — a
  documented default) so `POST /rides` in phase 4 can re-validate it rather
  than trust a client-sent price (§4's explicit rule).
- **Dev seed** (`npm run db:seed`) — inserts the exact Idlib launch config
  §9 specifies (not fabricated test data): `price_per_unit=$1.00`,
  `unit_meters=1500`, `min_fare=$1.00`, `waiting_fee_per_min=$0.05`. The
  city boundary is a rough bounding box, clearly commented as a
  placeholder for the real administrative polygon a live deployment needs.

Verified against the real DB with a stand-in OSRM/Nominatim (this
project's actual client code, hitting a stub server shaped like their real
response contracts — no self-hosted routing/geocoding instance with real
Idlib map data exists in this dev sandbox): geocode, reverse geocode,
route, a full quote for a pickup inside Idlib with the fare math checked
by hand against §9's formula, and the out-of-service-area rejection for a
pickup outside it.

### Not built yet (phases 4-9, in the order the doc specifies)

4. Ride state machine & lock-based assignment
5. Real-time & ETA (WebSocket, Redis)
6. Waiting counter & invoices
7. Admin panel & audit log
8. Notifications (Web Push / FCM)
9. Tests & security review

Several of these need real external credentials/infra this repo can't
supply on its own (an OTP provider, Google OAuth credentials, a self-hosted
tile/routing service, VAPID/FCM keys, S3-compatible storage) — see
`.env.example`.

## Getting started (local development)

### 1. Prerequisites

- Node.js 20+
- PostgreSQL with the PostGIS extension available (`CREATE EXTENSION postgis`
  requires it to be installed on the server, not just enabled per-database)

### 2. Install dependencies

```bash
npm install
```

`postinstall` runs `prisma generate` automatically.

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` at minimum — that's the only variable phase 1 code
actually reads (see `.env.example` for which variables belong to later
phases and are unused for now).

### 4. Apply the database schema

```bash
npm run db:migrate
```

Runs `prisma migrate dev` against `DATABASE_URL`. Use `npm run db:deploy`
(`prisma migrate deploy`) in CI/production instead — it applies existing
migrations without generating new ones and doesn't prompt interactively.

**Known quirk in network-restricted environments:** the `prisma` CLI's
`migrate dev` can hang indefinitely on its own telemetry/update-check call
rather than on any actual database work — if that happens, `Ctrl-C` it and
re-run with `CHECKPOINT_DISABLE=1` (already set in every `db:*` and
`postinstall` script in `package.json`, so this only matters if you invoke
`prisma` directly rather than through an npm script).

### 5. Run the dev server

```bash
npm run dev
```

`GET http://localhost:3000/health` should return
`{"status":"ok","db":"up","time":"..."}`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (`tsx watch`) |
| `npm run build` | Compile to `dist/` |
| `npm run start` | Run the compiled build |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply existing migrations (production/CI) |
| `npm run db:studio` | Open Prisma Studio |

## Known dependency note

`npm audit` reports 4 high-severity findings in `mysql2`, a transitive
dependency bundled inside the `prisma` CLI's own multi-database tooling —
not something this project imports (only the PostgreSQL adapter is used)
and not part of what actually ships in the running server. The suggested
`npm audit fix --force` downgrades `prisma` to 6.x, which would break the
PostGIS/`Unsupported()` schema and diverge from the sibling project's
Prisma 7 convention, so it hasn't been applied. Worth re-checking against a
newer `prisma` release before this goes to production.

## Deployment (§12, once there's something to deploy)

Domain is already purchased (GoDaddy) — only DNS records need to change:

| Subdomain | Service |
| --- | --- |
| `tak-c.taxi` | Passenger PWA + marketing page |
| `driver.tak-c.taxi` | Driver PWA |
| `admin.tak-c.taxi` | Admin panel |
| `api.tak-c.taxi` | This API + WebSocket |
| `tiles.tak-c.taxi` | Map tiles + routing engine |

Three fully separate environments (production/staging/development) with
independent databases and keys — the dev environment never touches
production data.
