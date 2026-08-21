# syntax=docker/dockerfile:1.8
FROM node:24-alpine AS build
WORKDIR /source
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY frontend ./
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
LABEL org.opencontainers.image.title="MyMovie Web" \
      org.opencontainers.image.description="MyMovie Angular single-page application"
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /source/dist/frontend/browser /usr/share/nginx/html
USER 101
EXPOSE 8080
STOPSIGNAL SIGQUIT
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:8080/ || exit 1
