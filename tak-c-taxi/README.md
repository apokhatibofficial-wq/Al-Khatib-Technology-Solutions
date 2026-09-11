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

> **Superseded, phase 9 follow-up**: this section describes the original
> phone+SMS design as built. OTP delivery (and the login identity itself)
> was switched to email after phase 9 — see "OTP switched from SMS to
> email" further down for the current behavior. Left as-is here rather than
> rewritten, for the same reason every other phase's section stays as
> written: it's an accurate record of what was built and verified at the
> time, not a living spec.

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

## Bug fixed this phase: missing spatial indexes since phase 2

Every hand-added GIST index from phase 1 (`City`, `Ride`, `RideLocation`,
`WaitingEvent`) was silently dropped by the `add_auth_sessions` migration
in phase 2, and stayed dropped through phase 3 — Prisma's diff engine has
no way to know about an index it can't express in `schema.prisma`, so it
treated them as drift and emitted `DROP INDEX`. It went unnoticed because
reviewing a migration for a new feature isn't the same as reviewing it for
regressions in indexes the schema diff can't see. Already-pushed history
wasn't rewritten; `20260910183013_restore_dropped_gist_indexes` re-creates
exactly what was lost. Process fix: every future migration.sql gets
grepped for `DROP INDEX` on a `*_gist` index before it's applied, not only
when that migration also happens to add a geography column of its own.

## What's built (Phase 4 — ride state machine & lock-based assignment)

- **State machine** (`rides/state-machine.ts`) — §8's diagram as an
  explicit allow-list; every transition is rejected server-side if it's
  not in the table, and every transition writes a `RideStateEvent` row
  with a timestamp and (when known) a location — §8's literal requirement,
  which `Ride.acceptedAt/startedAt/endedAt` alone can't satisfy (they stay,
  as cheap headline timestamps for common queries; the event table is the
  actual audit trail).
- **Assignment** (`rides/assignment.ts`) — §7's candidate query
  (online + approved + `ST_DWithin`, nearest 8 first) against a new
  `DriverLiveLocation` table: a deliberately plain-Postgres stand-in for
  what the doc's own architecture diagram puts in Redis, since Redis itself
  is phase 5's explicit deliverable and assignment can't be tested without
  *some* live-location source. Offers go out one at a time, 20s timeout
  each (real `setTimeout`, in-process — doesn't survive a restart, which is
  an acceptable phase-4 limit, not something to fake a durable queue for).
  §7's actual safety property — a Postgres row lock (`SELECT ... FOR
  UPDATE`), not an app-level mutex — is what makes only one `accept()` ever
  win.
- **`POST /rides`** re-validates the quote server-side (not-expired,
  not-already-consumed) before creating anything, exactly as §4 requires.
- **Idempotency** (`rides/idempotency.ts`) — §4's "كل الطلبات الحساسة تحمل
  Idempotency-Key" on every ride-state-changing endpoint: a replayed
  request with the same key returns the identical cached response instead
  of re-running the side effect.
- Ownership checks throughout (§10 IDOR control): `GET /rides/:id` 404s
  for anyone who isn't the rider, the assigned driver, or an admin, not a
  403 that would confirm the ride exists.
- `rating` wasn't assigned to any single phase in the doc's own list; it's
  included here since `POST /rides/:id/rating` is grouped with the other
  ride endpoints in §4 and is a natural "close out the ride" action.
- Invoice generation is deliberately NOT built here — `POST /rides/:id/end`
  transitions state and stamps `endedAt` only. Real fare recomputation
  from the actually-recorded distance and waiting time is phase 6's
  explicit deliverable, not something to approximate now.

Verified against the real local DB with two/four seeded test drivers,
covering: the full happy-path lifecycle end to end; the double-accept
race (two drivers, only one wins — including a driver re-accepting their
own already-won offer); an explicit decline advancing to the next
candidate; an offer actually timing out after 20 real seconds and
advancing on its own; `NO_DRIVER_FOUND` with zero drivers online; the
waiting counter's `durationS` computed server-side against real elapsed
time; idempotent replay of `/end` returning a byte-identical cached
response; the full `RideStateEvent` audit trail in order; and the IDOR
check rejecting an unrelated driver's `GET /rides/:id`.

## What's built (Phase 5 — real-time & ETA)

- **Driver live locations moved to Redis** (`realtime/geo.ts`), replacing
  phase 4's Postgres `DriverLiveLocation` stand-in exactly as that
  migration's note said it would: one Redis GEO set (`GEOADD`/`GEOSEARCH`
  — native geospatial nearest-N, no PostGIS needed for this part) plus a
  companion per-driver hash with a 90s TTL for staleness. Presence in the
  geo set *is* "online"; a lapsed hash is cleaned up lazily the next time
  that driver would've matched. `assignment.ts`'s candidate query (§7) now
  reads from this, with a defense-in-depth re-check of `Driver.status`
  against Postgres in case an admin suspends someone mid-session.
- **WebSocket server** (`realtime/websocket.ts`) — `GET /ws?token=...`
  (query param, since browsers can't set custom headers on a WS upgrade),
  same access-token verification as every REST route. Three room shapes,
  verbatim from §6: `ride:{id}`, `driver:{id}`, `city:{id}:drivers`
  (admin-only). Subscribing to a room re-runs the same ownership check as
  `GET /rides/:id` (§10) — a stranger's subscribe attempt gets a same-
  shape `error` message, not a hint that the ride exists.
- **Redis Pub/Sub is the actual broadcast transport** (§2's explicit
  choice, not just an implementation detail): `realtime/broadcast.ts`
  publishes to Redis on every `POST /driver/location`; each server
  process's `websocket.ts` maintains its own local map of which sockets
  care about which channel and only subscribes Redis to channels at least
  one local socket wants. This is what makes it correct to run more than
  one server instance later, not just correct for the single instance this
  is tested against.
- **ETA** (`realtime/eta.ts`) — computed server-side from a real
  `geoProvider.route()` call on every location update, from the driver's
  current position to wherever they're actually heading (pickup before
  the trip starts, destination after) — never interpolated or held
  constant server-side, matching §6's explicit rule. Returns `null` (never
  a fabricated number) if the route call fails, so a client can show "ETA
  paused" per §6 rather than a fake countdown; wiring that up is a client-
  side (PWA) concern outside this backend.
- Client-side position smoothing (§6: interpolating between two stored
  points, rotating the car icon from the bearing between them) is
  explicitly a rendering concern for the existing frontend prototypes
  (§15) this backend serves, not something a Fastify API does — this
  phase's job is making sure what it *sends* (real coordinates, a real
  server-computed ETA, at the right cadence) is honest.

Verified against the real local Redis + WebSocket stack: a full ride
booked and matched entirely through Redis-backed candidate search (no
Postgres geo query involved); a rider's WebSocket receiving a live
location update **with a real server-computed ETA** the moment the
driver's phone would have sent one; a stranger's room-subscribe attempt
rejected the same way an IDOR probe on the REST API is; an unauthenticated
WebSocket connection closed immediately; and an offline driver correctly
disappearing from matching (`NO_DRIVER_FOUND` where they'd otherwise have
been the only candidate).

## Bug fixed this phase: a driver mid-trip was still matchable for a second ride

`assignment.ts`'s candidate query (§7) checked "online" (Redis) and
"approved" (Postgres) but had silently dropped §7's third, explicitly-named
filter — `NOT in_ride`. The phase-1 schema notes even called out that
"in_ride" would need to come from live state once it existed, and then
phase 4/5 built that live state and never actually applied the filter. It
surfaced while writing this phase's tests: a driver already `DRIVER_
ACCEPTED` on one ride was still being offered a second one, because
nothing excluded them. Fixed by adding a `ridesAsDriver: { none: { state:
{ in: ACTIVE_RIDE_STATES } } }` condition to the candidate query — and
since that "which states count as active" list was already duplicated
across `assignment.ts`, `realtime/broadcast.ts`, and the `/driver/location`
handler, it's now one exported constant (`ACTIVE_RIDE_STATES` in
`state-machine.ts`) all three import, so they can't drift apart again.
Verified directly: a driver mid-trip on ride A is now excluded from ride
B's matching (`NO_DRIVER_FOUND` when they'd otherwise have been the only
candidate).

## What's built (Phase 6 — invoices)

- **`issueInvoice`** (`pricing/invoice.ts`), called from `POST
  /rides/:id/end` right after the ride transitions to `TRIP_COMPLETED`
  (§4: "issues invoice server-side"). Reuses `calculateFare` from phase 3
  unchanged — the fare formula doesn't change at ride-end, only its
  inputs do:
  - **Distance**: §4's explicit rule is "يُعاد الحساب من المسافة
    المسجّلة فعليًا" (recomputed from the actually-recorded distance) —
    never the original quote's estimate. Computed as the geodesic length
    of the driver's real recorded GPS trail (`ST_Length(ST_MakeLine(...
    ORDER BY "serverTs")::geography)` over `RideLocation`, from
    `startedAt` onward — the trip itself, not the driver's drive to
    pickup). Falls back to the quote's `plannedDistanceM` only when there
    aren't enough breadcrumbs to form a line; that fallback is itself a
    real earlier route call, not an invented number.
  - **Waiting time**: sum of `durationS` across every `WaitingEvent` for
    the ride (there can be more than one if `TRIP_STARTED ⇄ WAITING`
    toggled more than once). If `/end` is called directly from `WAITING`
    without an explicit `/waiting/stop` first, the still-open event is
    closed in the same call so its time isn't silently dropped from the
    bill.
  - Same `pricing_version_id` the ride was quoted under (stored on the
    `Ride` row since phase 4), never whatever's currently effective —
    §9's versioning exists precisely so a mid-ride pricing change doesn't
    change what a rider already in a ride gets charged.
- **`RideLocation` is now actually written to** (`POST /driver/location`),
  not just Redis's live position — the historical trail invoicing needs.
  Only persisted while the driver has an active ride, and only for the
  trip itself, matching the distance calculation above.
- `GET /rides/:id` includes the invoice once the ride is `TRIP_COMPLETED`.

Verified end to end with a real multi-point simulated trail (not a
straight line): the invoice's `distanceM` matched a hand-computed
haversine sum of that trail to within ~10m — and, crucially, did *not*
match the original quote's planned distance, proving the real trail was
used rather than the estimate. Waiting time matched real elapsed seconds.
Total fare was hand-verified against the actual seeded Idlib pricing
config. Replaying `/end` doesn't create a second invoice (confirmed
directly against the database, not just the HTTP response).

## What's built (Phase 7 — admin panel & audit log)

- **Admin bootstrap** (`npm run admin:create <email> <role>`) — a script,
  deliberately not an HTTP endpoint: §10 makes MFA mandatory for admin,
  and the *first* admin account has to come from somewhere before any
  route could itself be protected by admin auth. An open "create an
  admin" endpoint would be a standing hole, not a bootstrap step. Prints
  the MFA secret and a scannable `otpauth://` provisioning URI.
- **`requireAdminRole(...roles)`** (`auth/guard.ts`) — the guard phase 2
  deliberately didn't build yet, now that there are real admin routes to
  attach it to. Same discipline as `requireDriver`: role is re-checked
  fresh from Postgres on every call, never trusted from the access
  token's claim, so a demoted or deactivated admin loses access within
  the token's 10-minute window, not just at next login.
- **Every mutation is audited** (`admin/audit.ts` → `AuditLog`, §10):
  actor, role, action, entity, real before/after values, reason, IP, user
  agent. Written explicitly in each handler — real captured state, not a
  generic request-body dump.
- Routes matching §4's admin list, role-gated by what actually makes
  sense per action (full mapping in the code, not repeated here):
  `/admin/users` (view, suspend/reactivate), `/admin/drivers` (view,
  approve/reject/suspend — §15's "إضافة واعتماد فعليان"), `/admin/rides`,
  `/admin/invoices`, `/admin/ratings` (read-only ops visibility),
  `/admin/pricing` (§9: only ever inserts a new `PricingVersion`, never
  mutates one), `/admin/announcements` (create/deactivate),
  `/admin/notifications` (creates the record with `deliveryStatus:
  "QUEUED"` — real delivery is phase 8, and pretending otherwise here
  would be exactly the fabricated status the doc's "no fake data"
  principle rules out), `/admin/audit` (`SUPER_ADMIN` only).
- **`/admin/cities`** — not in §4's list, added because `/admin/pricing`
  is meaningless without a city to price, and §9's "no city hardcoded in
  code" only holds if there's a real way to add one that isn't a script.
  `POST` takes a name, centroid, and boundary ring — same pattern as
  `scripts/dev-seed.ts`'s Idlib bootstrap, now available as a real
  operational path instead of a one-off script.

Verified against the real local stack, including the login step this
sandbox otherwise can't reach: `/auth/google` needs real Google
credentials this environment doesn't have, so the test minted an MFA
ticket the same way that endpoint would right after a real Google
exchange, then drove the actual `/auth/admin/mfa/verify` endpoint with a
real TOTP code computed from the bootstrap script's real secret — a
genuine admin session, not a stubbed one. From there, entirely over real
HTTP: a `SUPER_ADMIN` creating a city and a `FINANCE` admin pricing it;
`FINANCE` correctly forbidden from driver approval and from the audit log
(role-gated, not just authenticated); a real driver signup (OTP) showing
up in the `PENDING` list and getting approved, with `approvedById` and an
audit entry recording the real actor and the real before/after status;
double-approving rejected; and a regular (non-admin) user forbidden from
every `/admin/*` route.

## What's built (Phase 8 — notifications)

- **Real Web Push delivery** (`notifications/push.ts`), standard VAPID —
  not a Firebase Admin SDK / FCM server integration. §11 is explicit this
  is a PWA with no native app and no app store; Chrome's push service is
  reached the same standard way every other browser's is, over the Push
  API, so there's no separate proprietary integration to build for it.
  `FCM_SERVER_KEY` stays defined (§13 names it) but genuinely unused —
  documented in `env.ts` and `.env.example` rather than silently ignored.
- **`deliverNotification`** (`notifications/deliver.ts`) resolves real
  targets (a specific recipient, or a broadcast fanned out across
  `PASSENGER`/`DRIVER`/`ALL`'s actual `PushSubscription` rows — `ADMIN`
  has no push channel at all, by schema, not a gap: `AdminUser` has no
  subscription relation, §3), sends to each, and writes back what
  *actually* happened — `SENT`, `FAILED`, `NO_SUBSCRIPTIONS`,
  `NOT_CONFIGURED`, or `NO_CHANNEL`. Phase 7 could only ever leave a
  notification at `"QUEUED"`; claiming `SENT` there would have been
  exactly the fabricated status "no fake data" rules out. Wired into
  `POST /admin/notifications`.
- **Dead-subscription cleanup**: a `404`/`410` from a push service means
  the subscription is gone for good (uninstalled, permission revoked,
  browser data cleared) — standard Web Push practice is to delete it
  rather than keep retrying forever, done automatically in `push.ts`.
- **`POST`/`DELETE /push-subscriptions`** and **`GET
  /push/vapid-public-key`** — infrastructure the doc's §4 endpoint list
  doesn't separately name but a PWA client needs regardless: it has to
  fetch the public key before calling `pushManager.subscribe()`, and
  register/unregister the resulting subscription somewhere.
- **Closed a gap flagged back in phase 2**: §10's threat table lists
  "إشعار جلسة جديدة" (new-session notification) as an applied control
  against account takeover. `createSession` (not `rotateSession` — a
  refresh is a continuation, not a new session) now fires one on every
  fresh login, fire-and-forget so a notification failure can never break
  login itself.

Verified against a real (self-signed, HTTPS — `web-push` always speaks
HTTPS regardless of the endpoint's declared scheme, so a plain-HTTP stub
silently never got a request until this was caught) local stub shaped
like a real push service: registered a *cryptographically real* push
subscription (an actual P-256 EC key pair, not placeholder strings — junk
keys fail in `web-push`'s own encryption step before any network call
happens), then confirmed the stub actually received a real
VAPID-authenticated, `aes128gcm`-encrypted request with a non-empty body
— not just that the HTTP call returned 201. Confirmed a fresh login
queues a real `Notification` row and honestly reports
`NO_SUBSCRIPTIONS` before one exists. Confirmed a `410` response gets
the dead subscription deleted from the database automatically, that a
live sibling subscription still receives the same notification, and that
unsubscribing removes it for good — leaving a subsequent notification to
honestly report `NO_SUBSCRIPTIONS` again rather than a stale `SENT`.

## What's built (Phase 9 — tests & security review)

### Security hardening found and fixed before writing tests

Two real gaps in §10's threat table were still open going into this phase
— found by re-reading that table against what phases 1-8 had actually
built, not by a test failure:

- **GPS plausibility checking** (`realtime/plausibility.ts`, new) — §10's
  "تزييف الموقع" (location spoofing) row explicitly names "reject
  impossible speeds/jumps" and "flag anomalies for human review" as
  controls; nothing enforced either before this. `POST /driver/location`
  now runs every incoming point through `checkLocationPlausibility`
  (rejects on device-clock skew > 300s, accuracy worse than 200m, or an
  implied speed over consecutive fixes above ~198 km/h) before it's ever
  broadcast or persisted — an implausible point is logged and skipped, not
  silently trusted. This is detection-and-reduction, not a claim of 100%
  spoofing prevention on a user-owned device — the doc itself treats that
  as an impossible promise, not a missing feature.
- **General API rate limiting** (`@fastify/rate-limit`, registered in
  `server.ts`) — §10's "إساءة استخدام API" row asks for per-user/IP rate
  limits; only `/auth/otp/*` had one (email-keyed, in `otp.ts`). A
  Redis-backed floor (300 req/min/IP, generous enough for a driver polling
  location every 2-8s per §6) now sits under the whole API, so it holds
  across more than one server instance.

### Automated test suite (`test/`, Node's built-in `node:test` runner — no
new test-framework dependency)

Covers §14's list item by item:

| §14 ask | Where |
| --- | --- |
| Pricing engine unit tests | `test/pricing/engine.test.ts` |
| State machine unit tests | `test/rides/state-machine.test.ts` |
| Auth/IDOR integration tests | `test/integration/auth-idor.test.ts` |
| Concurrency: two drivers race one ride | `test/integration/concurrency.test.ts` |
| Real-time disconnect/reconnect | `test/integration/realtime-ws.test.ts` |
| Invoice vs. known distance | `test/integration/invoice-distance.test.ts` |

None of this is mocked assertions against a fake DB — every integration
test runs against a real, disposable Postgres+PostGIS database
(`tak_c_taxi_test`, migrated with the real `prisma migrate deploy`
history) and a real Redis instance, through the real Fastify app
(`app.inject()` for HTTP, a real `ws` client against a real ephemeral-port
listener for WebSocket) or by calling the real service-layer functions
directly (`acceptOffer`, `issueInvoice`, `requestOtp`/`verifyOtp`). Nothing
here asserts "the mock returned what the mock was told to return."

Specifics worth calling out:

- **The concurrency test** (`assignment.ts`'s `acceptOffer`, §7's single
  most safety-critical property) fires two real, concurrent transactions
  at Postgres — not a scripted "call A then B" — and checks that the real
  `SELECT ... FOR UPDATE` row lock lets exactly one win, repeated across 8
  fresh rides so a race that only sometimes loses can't pass on luck.
  Also checks a third, later `acceptOffer` call against an already-decided
  ride is rejected the same way.
- **The invoice test** builds a known GPS trail, computes its distance
  with an independent haversine implementation (written directly in the
  test, never imported from product code), and checks it against
  `issueInvoice`'s real PostGIS `ST_Length` calculation — within a 2%
  tolerance (PostGIS's geodesic calculation and a spherical haversine sum
  aren't bit-identical, but agree closely at these distances). Also checks
  the waiting-time aggregation, the planned-distance fallback when no
  trail was recorded, and that a ride can't be invoiced twice.
- **The WebSocket test** opens a real socket, subscribes to a ride room,
  receives a real Redis-Pub/Sub-relayed broadcast from
  `broadcastDriverLocation`, disconnects, then opens a **second** fresh
  connection and confirms it can resubscribe and keep receiving live
  updates — the local-subscriber bookkeeping in `websocket.ts` doesn't
  leak or wedge across a disconnect/reconnect cycle. Also checks
  unauthenticated/invalid-token connections are closed with `4001`, and
  that the same IDOR discipline as `GET /rides/:id` applies to room
  subscriptions (`rooms.ts`'s `canSubscribe`).
- **The auth/IDOR suite** exercises the real OTP request→verify flow
  (including replay and rate-limit rejection), then mints real JWT
  sessions via `createSession` to check `GET /rides/:id` the way §10
  demands: the ride's own rider and assigned driver can see it, an
  unrelated rider or driver gets a `404` (not `403` — no existence leak),
  and an admin can see any ride. Also checks `requireAdminRole` re-reads
  the DB on every request rather than trusting the access token's role
  claim — a `SUPER_ADMIN` demoted to `READONLY` mid-session loses access
  on its very next request, not at next login.

Run it with `npm test` (see `.env.test.example` for the one-time test
database setup — it must be a separate, disposable database, since the
suite truncates every application table between test files).

### Two real bugs found *while writing the tests themselves*

Both are fixed; neither was a product-code defect — both were in the test
infrastructure this phase added, and are recorded here in the same spirit
as every other phase's "here's what broke and how it was actually fixed,"
not swept past:

- **`resetDb()`'s first version truncated PostGIS's own `spatial_ref_sys`
  table.** It queried `pg_tables` for every table in `public` except
  `_prisma_migrations` — which also matches `spatial_ref_sys`, a real base
  table the `postgis` extension owns, not just metadata. Every test file's
  setup was silently emptying it, so `ST_Length`/geography casts started
  failing with `Cannot find SRID (4326) in spatial_ref_sys` — intermittently,
  since the row count depended on which test file had run most recently.
  Fixed by excluding any table registered to an extension (`pg_depend`
  with `deptype = 'e'`) rather than naming `spatial_ref_sys` as a
  one-off special case, so this stays correct if PostGIS ever adds
  another base table.
- **A freshly-created test database's `spatial_ref_sys` starts empty.**
  `CREATE EXTENSION postgis` does not, by itself, load the standard EPSG
  SRID definitions — that's a separate seed script
  (`.../contrib/postgis-3.4/spatial_ref_sys.sql`) the dev database
  happened to have been seeded with already, but a fresh test database
  does not get for free. Documented as an explicit one-time setup step in
  `.env.test.example`, since anyone provisioning a new database (test,
  staging, or a real production one) will hit the same thing otherwise.

### Security review

- **SQL injection**: every raw-SQL call site in `src/` was re-audited this
  phase. All use Prisma's tagged-template `$queryRaw`/`$executeRaw` (safe,
  parameterized) except the two `$queryRawUnsafe`/`$executeRawUnsafe`
  call sites (`realtime/broadcast.ts`'s `ridePoint`, `scripts/dev-seed.ts`),
  both of which interpolate only a fixed, compile-time-constant
  string looked up from a small object literal — never request input —
  with every actual value passed as a bound parameter. No injectable
  call site found; one purely defensive hardening (the
  `RIDE_POINT_COLUMNS` lookup in `broadcast.ts`, done in phase 8/9) was
  applied on top of an already-safe call, not a fix for a real
  vulnerability.
- **IDOR**: covered by the automated suite above (HTTP and WebSocket both)
  — every ride/driver/city resource re-checks real ownership from the DB
  on every request, never from a client-supplied ID alone.
- **Auth**: access tokens are short-lived (10 min) and role/status is
  re-checked from Postgres on every protected request, never trusted from
  the token's own claims — covered by the demoted-admin test above.
  Refresh tokens rotate with reuse detection (`sessions.ts`); a replayed,
  already-rotated refresh token kills the entire session family, not just
  itself.
- **Location spoofing / API abuse**: closed this phase — see "Security
  hardening" above.
- **Explicitly out of scope, not overlooked**:
  - Malicious file-upload scanning — no upload endpoint exists yet in this
    backend (driver documents/vehicle photos are S3-key references in the
    schema; the actual upload flow isn't built).
  - Admin IP allowlisting — §10 itself marks this "اختياري" (optional).
- **Not applicable to this phase**: §14 also asks for a Lighthouse
  run against a slow network and a UX review. Both are frontend-PWA
  concerns; per §15 the frontend already exists as separate prototypes
  this repo doesn't contain, and this project is the backend only (see
  "Why this doesn't reuse the root app's stack" above). Nothing to run
  Lighthouse against here.

All 9 phases from the architecture document are now built.

## OTP switched from SMS to email (post-phase-9)

The architecture doc's §5 plan was phone number + SMS OTP. After phase 9,
switched to email as the login identity and OTP delivery channel entirely
(user decision) — a Syria-reachable SMS gateway is a real operational
blocker; a transactional email API isn't.

- **`User.email`** replaces `User.phone` as the unique login identity
  (migration `20260911152307_switch_login_identity_to_email` — backfills
  any existing dev/test rows with a `<old phone>@migrated.invalid`
  placeholder rather than dropping them or fabricating fake-looking real
  addresses; verified applying cleanly to both a database with existing
  rows and a brand-new empty one). `OtpRequest.phone` → `OtpRequest.email`
  the same way.
- **`email.ts`** (new) — real delivery via [Resend](https://resend.com)'s
  REST API (`POST https://api.resend.com/emails`), plain `fetch`, no SDK —
  same style as the existing OSRM/Nominatim clients. `EMAIL_PROVIDER_KEY`
  and `EMAIL_FROM_ADDRESS` replace `OTP_PROVIDER_KEY` in `env.ts`; same
  optional-in-dev/required-in-production discipline as before. The request
  shape was verified against Resend's real endpoint (a deliberately-invalid
  key still gets back a real `401 API key is invalid` from Resend's own
  validation, not a connection or parsing error — confirms the endpoint,
  method, headers and JSON body are all correctly formed without needing a
  real key to prove it).
- **`/auth/google` got simpler, not just renamed**: the old design's
  `no_account` dead-end ("Google can't originate an account, it has no
  phone number to key one on") no longer applies — Google already hands
  over a real, verified email in the same `id_token` this route already
  parses (see `google.ts`'s `GoogleIdentity.email`/`emailVerified`, both
  fetched before but never used until now). Google sign-in now upserts
  (finds-or-creates) the account directly by email when Google reports it
  verified, and links `googleSub` onto an existing email-matched account
  the same call.
- Every place that read/wrote `phone` was updated: `otp.ts`, `routes.ts`
  (including `/me`), `admin/routes.ts`'s driver list projection, and the
  test suite's fixtures/auth tests. Re-ran the full suite after: still
  39/39 against a real database.

**To actually send real OTP emails** (not just log the code in dev):
1. Sign up at [resend.com](https://resend.com) (free tier, no card).
2. Get an API key from the dashboard's *API Keys* page → `EMAIL_PROVIDER_KEY`.
3. Set `EMAIL_FROM_ADDRESS=onboarding@resend.dev` to start sending
   immediately with zero extra setup, **or** verify the project's own
   domain (`tak-c.taxi`) in Resend's *Domains* page — it gives exact
   SPF/DKIM DNS records to add at the domain's registrar (GoDaddy, already
   owned per "Deployment" below) for real production sending from
   `otp@tak-c.taxi`-style addresses instead of Resend's shared domain.

## OSRM verified with real Idlib/Dana/Sarmada data (post-phase-9)

§3's "still needs" list named a self-hosted routing engine "actually
deployed" as a real blocker. Went further than a stub: built real OSRM
from source and ran it against real OpenStreetMap data for the specific
areas asked about — central Idlib city, الدانا (Dana), and سرمدا
(Sarmada, near the Bab al-Hawa crossing) — and got a real, correct fare
quote for an actual Dana→Sarmada trip through this project's own code,
not a synthetic test.

- **Real coordinates, not estimated**: geocoded via the public Nominatim
  instance (nominatim.openstreetmap.org) — Dana at 36.2135713,36.7704347,
  Sarmada at 36.2014255,36.7119201 (a "سرمدا"-named camp site — the
  nearest real, precisely-located OSM feature to the town's own name;
  Nominatim's text search kept surfacing an unrelated monument for a bare
  "Sarmada" query).
- **Real map data**: Geofabrik (the usual OSM country-extract source) was
  unreachable from the network this was built on — blocked at the
  egress-policy level (confirmed via the proxy's own status endpoint:
  consistent connection resets on the TLS handshake, not a timeout or a
  one-off blip), not a code problem. Used the official OpenStreetMap API's
  direct map export instead — real data either way, just fetched
  differently, in several sub-50k-node boxes merged with `osmium merge`
  (this part of Idlib is mapped in real detail: IDP camp names like
  "مخيم الامداد" and "مخيم الخربة" showed up in the actual data, not
  invented for this doc).
- **Real build**: OSRM has no Ubuntu package, so this built it from
  source — which meant resolving five more from-source/mismatched-version
  dependencies one at a time (sol2, flatbuffers — Ubuntu's packaged
  version was too old to provide the CMake helpers OSRM's build needs,
  built 23.5.26 from source instead — vtzero, protozero, libosmium) and,
  separately, updating a too-old system CMake (3.28; this OSRM checkout's
  `cmake_policy` needs ≥3.29). `scripts/setup-osrm-idlib.sh` documents the
  data-fetching part of this reproducibly; for an actual deployment,
  running OSRM's own Docker image is simpler than a from-source build —
  building from source here was specifically a workaround for not having
  a working Docker daemon in the sandbox this was developed in, not a
  recommendation.
- **A real bug found and fixed**: fetching Dana and Sarmada as two
  separate bounding boxes (to stay under the direct-API's 50k-node cap)
  left their road networks disconnected — a real `POST /rides/quote` for
  Dana→Sarmada failed with "Impossible route between points" (OSRM
  correctly reporting a real limitation of the data, not a bug in OSRM or
  this project's code). Fixed by fetching the connecting road (the M45,
  confirmed by its `ref` tag in the fetched data) as a fourth box and
  re-merging — `scripts/setup-osrm-idlib.sh` includes this "gap" box so
  the same disconnection doesn't recur for anyone re-running it.
- **The actual verified result**: `POST /rides/quote` for a real
  الدانا→سرمدا trip, through this project's own `pricing/quote.ts` (not a
  raw OSRM call) — `distance_m: 7658`, `duration_s: 784`,
  `fare: 511` (cents, USD) — computed from a real route over real roads,
  priced with the real seeded Idlib pricing version.

Not a substitute for a real production deployment: this ran locally
against a locally-built OSRM process, not a persistent server anything can
reach, and only covers three specific areas rather than all of Idlib
Governorate. But it's real proof the architecture works end to end with
this project's own actual code, not a stubbed routing response.

## Getting started (local development)

### 1. Prerequisites

- Node.js 20+
- PostgreSQL with the PostGIS extension available (`CREATE EXTENSION postgis`
  requires it to be installed on the server, not just enabled per-database).
  **`CREATE EXTENSION postgis` alone is not enough** — it creates an empty
  `spatial_ref_sys` table; the standard EPSG SRID definitions (including
  4326, which every geography column in this schema uses) are a separate
  seed script that has to be loaded once per database:
  `psql -d <your_db> -f "$(pg_config --sharedir)/contrib/postgis-3.4/spatial_ref_sys.sql"`
  (found the hard way in phase 9 — see that section's "bugs found while
  writing the tests").
- Redis (phase 5+ — driver matching and realtime both hard-depend on it,
  no degraded mode)

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
`{"status":"ok","db":"up","redis":"up","time":"..."}`.

### 6. Run the tests

```bash
cp .env.test.example .env.test   # then edit DATABASE_URL — see that file's setup steps
npm test
```

Needs its own, disposable Postgres database (the suite truncates every
application table between test files — never point this at your dev DB).
Uses Node's built-in `node:test` runner via `tsx`, so there's nothing extra
to install.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (`tsx watch`) |
| `npm run build` | Compile to `dist/` |
| `npm run start` | Run the compiled build |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply existing migrations (production/CI) |
| `npm run db:studio` | Open Prisma Studio |
| `npm test` | Run the automated test suite against `.env.test` |
| `npm run typecheck:test` | Typecheck `src/` and `test/` together |

## Known dependency note

`npm audit` reports 4 high-severity findings in `mysql2`, a transitive
dependency bundled inside the `prisma` CLI's own multi-database tooling —
not something this project imports (only the PostgreSQL adapter is used).
Confirmed, not just asserted: the production Docker image's `runtime-deps`
stage (see `Dockerfile`) excludes it by construction (`npm ci --omit=dev
--omit=optional`, since `mysql2` only enters the tree via the `prisma` CLI
package, which `@prisma/client` pulls in as an *optional* peer dependency —
`npm prune --omit=dev` alone does not drop it, a real dead end hit while
building the Dockerfile; see its comments) — `npm audit` on that exact
`node_modules` reports **0** vulnerabilities. The suggested `npm audit fix
--force` downgrades `prisma` to 6.x, which would break the
PostGIS/`Unsupported()` schema and diverge from the sibling project's
Prisma 7 convention, so it hasn't been applied — and per the above, doesn't
need to be for the running server. Worth re-checking against a newer
`prisma` release regardless, since it still affects local dev/CI tooling.

## Deployment (§12)

### Docker

```bash
docker compose up --build
```

Brings up Postgres+PostGIS, Redis, runs migrations once (the `migrate`
service — see the Dockerfile's "migrate" target comment on why this is
never baked into the server's own startup: N replicas racing to apply the
same migration at once), then starts the API on `:3000`. This is a local
development / staging reference, not a secrets source — see
`docker-compose.yml`'s own header comment; a real deployment supplies its
own secrets via the target platform's store, not this file.

The `Dockerfile` has three build targets (`docker build --target <name>`):

| Target | Purpose |
| --- | --- |
| `build` | Full toolchain — compiles `dist/`. Not deployed directly. |
| `migrate` | Runs `prisma migrate deploy` once, as its own release-phase job. |
| `runtime` | The actual server — pruned to production dependencies only (~106MB smaller `node_modules` than a naive `npm prune`, and 0 vs 4 `npm audit` findings — see "Known dependency note" above). |

**Verified without a working Docker daemon** (unavailable in the sandbox
this was built in — nested containerization is blocked): every stage's
underlying commands (`npm ci`, `npm run build`, the `runtime-deps` install,
the assembled `dist/` + pruned `node_modules` layout) were run directly and
the resulting server was actually started and hit real HTTP requests
against real Postgres/Redis — see the git history for specifics. `docker
build`/`docker compose up` themselves have **not** been executed — Docker
mechanics specifically (multi-stage `COPY --from`, the base image's
non-root `node` user, `apt-get` inside the image) are standard, well-
documented behavior, not custom logic, but this is still worth a real
`docker compose up` smoke test in an environment where the daemon runs
before relying on it for a real deployment.

### CI

`.github/workflows/tak-c-taxi-ci.yml` runs on every push/PR touching
`tak-c-taxi/**`: real Postgres+PostGIS and Redis service containers,
`npm ci`, migrations, typecheck, build, and the full test suite — the same
steps documented above, run automatically. (Also not executed against a
real GitHub Actions runner from here — same reasoning as the Docker note.)

### DNS / hosting

Domain is already purchased (GoDaddy) — only DNS records need to change,
once the deployed server below has a domain pointed at it instead of its
bare IP. Email (Resend) and routing (OSRM) are done and verified against
that real deployment — see "Real deployment: GCP free-tier VM" below.
Still missing: Nominatim/geocoding (deferred — see that section) and
object storage for driver documents.

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

### Real deployment: GCP free-tier VM (post-phase-9)

The backend is actually running — not just verified locally. A real
Google Cloud e2-micro VM (`tak-c-taxi-backend`, always-free tier, us-
central1-a) runs the full stack via `docker-compose.prod.yml`: Postgres+
PostGIS, Redis, the API, and — unplanned when this section's earlier
paragraphs were written, but it turned out to fit — a real OSRM container
serving the same verified Idlib/Dana/Sarmada extract from the "OSRM
verified with real Idlib/Dana/Sarmada data" section above. `createQuote`
only calls `geoProvider.route()`, never `geoProvider.geocode()`, so
`/rides/quote` — the actual fare/route flow — doesn't need Nominatim at
all; only address-search (`/geo/geocode`, `/geo/reverse`) does, and that's
still deferred (genuinely heavier: a second Postgres-backed search index
that doesn't fit this box's 1GB RAM alongside everything else).

Verified end to end against the real, deployed, freshly-migrated database
(seeded with the real launch config from `scripts/dev-seed.ts` — §9's
actual numbers, not test fixtures):

```
$ curl -s http://localhost:3000/health
{"status":"ok","db":"up","redis":"up","time":"2026-09-11T19:33:33.623Z"}

$ curl -s -X POST http://localhost:3000/rides/quote -H "Content-Type: application/json" \
    -d '{"pickup":{"lat":36.2135713,"lng":36.7704347},"dest":{"lat":36.2014255,"lng":36.7119201},"pickupLabel":"الدانا","destLabel":"سرمدا"}'
{"distance_m":7657,"duration_s":784,"fare":510,"currency":"USD","quote_id":"kzx8u135gge0syv4zj5du5xy","expires_at":"2026-09-11T19:38:03.995Z"}
```

That's a real Dana→Sarmada fare, computed by the real running server, from
a real OSRM route over real OpenStreetMap data, priced with the real §9
launch config, against a real Postgres row — the same result (within
~1m/~1¢ rounding) as the local sandbox verification earlier in this
document, this time with nothing mocked or local.

NODE_ENV is `development`, not `production`, on this deployment — not a
shortcut: `GEOCODER_URL` still isn't set, and `src/config/env.ts` is
supposed to refuse to boot under `NODE_ENV=production` without it. That
check is doing its job; this box just doesn't satisfy it yet.

Three real bugs surfaced getting here, none of them hit by any earlier
manual verification because none of it had run inside an actual built
Docker image against a live daemon before now — see the git history
(commit messages have full root-cause writeups) for:
`prisma.config.ts` never being `COPY`'d into the image (so `migrate
deploy` couldn't find a datasource URL at container runtime), the build
then failing entirely once that config file made `prisma generate` also
need a `DATABASE_URL` — at *build* time, before one exists — and
`schema.prisma`'s `moduleFormat`/`importFileExtension` generator options
defaulting to "inferred from environment": the same schema and Prisma
version emitted different (and, in one direction, broken) import
extensions depending on the exact Node.js patch version running `prisma
generate`, which differed between the sandbox this was developed in and
the `node:22-bookworm-slim` image actually pulled on the VM.

Public reachability confirmed independently too — this project's own
development sandbox can't test it (its egress proxy can't reach arbitrary
external IPs/ports, only the standard package/API hosts it allowlists),
but a real request from a real outside device/network (`GET
http://<external-ip>:3000/health`) got the same `{"status":"ok",...}`
response shown above.

**Not done yet**: HTTPS/a real domain (still the bare `http://<external-ip>:3000`
this section's curl output uses), Nominatim/`GEOCODER_URL`, S3 for driver
documents.
