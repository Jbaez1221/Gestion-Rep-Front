# syntax=docker/dockerfile:1
#
# Front de Repuestos: compila con Node y sirve con nginx sin root (puerto 8080).
# Compatible con podman y docker.

FROM docker.io/library/node:24-alpine AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

COPY angular.json tsconfig.json tsconfig.app.json .postcssrc.json ngsw-config.json ./
COPY public public
COPY src src
RUN pnpm exec ng build --configuration production

FROM docker.io/nginxinc/nginx-unprivileged:1.30.6-alpine
COPY nginx/cabeceras-seguridad.conf /etc/nginx/snippets/cabeceras-seguridad.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/repuestos-front/browser /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
