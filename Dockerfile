# Base Node.js image
FROM node:20-slim AS base
WORKDIR /app

# Install system dependencies and pnpm
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    build-essential \
    python3 \
    && npm install -g pnpm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Dependencies stage
FROM base AS deps
COPY package.json ./
COPY prisma ./prisma
RUN pnpm install

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# Generate Prisma Client and build application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm run build

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Install production dependencies
RUN pnpm install

# Create directories for Traefik configuration
RUN mkdir -p /etc/traefik/dynamic && \
    chown -R node:node /etc/traefik

# Switch to non-root user
USER node

EXPOSE 3000

# Start Next.js
CMD ["pnpm", "start"]