FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache docker openssl

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm install -g bun

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build the application
RUN bun run build

# Expose the port the app runs on
EXPOSE 3000

CMD ["bun", "start"] 