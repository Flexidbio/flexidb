# ---------- Base Builder (Debian, fast, stable) ----------
FROM oven/bun:1 AS base
WORKDIR /app

# Fix node-pty by forcing Bun to emulate Node 20 instead of Node 24
ENV BUN_DELEGATE_NODE=20

# Install build tools for Prisma / node-gyp packages
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy package manager files first (better caching)
COPY package.json bun.lockb ./
COPY prisma ./prisma/

# Install dependencies (skip running native install scripts that break)
RUN bun install --ignore-scripts \
    && bunx prisma generate \
    && rm -rf /root/.bun-cache

# Copy the full source after deps are installed
COPY . .

# Disable Next.js telemetry + set prod env
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Build the Next.js / Bun app
RUN bun run build

# ---------- Production Runner (NOT ALPINE — glibc required!) ----------
FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create user and folders used by Next.js
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g 1001 -m nextjs && \
    mkdir -p .next/cache/{fetch-cache,images,fetch}


# Copy artifacts from the builder stage
COPY --from=base --chown=nextjs:nodejs /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/.next ./.next
COPY --from=base --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=base --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=base --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nextjs:nodejs /app/bun.lockb ./bun.lockb

USER nextjs
EXPOSE 3000

CMD ["bun", "run", "start"]
