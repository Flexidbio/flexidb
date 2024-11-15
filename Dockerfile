# Base Debian slim image
FROM debian:bookworm-slim AS base
WORKDIR /app

# Install system dependencies and Bun
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    build-essential \
    python3 \
    unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Add Bun to PATH
ENV PATH="/root/.bun/bin:${PATH}"

# Dependencies stage
FROM base AS deps
COPY package.json ./
COPY prisma ./prisma
RUN bun install

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# Generate Prisma Client and build application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN bun run build

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
RUN bun install --production

# Create directories for Traefik configuration
RUN mkdir -p /etc/traefik/dynamic

# Create non-root user
RUN useradd -m app
RUN chown -R app:app /app /etc/traefik

# Switch to non-root user
USER app

EXPOSE 3000

# Start Next.js with Bun
CMD ["bun", "run", "start"]