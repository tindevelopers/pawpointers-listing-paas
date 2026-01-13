# ============================================================================
# Multi-stage Dockerfile for Cloud Run (pnpm / monorepo)
# ============================================================================

# Stage 1: Build with pnpm in monorepo context
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PNPM_STORE_PATH=/app/.pnpm-store
RUN npm install -g pnpm@10

# Copy workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Copy monorepo packages (needed for dependency graph) and configs
COPY packages ./packages
COPY config ./config
COPY tsconfig.json ./tsconfig.json

# Install all deps (dev + prod) using pnpm with frozen lockfile
RUN pnpm install --frozen-lockfile

# Build only the api-server package
RUN pnpm --filter @listing-platform/api-server run build

# Stage 2: Runtime image
FROM node:20-slim AS production

ENV NODE_ENV=production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 api

# Copy workspace manifests for prod install
COPY --from=builder --chown=api:nodejs /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder --chown=api:nodejs /app/packages /app/packages

# Install pnpm and production dependencies for api-server
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PNPM_STORE_PATH=/app/.pnpm-store
RUN npm install -g pnpm@10 && \
    pnpm config set node-linker hoisted && \
    pnpm install --filter @listing-platform/api-server --prod --frozen-lockfile

# Copy built artifacts
COPY --from=builder --chown=api:nodejs /app/packages/api-server/dist ./dist
COPY --from=builder --chown=api:nodejs /app/packages/api-server/package.json ./package.json

USER api

# Cloud Run uses PORT environment variable
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["node", "dist/index.js"]


