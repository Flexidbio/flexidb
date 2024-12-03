#!/bin/bash
set -e

# System-level MongoDB configuration
MONGODB_BASE_DIR="/var/lib/flexidb"
MONGODB_DATA_DIR="${MONGODB_BASE_DIR}/mongodb"
MONGODB_KEYFILE_DIR="${MONGODB_BASE_DIR}/mongodb-keyfiles"
MONGODB_USER="mongodb"
MONGODB_GROUP="mongodb"
MONGODB_UID=999
MONGODB_GID=999

echo "Setting up MongoDB directories..."

# Create system directories
sudo mkdir -p "$MONGODB_DATA_DIR"
sudo mkdir -p "$MONGODB_KEYFILE_DIR"

# Create mongodb group if it doesn't exist
if ! getent group $MONGODB_GROUP >/dev/null; then
    sudo groupadd -r -g $MONGODB_GID $MONGODB_GROUP
fi

# Create mongodb user if it doesn't exist
if ! getent passwd $MONGODB_USER >/dev/null; then
    sudo useradd -r -u $MONGODB_UID -g $MONGODB_GROUP -d $MONGODB_DATA_DIR -s /sbin/nologin $MONGODB_USER
fi

# Set proper permissions
sudo chmod 700 "$MONGODB_DATA_DIR"
sudo chmod 700 "$MONGODB_KEYFILE_DIR"
sudo chown -R $MONGODB_UID:$MONGODB_GID "$MONGODB_DATA_DIR"
sudo chown -R $MONGODB_UID:$MONGODB_GID "$MONGODB_KEYFILE_DIR"

echo "MongoDB directories set up at system level"