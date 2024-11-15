#!/bin/bash

echo "Waiting for database to be ready..."
while ! bunx prisma db ping 2>/dev/null; do
    echo "Database not ready, waiting..."
    sleep 2
done

echo "Database is ready!"
echo "Running database migrations..."
bunx prisma migrate deploy

echo "Ensuring Traefik config directory permissions..."
chmod -R 755 /etc/traefik/dynamic

echo "Starting application..."
exec bun start