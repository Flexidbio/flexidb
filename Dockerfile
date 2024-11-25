FROM oven/bun:1 AS base
WORKDIR /app

# Install system dependencies including Python
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    make \
    g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Dependencies
FROM base AS deps
COPY package.json bun.lockb ./

# Create minimal .env for build
RUN echo "DATABASE_URL=postgresql://postgres:postgres@db:5432/flexidb" > .env

# Install dependencies without running postinstall
RUN bun install --no-postinstall

# Copy Prisma files and generate client
COPY prisma ./prisma/
RUN bunx prisma generate

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY . .
RUN bun run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

CMD ["bun", "run", "start"]