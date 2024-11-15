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

# Install dependencies
RUN pnpm install 

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
ENV NODE_ENV=production
RUN pnpm build

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/scripts/startup.sh ./startup.sh

# Create directories for Traefik configuration
RUN mkdir -p /etc/traefik/dynamic && \
    chown -R node:node /etc/traefik && \
    chmod +x ./startup.sh

# Switch to non-root user
USER node

EXPOSE 3000

CMD ["./startup.sh"]