#!/bin/bash
set -e

# Create directories
KEYFILE_DIR="./data/mongodb-keyfiles"
DATA_DIR="./data/mongodb"

mkdir -p "$KEYFILE_DIR"
mkdir -p "$DATA_DIR"

# Generate keyfile if it doesn't exist
if [ ! -f "$KEYFILE_DIR/mongodb-keyfile" ]; then
  openssl rand -base64 741 > "$KEYFILE_DIR/mongodb-keyfile"
fi

# Set permissions
chmod 400 "$KEYFILE_DIR/mongodb-keyfile"
chmod 700 "$KEYFILE_DIR"
chmod 700 "$DATA_DIR"

# Set ownership to mongodb user (UID 999)
chown -R 999:999 "$KEYFILE_DIR"
chown -R 999:999 "$DATA_DIR"