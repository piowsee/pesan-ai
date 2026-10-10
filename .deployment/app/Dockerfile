# Docs: https://nextjs.org/docs/app/building-your-application/deploying#docker-image

# ============================================
# Stage 1: Dependencies Installation Stage
# ============================================

# IMPORTANT: Node.js Version Maintenance
# This Dockerfile uses Node.js 24.13.0-slim, which was the latest LTS version at the time of writing.
# To ensure security and compatibility, regularly update the NODE_VERSION ARG to the latest LTS version.
ARG NODE_VERSION=24.13.0-slim

FROM node:${NODE_VERSION} AS dependencies

# Set working directory
WORKDIR /app

# Copy workspace manifests first to leverage Docker's caching mechanism.
# web/package.json is required so pnpm can resolve the `pesan-ai` package; docs/ is
# intentionally omitted here (it deploys via GitHub Pages, not this image).
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc* ./
COPY web/package.json ./web/package.json

# Install project dependencies with frozen lockfile for reproducible builds.
# The pnpm path is scoped to --filter pesan-ai so resolution succeeds without docs/.
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/usr/local/share/.cache/yarn \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
  if [ -f package-lock.json ]; then \
    npm ci --no-audit --no-fund; \
  elif [ -f yarn.lock ]; then \
    corepack enable yarn && yarn install --frozen-lockfile --production=false; \
  elif [ -f pnpm-lock.yaml ]; then \
    corepack enable pnpm && pnpm install --frozen-lockfile --filter pesan-ai; \
  else \
    echo "No lockfile found." && exit 1; \
  fi

# ============================================
# Stage 2: Build Next.js application in standalone mode
# ============================================

FROM node:${NODE_VERSION} AS builder

# Set working directory
WORKDIR /app

# openssl needed for prisma
RUN apt-get update && apt-get install -y openssl

# Copy installed dependencies from the dependencies stage. In a pnpm workspace the deps
# live in two places: the virtual store at the root (node_modules/.pnpm) and the
# per-package symlink tree (web/node_modules), so both are copied to build the app.
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/web/node_modules ./web/node_modules

# Copy application source code (.dockerignore keeps node_modules/.next out of the
# context, so the dependencies copied above are preserved).
COPY . .

ENV NODE_ENV=production
# DOCKER_BUILD switches next.config.ts to standalone output + outputFileTracingRoot
ENV DOCKER_BUILD=true

# --- NEXT_PUBLIC build args ---
# These MUST be present in THIS (builder) stage, because NEXT_PUBLIC_* vars are
# inlined into the client bundle during `next build` below. Setting them only in
# the runner stage has no effect: the bundle is already frozen by then.
ARG NEXT_PUBLIC_META_APP_ID
ARG NEXT_PUBLIC_FACEBOOK_CONFIG_ID
ENV NEXT_PUBLIC_META_APP_ID=$NEXT_PUBLIC_META_APP_ID
ENV NEXT_PUBLIC_FACEBOOK_CONFIG_ID=$NEXT_PUBLIC_FACEBOOK_CONFIG_ID
# -------------------------------

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Build the web app (its build script runs `prisma generate && next build`).
RUN if [ -f package-lock.json ]; then \
    npm run build; \
  elif [ -f yarn.lock ]; then \
    corepack enable yarn && yarn build; \
  elif [ -f pnpm-lock.yaml ]; then \
    corepack enable pnpm && pnpm --filter pesan-ai build; \
  else \
    echo "No lockfile found." && exit 1; \
  fi

# ============================================
# Stage 3: Run Next.js application
# ============================================

FROM node:${NODE_VERSION} AS runner

# Set working directory
WORKDIR /app

# openssl needed for prisma
RUN apt-get update -y && apt-get install -y openssl

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Copy production assets. The app lives under web/ in the workspace, but the standalone
# output is flattened back onto the app root (/app) so the container runs from ./ not ./web.
COPY --from=builder --chown=node:node /app/web/public ./web/public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown node:node .next

# Automatically leverage output traces to reduce image size.
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=node:node /app/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/web/.next/static ./web/.next/static
COPY --from=builder --chown=node:node /app/web/.next/cache ./web/.next/cache

# Switch to non-root user for security best practices
USER node

# Expose port 3000 to allow HTTP traffic
EXPOSE 3000

# Start Next.js standalone server
CMD ["node", "./web/server.js"]
