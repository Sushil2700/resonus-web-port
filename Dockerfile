FROM node:24-bookworm-slim AS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends patch && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY app/package.json app/package-lock.json ./
COPY app/scripts ./scripts
COPY app/patches ./patches
RUN npm ci --no-audit --no-fund

FROM dependencies AS source
COPY app/ ./

FROM source AS test
RUN npm run typecheck && npm test

FROM source AS build
RUN npm run build:web

FROM nginx:1.28-alpine AS runtime
LABEL org.opencontainers.image.title="Resonus Web" \
      org.opencontainers.image.description="Community web port of Resonus" \
      org.opencontainers.image.licenses="GPL-3.0-or-later"
ENV NGINX_ENVSUBST_FILTER="^MUSIC_SERVER_URL$"
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 deploy/19-check-config.sh /docker-entrypoint.d/19-check-config.sh
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
