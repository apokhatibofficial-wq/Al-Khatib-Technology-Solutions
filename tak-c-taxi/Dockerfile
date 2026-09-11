# syntax=docker/dockerfile:1

# Shared base: Prisma's query engine/CLI need OpenSSL on Debian slim images
# even with the driver-adapter setup this project uses (@prisma/adapter-pg) —
# cheap insurance against the class of "OpenSSL not found" errors Prisma's
# own deployment docs warn about, not a confirmed requirement either way.
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV CHECKPOINT_DISABLE=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---- build: full toolchain — installs devDependencies, generates the
# Prisma client (prisma-client generator emits real .ts source, compiled by
# tsc below, not a prebuilt bundle — see src/generated/prisma/), compiles. ----
FROM base AS build
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- migrate: a separate image target that keeps the full toolchain (the
# prisma CLI is a devDependency, pruned out of the runtime image below) so
# `prisma migrate deploy` can run as its own one-off release-phase job.
# Deliberately never invoked from the server's own startup command — if it
# were, every replica of a multi-replica deploy would race to apply the
# same migration at once. Run this image once, then roll the runtime image. ----
FROM build AS migrate
ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- runtime-deps: a separate, from-scratch install — NOT `npm prune
# --omit=dev` on the build stage's node_modules. Tried that first; it does
# not work here: @prisma/client declares `prisma` as an (optional) peer
# dependency, so npm's lockfile marks the prisma CLI "devOptional" and
# `npm prune --omit=dev` deliberately keeps it (and everything it pulls in
# — @prisma/dev, @prisma/studio-core, mysql2, the exact package this
# project's own "Known dependency note" already flags for 4 high-severity
# npm audit findings) rather than risk leaving an unmet peer. A clean
# `npm ci --omit=dev` has the same problem — npm auto-installs non-optional
# peers regardless of --omit=dev. `--omit=optional` is what actually skips
# it; that in turn skips postinstall's `prisma generate` too (the CLI it
# needs is gone), which this stage doesn't want anyway — the generated
# client's compiled .js already came from the build stage's dist/ — hence
# --ignore-scripts. Confirmed empirically: this cuts node_modules from
# ~377M to ~106M and `npm audit` from 4 high-severity findings to 0 in the
# actual runtime image, vs. the prune approach shipping them unchanged. ----
FROM base AS runtime-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional --ignore-scripts

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
