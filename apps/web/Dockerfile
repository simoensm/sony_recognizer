# Web app production image (build from the REPO ROOT):
#   docker build -f apps/web/Dockerfile -t sr-web .
# Multi-stage: heavy build stage, tiny runtime stage.

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

# Install with the whole workspace context (pnpm needs all package.jsons).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/ingest/package.json apps/ingest/
COPY packages/db/package.json packages/db/
COPY packages/queue/package.json packages/queue/
COPY packages/config/package.json packages/config/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @sr/db db:generate
# Dummy env for build only — nothing connects during `next build`.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
    REDIS_URL=redis://localhost:6379 \
    S3_ENDPOINT=http://localhost:9000 S3_ACCESS_KEY=build S3_SECRET_KEY=build S3_BUCKET=build \
    BETTER_AUTH_SECRET=build-time-only-secret BETTER_AUTH_URL=http://localhost:3000 \
    pnpm --filter @sr/web build
# Next's standalone tracing misses Prisma's native engine (.so.node) under
# pnpm — copy it into a path the client searches at runtime.
RUN find /repo/node_modules/.pnpm -name "libquery_engine-linux-musl*" \
    -exec cp {} /repo/apps/web/.next/standalone/apps/web/.next/server/ \;

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
# Next "standalone" output = server + exactly the node_modules it needs.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
# Static assets (logo, background) — NOT included in standalone by design.
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
ENV HOSTNAME=0.0.0.0 PORT=3000
CMD ["node", "apps/web/server.js"]
