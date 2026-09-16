FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_BASE_PATH=
ARG NEXT_PUBLIC_APP_ORIGIN=https://genora.art
ARG NEXT_PUBLIC_STAGING=
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_PUBLIC_APP_ORIGIN=$NEXT_PUBLIC_APP_ORIGIN \
    NEXT_PUBLIC_STAGING=$NEXT_PUBLIC_STAGING \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3310 \
    HOSTNAME=0.0.0.0
RUN apk add --no-cache ffmpeg tini vips-tools
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=dependencies --chown=node:node /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=dependencies --chown=node:node /app/node_modules/qrcode ./node_modules/qrcode
COPY --from=dependencies --chown=node:node /app/node_modules/undici ./node_modules/undici
COPY --from=dependencies --chown=node:node /app/node_modules/sharp ./node_modules/sharp
COPY --from=dependencies --chown=node:node /app/node_modules/@img ./node_modules/@img
COPY --from=dependencies --chown=node:node /app/node_modules/detect-libc ./node_modules/detect-libc
COPY --from=dependencies --chown=node:node /app/node_modules/semver ./node_modules/semver
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/db ./db
COPY --from=builder --chown=node:node /app/content ./content
COPY --from=builder --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder --chown=node:node /app/scripts/backfill-media-previews.mjs ./scripts/backfill-media-previews.mjs
COPY --from=builder --chown=node:node /app/scripts/start.mjs ./scripts/start.mjs
COPY --from=builder --chown=node:node /app/scripts/seed-production-admin.mjs ./scripts/seed-production-admin.mjs
COPY --from=builder --chown=node:node /app/scripts/seed-genora-dev.mjs ./scripts/seed-genora-dev.mjs
COPY --from=builder --chown=node:node /app/scripts/support-worker.mjs ./scripts/support-worker.mjs
COPY --from=builder --chown=node:node /app/scripts/save-search-credentials.mjs ./scripts/save-search-credentials.mjs
USER node
EXPOSE 3310
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "scripts/start.mjs"]
