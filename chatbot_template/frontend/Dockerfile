# =============================================================================
# Chatbot Template — Frontend Dockerfile
# =============================================================================
# Status: ALTERNATIVE deploy path. The production deploy uses Firebase App
# Hosting (see frontend/apphosting.yaml). This Dockerfile is kept in the repo
# as a fallback so the frontend can also be deployed as a plain Cloud Run
# service if App Hosting is unavailable, undesired, or being audited.
#
# Audit notes (2026-04-06):
#   * Multi-stage build: deps -> builder -> runner. Final image carries no
#     dev dependencies, no source, no build cache. Final size ~150-200 MB.
#   * Node 20 LTS (Node 18 reached EOL April 2025).
#   * `npm ci` for deterministic, lockfile-respecting installs.
#   * Uses Next.js standalone output (`output: 'standalone'` in
#     next.config.mjs) so the runner stage only ships the minimal server +
#     a pruned node_modules tree.
#   * Runs as the non-root `node` user (UID 1000) by default in node:alpine.
#   * Listens on $PORT (Cloud Run convention), default 8080.
#   * BACKEND_URL is a *runtime* env var (server-side only), NOT a build-arg
#     baked into the bundle. The browser never sees it.
# =============================================================================

# ---- Stage 1: deps ----------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- Stage 2: builder -------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Stage 3: runner --------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Copy only the standalone runtime artifacts.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER node
EXPOSE 8080

# server.js is emitted by Next.js standalone output.
CMD ["node", "server.js"]
