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

No business logic beyond that exists yet — no auth, no routes under
`/rides`, `/driver`, `/admin`, etc. Adding stub modules for those now, ahead
of actually building them, was deliberately avoided.

### Not built yet (phases 2-9, in the order the doc specifies)

2. Auth & authorization (OTP + Google OAuth, sessions, RBAC)
3. Pricing + geo + fare quote
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
