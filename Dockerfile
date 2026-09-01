# syntax=docker/dockerfile:1

# One image serving both halves of the application.
#
# Not two: the refresh token is an HttpOnly cookie with `sameSite: 'lax'`, so a
# client on a different origin from the API never sends it and every session
# ends when its access token expires. The two WebSocket gateways have the same
# requirement. Shipping them together is what makes the browser see one origin.


# --- the client -------------------------------------------------------------
FROM node:22-alpine AS client
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# The build refuses to produce a mock-mode production bundle, so this is not a
# convenience default — it is the only value that builds.
ENV VITE_DATA_MODE=server
RUN npm run build


# --- the server -------------------------------------------------------------
FROM node:22-alpine AS server
WORKDIR /app

# Dependencies before source, so a source-only change does not invalidate the
# install layer. --ignore-scripts skips the postinstall `prisma generate`, run
# below once the schema is definitely present.
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
RUN npm ci --ignore-scripts

COPY server .
RUN npx prisma generate
RUN npm run build


# --- runtime ----------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Production dependencies only. The build toolchain, the test runner, and the
# Prisma CLI stay behind in the build stages.
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# dist carries the compiled server and, via the nest-cli assets entry, the
# generated Prisma client and its native query engine.
COPY --from=server /app/dist ./dist
# Migrations travel with the image so `prisma migrate deploy` can run as a
# separate deployment step against the same version being released.
COPY --from=server /app/prisma ./prisma
COPY --from=client /app/dist ./client

# Read by the server at boot. Absent, it serves the API alone — which is the
# right default for a dev session but would be a broken deploy here.
ENV CLIENT_DIR=client

# The node image ships a non-root `node` user. Running as root would mean a
# container escape starts with root, for no benefit.
USER node

EXPOSE 3001

# Liveness only — readiness depends on the database, and a container that is
# healthy but not ready is exactly the state a rolling deploy needs to see.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# No migration on startup. See server/DEPLOYMENT.md: a container that migrates
# as it boots turns a rolling deploy into several concurrent migrations.
CMD ["node", "dist/main.js"]
