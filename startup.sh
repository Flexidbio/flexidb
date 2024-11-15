#!/bin/bash
set -e

# Wait for database to be ready
echo "Waiting for database to be ready..."
max_retries=30
counter=0
until npx prisma db ping; do
  counter=$((counter + 1))
  if [ $counter -eq $max_retries ]; then
    echo "Failed to connect to database after $max_retries attempts."
    exit 1
  fi
  echo "Database connection attempt $counter of $max_retries..."
  sleep 2
done

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting the application..."
exec node server.js