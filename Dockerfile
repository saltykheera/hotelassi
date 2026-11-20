# ==========================================
# Stage 1: Build the TypeScript application
# ==========================================
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ==========================================
# Stage 2: Minimal Production Runtime
# (Debian/glibc for @temporalio/core-bridge)
# ==========================================
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
