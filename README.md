# إدلب.com — Idlib Platform

A production PWA built for **شركة الخطيب للحلول التقنية** (Al-Khatib Technical
Solutions): every individual or business gets one editable, publishable public
page (with a real URL and a trackable QR code), managed through role-based
admin and customer dashboards.

## Tech stack

- **Next.js 16** (App Router, Turbopack, React 19, TypeScript)
- **Prisma 7** with the `pg` driver adapter, targeting **PostgreSQL**
- **Tailwind CSS v4** (CSS-first config, no `tailwind.config.js`)
- **Radix UI** primitives, `lucide-react` icons, `sonner` toasts, `react-colorful`
- Session auth via signed httpOnly cookies (bcrypt password hashing, no
  third-party auth provider)
- S3-compatible object storage (e.g. Cloudflare R2) for avatars/covers/logos/
  product images, via presigned direct-to-bucket uploads
- Installable PWA: web manifest, service worker (offline shell + runtime
  cache), maskable icons

There is **no seed data and no demo/fake accounts anywhere in the codebase**.
Every list in the app renders a genuine empty state until real data exists.
The only account created outside normal admin flows is the first Super Admin,
created once through `/setup` (see below).

## Roles

- **Super Admin** — full access to every admin feature, unrestricted.
- **Sub-Admin** — created by a Super Admin with a granular set of permissions
  (see `src/lib/rbac.ts` for the permission catalog): user management,
  subscriptions, audit log, analytics, edit-on-behalf, messaging, and
  review-and-publish are each independently grantable.
- **Individual** — a personal public page: profile, contact buttons, visual
  appearance, publish flow.
- **Business** — a company public page: company info, full color
  customization, contact buttons, products/categories with per-category
  dynamic fields, coupons, publish flow.

## Getting started (local development)

### 1. Prerequisites

- Node.js 20+
- A PostgreSQL database (local or remote)

### 2. Install dependencies

```bash
npm install
```

`postinstall` runs `prisma generate` automatically.

### 3. Configure environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres connection used by the running app |
| `DIRECT_URL` | Direct (non-pooled) Postgres connection, used only for migrations |
| `NEXT_PUBLIC_BASE_URL` | Public origin of the deployment; used to build public page links and QR codes |
| `SETUP_TOKEN` | One-time secret required to create the first Super Admin at `/setup` |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_BASE_URL` | S3-compatible object storage for uploaded images. Leave unset locally — uploads will show a clear "storage not configured" message instead of failing silently |
| `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_WHATSAPP`, `NEXT_PUBLIC_CONTACT_EMAIL` | Optional; drive the contact CTAs on the public marketing landing page |

### 4. Apply the database schema

```bash
npm run db:migrate
```

This runs `prisma migrate dev`, which creates/updates tables against
`DIRECT_URL`. Use `npm run db:deploy` (`prisma migrate deploy`) in production
instead — it applies existing migrations without generating new ones.

### 5. Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000`. With an empty database you will be redirected
to `/setup` automatically.

### 6. Create the first Super Admin

Visit `/setup`, enter the `SETUP_TOKEN` from your `.env` plus the admin's
name/username/password. This route only ever works once: it requires both a
matching token **and** zero existing users, and refuses to run again after
the first account is created. There is no other way to create a Super Admin
— every other admin account is a Sub-Admin created from the Super Admin's own
dashboard.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run a production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply existing migrations (production) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run icons:generate` | Regenerate PWA icons from `scripts/brand-mark.svg` |

## Deployment notes

This app is built to deploy on **Vercel** with a managed Postgres provider
(Neon, Vercel Postgres, or Supabase all work — set `DATABASE_URL` to the
pooled connection string and `DIRECT_URL` to the direct one) and an
S3-compatible bucket such as **Cloudflare R2** for uploaded images.

- `npm run build` runs `prisma migrate deploy` automatically before `next
  build`, so every Vercel deploy applies any pending migrations against
  `DIRECT_URL` with no separate release step. After your first deploy
  succeeds, visit `/setup` once to create the real Super Admin.
- Payment status (paid/unpaid/late) is tracked and toggled manually from the
  admin subscriptions screen — there is no payment gateway integration.
- Notifications are in-app only (a notification center in each dashboard) —
  there is no outbound email/SMS/WhatsApp delivery integration.
- Rotate or remove `SETUP_TOKEN` from your environment after the first Super
  Admin is created; it has no further use and its value is not needed again.

## Project structure

```
prisma/schema.prisma       Database schema
src/proxy.ts                Lightweight auth-cookie redirect (UX only — real
                             authorization happens in src/lib/auth.ts guards
                             and every Server Action)
src/lib/                    Auth, RBAC, business logic, Server Actions
src/app/(marketing)         Public landing page
src/app/setup, /login       First-run and authentication flows
src/app/admin/*             Super Admin / Sub-Admin dashboard (one folder per
                             permission area from the product spec)
src/app/dashboard/*         Individual/Business customer dashboard
src/app/u/[slug]            Public, published customer pages
src/app/api/uploads/presign Presigned upload URL issuance
src/app/api/qr/[slug]       QR code image generation
src/components/             Shared UI, admin/dashboard chrome, the
                             profile-editor components reused by both the
                             customer dashboard and the admin's
                             edit-on-behalf screens
public/sw.js, manifest.webmanifest   PWA service worker and manifest
```
