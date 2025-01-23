#!/bin/bash
set -e

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$DIR")"

# Pull latest changes
git pull origin main

# Install dependencies
bun install

# Build the application
bun run build

# Restart the Docker containers
docker compose down
docker compose up -d

# Update version file
git describe --tags --abbrev=0 > version.txt

echo "Update completed successfully" 