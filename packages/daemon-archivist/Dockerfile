# ==========================================
# Stage 1: Build & Compile
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /app

# Copy root configurations and workspace manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages

# Install dependencies for workspace resolution
RUN npm ci

# Build required dependencies and daemon-archivist
RUN npm run build --workspace=@aetheris/core-crypto \
 && npm run build --workspace=@aetheris/vault-engine \
 && npm run build --workspace=@aetheris/daemon-archivist

# ==========================================
# Stage 2: Production Runner
# ==========================================
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy manifests, dependencies, and built packages
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/core-crypto ./packages/core-crypto
COPY --from=builder /app/packages/vault-engine ./packages/vault-engine
COPY --from=builder /app/packages/daemon-archivist ./packages/daemon-archivist

CMD ["node", "packages/daemon-archivist/dist/index.js"]
