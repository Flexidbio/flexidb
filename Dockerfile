FROM oven/bun:1.0.7-alpine AS base
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy dependency files first for better caching
COPY package.json bun.lockb ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN bun install \
    && bunx prisma generate \
    && rm -rf /root/.bun-cache

# Copy application source
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1.0.7-alpine AS runner
WORKDIR /app

ENV NODE_ENV='production' \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create non-root user and required directories
RUN addgroup -g 1001 nodejs \
    && adduser -u 1001 -G nodejs -D nextjs \
    && mkdir -p .next/cache \
    && chown -R nextjs:nodejs .next

# Copy built assets and dependencies
COPY --from=base --chown=nextjs:nodejs /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/.next ./.next
COPY --from=base --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=base --chown=nextjs:nodejs /app/bun.lockb ./bun.lockb
COPY --from=base --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

CMD ["bun", "run", "start"]