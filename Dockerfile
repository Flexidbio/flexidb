FROM oven/bun:1 AS base
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Dependencies
FROM base AS deps
COPY package.json bun.lockb ./
COPY prisma ./prisma
RUN bun install

# Build
FROM base AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN bunx prisma generate
RUN bun run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1


COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

CMD ["bun", "run", "start"]