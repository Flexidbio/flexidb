# Base Node.js image
FROM node:20-slim AS base
WORKDIR /app

# Install system dependencies and bun
RUN apt-get update && apt-get install -y \
    curl \
    openssl \
    build-essential \
    python3 \
    unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Update PATH to include bun
ENV PATH="/root/.bun/bin:${PATH}"

# Dependencies stage
FROM base AS deps
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN bunx prisma generate

# Build application
ENV NODE_ENV=production
RUN bun run build

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install production dependencies only
COPY package.json bun.lockb ./
RUN bun install --production

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create start script
RUN echo '#!/bin/bash\n\
echo "Waiting for database to be ready..."\n\
while ! bunx prisma db ping 2>/dev/null; do\n\
    echo "Database not ready, waiting..."\n\
    sleep 2\n\
done\n\
echo "Database is ready!"\n\
echo "Running database migrations..."\n\
bunx prisma migrate deploy\n\
echo "Starting application..."\n\
exec node server.js' > start.sh && chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]