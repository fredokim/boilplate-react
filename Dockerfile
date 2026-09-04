# syntax=docker/dockerfile:1

# The built client, plus the reverse proxy that makes it one origin with the
# shared backend. See DEPLOYMENT.md for why that is a constraint rather than a
# preference.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# Server mode: the built app talks to the real backend through the proxy below.
# Mock mode would ship MSW and never make a request, which is a different
# artifact and not what is being deployed.
ENV VITE_DATA_MODE=server
RUN npm run build


FROM caddy:2-alpine AS runtime

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

EXPOSE 8080

# BACKEND_ORIGIN has no default on purpose. Without it Caddy fails to start,
# which is a loud failure at boot rather than a quiet one where /api returns
# the SPA's index.html with a 200 and the app fails later at DTO validation.
