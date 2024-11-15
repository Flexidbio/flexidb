# syntax=docker/dockerfile:1

# ---- Base ----
  FROM oven/bun:1.0.25 as base
  WORKDIR /app
  
  # Install required system dependencies
  RUN apt-get update && apt-get install -y \
      curl \
      openssl \
      && rm -rf /var/lib/apt/lists/*
  
  # ---- Dependencies ----
  FROM base AS deps
  # Copy package files
  COPY package.json bun.lockb ./
  # Install dependencies (removed --frozen-lockfile flag)
  RUN bun install
  
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
  RUN addgroup --system --gid 1001 nodejs
  RUN adduser --system --uid 1001 nextjs
  RUN chown -R nextjs:nodejs /app
  
  # Copy necessary files
  COPY --from=builder --chown=nextjs:nodejs /app/public ./public
  COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
  COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
  COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
  COPY --from=builder --chown=nextjs:nodejs /app/startup.sh ./
  
  # Make startup script executable
  RUN chmod +x /app/startup.sh
  
  # Set user
  USER nextjs
  
  # Expose port
  EXPOSE 3000
  
  # Health check
  HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1
  
  # Start the application with migrations
  CMD ["/app/startup.sh"]