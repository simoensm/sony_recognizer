# Ingest service image (build from the REPO ROOT):
#   docker build -f apps/ingest/Dockerfile -t sr-ingest .

FROM node:22-alpine
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/ingest/package.json apps/ingest/
COPY packages/db/package.json packages/db/
COPY packages/queue/package.json packages/queue/
COPY packages/config/package.json packages/config/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile --filter @sr/ingest...

COPY packages ./packages
COPY apps/ingest ./apps/ingest
RUN pnpm --filter @sr/db db:generate

WORKDIR /repo/apps/ingest
# Control channel + passive data ports (see docker-compose.prod.yml).
EXPOSE 2121 30000-30009
CMD ["node_modules/.bin/tsx", "src/index.ts"]
