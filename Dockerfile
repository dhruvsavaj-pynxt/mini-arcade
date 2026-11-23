# syntax=docker/dockerfile:1

# 1) Build the static site from source and verify it.
FROM node:20-alpine AS build
WORKDIR /app
ARG SITE_URL=""
ENV SITE_URL=${SITE_URL}
COPY package.json ./
COPY scripts ./scripts
COPY js ./js
COPY styles.css ./
RUN node scripts/build.js \
 && node scripts/check-links.js --strict

# 2) Serve the generated files with nginx.
FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/index.html /app/styles.css /app/sitemap.xml /app/robots.txt /usr/share/nginx/html/
COPY --from=build /app/games /usr/share/nginx/html/games
COPY --from=build /app/js /usr/share/nginx/html/js

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
