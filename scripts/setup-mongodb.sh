#!/bin/bash
set -e

# Create mongodb keyfile directory with proper permissions
KEYFILE_DIR="./data/mongodb-keyfiles"
mkdir -p "$KEYFILE_DIR"
chmod 700 "$KEYFILE_DIR"

# Create data directory for MongoDB
DATA_DIR="./data/mongodb"
mkdir -p "$DATA_DIR"
chmod 700 "$DATA_DIR"

# Set ownership if running as root
if [ "$(id -u)" = "0" ]; then
  chown -R 999:999 "$KEYFILE_DIR"
  chown -R 999:999 "$DATA_DIR"
fi 