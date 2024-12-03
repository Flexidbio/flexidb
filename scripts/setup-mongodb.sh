#!/bin/bash
set -e

# MongoDB configuration
MONGODB_BASE_DIR="/var/lib/flexidb"
MONGODB_DATA_DIR="${MONGODB_BASE_DIR}/mongodb"
MONGODB_KEYFILE_DIR="${MONGODB_BASE_DIR}/mongodb-keyfiles"
MONGODB_USER="mongodb"
MONGODB_GROUP="mongodb"
MONGODB_UID=999
MONGODB_GID=999

echo "Setting up MongoDB directories and permissions..."

# Create mongodb user and group if they don't exist
if ! getent group $MONGODB_GROUP >/dev/null; then
    groupadd -r -g $MONGODB_GID $MONGODB_GROUP
fi

if ! getent passwd $MONGODB_USER >/dev/null; then
    useradd -r -u $MONGODB_UID -g $MONGODB_GROUP -d $MONGODB_DATA_DIR -s /sbin/nologin $MONGODB_USER
fi

# Create base directory
mkdir -p $MONGODB_BASE_DIR

# Create and set up data directory
mkdir -p $MONGODB_DATA_DIR
chmod 700 $MONGODB_DATA_DIR
chown -R $MONGODB_UID:$MONGODB_GID $MONGODB_DATA_DIR

# Create and set up keyfile directory
mkdir -p $MONGODB_KEYFILE_DIR
chmod 700 $MONGODB_KEYFILE_DIR
chown -R $MONGODB_UID:$MONGODB_GID $MONGODB_KEYFILE_DIR

# Create directory for replica set instances
mkdir -p "${MONGODB_DATA_DIR}/rs0"
chmod 700 "${MONGODB_DATA_DIR}/rs0"
chown -R $MONGODB_UID:$MONGODB_GID "${MONGODB_DATA_DIR}/rs0"

# Export paths
cat > /etc/profile.d/mongodb-flexidb.sh << EOF
export MONGODB_BASE_DIR="$MONGODB_BASE_DIR"
export MONGODB_DATA_DIR="$MONGODB_DATA_DIR"
export MONGODB_KEYFILE_DIR="$MONGODB_KEYFILE_DIR"
EOF

# Add to current session
export MONGODB_BASE_DIR="$MONGODB_BASE_DIR"
export MONGODB_DATA_DIR="$MONGODB_DATA_DIR"
export MONGODB_KEYFILE_DIR="$MONGODB_KEYFILE_DIR"

echo "MongoDB directories set up successfully:"
echo "Base directory: $MONGODB_BASE_DIR"
echo "Data directory: $MONGODB_DATA_DIR"
echo "Keyfile directory: $MONGODB_KEYFILE_DIR"
echo "Owner: $MONGODB_USER:$MONGODB_GROUP ($MONGODB_UID:$MONGODB_GID)"
echo "Permissions: 700 (drwx------)"