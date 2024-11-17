FROM oven/bun:1 AS base
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Dependencies without native modules
FROM base AS deps
COPY package.json bun.lockb ./
COPY prisma ./prisma
# Remove problematic native modules from dependencies

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
COPY --from=builder /app/package.json ./package.json

# Remove development dependencies for production
RUN bun install --production

EXPOSE 3000

CMD ["bun", "run", "start"]