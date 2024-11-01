FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache docker openssl

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

CMD ["npm", "start"] 