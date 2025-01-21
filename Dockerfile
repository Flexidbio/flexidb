FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install only essential build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    py3-pip \
    libc6-compat  # Required for native modules

# Install dependencies and generate Prisma client
COPY package.json bun.lockb ./
COPY prisma ./prisma/

# Explicitly install node-gyp globally
RUN bun install -g node-gyp

RUN bun install \
    && bunx prisma generate \
    && rm -rf /root/.bun-cache

# Build the application
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN bun run build

# Production stage
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create non-root user and required groups
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nextjs && \
    addgroup -S -g 998 docker && \
    adduser nextjs docker && \
    mkdir -p .next/cache/{fetch-cache,images,fetch} && \
    chown -R nextjs:nodejs .next

# Copy only necessary files
COPY --from=base --chown=nextjs:nodejs /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/.next ./.next
COPY --from=base --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=base --chown=nextjs:nodejs /app/bun.lockb ./bun.lockb
COPY --from=base --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

CMD ["bun", "run", "start"]