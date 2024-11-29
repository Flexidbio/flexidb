FROM oven/bun:1 AS base
WORKDIR /app

# Install only the essential system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    make \
    g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN bunx prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

RUN bun run build

# Production image, copy all files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user and setup cache directories
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    addgroup --system --gid 998 docker && \
    adduser nextjs docker && \
    mkdir -p .next/cache/fetch-cache && \
    mkdir -p .next/cache/images && \
    mkdir -p .next/cache/fetch && \
    chown -R nextjs:nodejs .next

# Copy built files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/bun.lockb ./bun.lockb
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
# Create directories for logs and backups
RUN mkdir -p /app/backups /app/logs && \
    chown -R nextjs:nodejs /app/backups /app/logs
# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["bun", "run", "start"]