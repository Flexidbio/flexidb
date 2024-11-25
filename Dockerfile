FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN bunx prisma generate

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY . .

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build the application
RUN bun run build

# Production image, copy all files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["bun", "run", "./server.js"]