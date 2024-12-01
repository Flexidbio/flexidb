#!/bin/bash
set -e

# Create mongodb keyfile directory with proper permissions
KEYFILE_DIR="./data/mongodb-keyfiles"
mkdir -p "$KEYFILE_DIR"
chmod 777 "$KEYFILE_DIR"

# Create data directory for MongoDB
DATA_DIR="./data/mongodb"
mkdir -p "$DATA_DIR"
chmod 777 "$DATA_DIR" 