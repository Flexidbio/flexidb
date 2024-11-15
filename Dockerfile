# syntax=docker/dockerfile:1

# ---- Base ----
  FROM oven/bun:1.0.25 as base
  WORKDIR /app
  
  # Install required system dependencies including build tools
  RUN apt-get update && apt-get install -y \
      curl \
      openssl \
      build-essential \
      python3 \
      gcc \
      g++ \
      make \
      && apt-get clean \
      && rm -rf /var/lib/apt/lists/*
  
  # Ensure cc is available
  RUN ln -s /usr/bin/gcc /usr/local/bin/cc
  
  # ---- Dependencies ----
  FROM base AS deps
  # Copy package files
  COPY package.json bun.lockb ./
  # Install dependencies
  RUN --mount=type=cache,target=/root/.bun \
      bun install
  
  # ---- Builder ----
  FROM base AS builder
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  
  # Generate Prisma Client
  RUN bunx prisma generate
  
  # Build application
  ENV NODE_ENV=production
  RUN bun run build
  
  # ---- Runner ----
  FROM base AS runner
  WORKDIR /app
  
  ENV NODE_ENV=production
  ENV NEXT_TELEMETRY_DISABLED=1
  
  # Create non-root user
  RUN addgroup --system --gid 1001 nodejs && \
      adduser --system --uid 1001 nextjs && \
      chown -R nextjs:nodejs /app
  
  # Copy necessary files
  COPY --from=builder --chown=nextjs:nodejs /app/public ./public 
  COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static 
  COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
  COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
  
  # Set user
  USER nextjs
  
  # Expose port
  EXPOSE 3000
  
  # Create start script
  RUN echo '#!/bin/bash\n\
  echo "Waiting for database..."\n\
  while ! bunx prisma db ping 2>/dev/null; do\n\
    sleep 2\n\
  done\n\
  echo "Running migrations..."\n\
  bunx prisma migrate deploy\n\
  echo "Starting application..."\n\
  exec bun run server.js' > start.sh && chmod +x start.sh
  
  # Start command
  CMD ["./start.sh"]