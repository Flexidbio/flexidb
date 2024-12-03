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

# Create mongodb group if it doesn't exist, handle existing group gracefully
if ! getent group $MONGODB_GROUP >/dev/null; then
    echo "Creating mongodb group..."
    groupadd -r -g $MONGODB_GID $MONGODB_GROUP || {
        echo "Group with GID $MONGODB_GID exists, using existing GID"
        groupadd -r $MONGODB_GROUP
    }
fi

# Get actual GID of mongodb group (in case it was different)
ACTUAL_GID=$(getent group $MONGODB_GROUP | cut -d: -f3)

# Create mongodb user if it doesn't exist, handle existing user gracefully
if ! getent passwd $MONGODB_USER >/dev/null; then
    echo "Creating mongodb user..."
    useradd -r -g $MONGODB_GROUP -d $MONGODB_DATA_DIR -s /sbin/nologin $MONGODB_USER || {
        echo "User with UID $MONGODB_UID exists, using system-assigned UID"
        useradd -r -g $MONGODB_GROUP -d $MONGODB_DATA_DIR -s /sbin/nologin $MONGODB_USER
    }
fi

# Get actual UID of mongodb user (in case it was different)
ACTUAL_UID=$(id -u $MONGODB_USER)

echo "Using mongodb user with UID:GID = $ACTUAL_UID:$ACTUAL_GID"

# Create base directory
mkdir -p $MONGODB_BASE_DIR

# Create and set up data directory
mkdir -p $MONGODB_DATA_DIR
chmod 700 $MONGODB_DATA_DIR
chown -R $MONGODB_USER:$MONGODB_GROUP $MONGODB_DATA_DIR

# Create and set up keyfile directory
mkdir -p $MONGODB_KEYFILE_DIR
chmod 700 $MONGODB_KEYFILE_DIR
chown -R $MONGODB_USER:$MONGODB_GROUP $MONGODB_KEYFILE_DIR

# Create directory for replica set instances
mkdir -p "${MONGODB_DATA_DIR}/rs0"
chmod 700 "${MONGODB_DATA_DIR}/rs0"
chown -R $MONGODB_USER:$MONGODB_GROUP "${MONGODB_DATA_DIR}/rs0"

# Export paths and user/group info
cat > /etc/profile.d/mongodb-flexidb.sh << EOF
export MONGODB_BASE_DIR="$MONGODB_BASE_DIR"
export MONGODB_DATA_DIR="$MONGODB_DATA_DIR"
export MONGODB_KEYFILE_DIR="$MONGODB_KEYFILE_DIR"
export MONGODB_UID=$ACTUAL_UID
export MONGODB_GID=$ACTUAL_GID
EOF

# Add to current session
export MONGODB_BASE_DIR="$MONGODB_BASE_DIR"
export MONGODB_DATA_DIR="$MONGODB_DATA_DIR"
export MONGODB_KEYFILE_DIR="$MONGODB_KEYFILE_DIR"
export MONGODB_UID=$ACTUAL_UID
export MONGODB_GID=$ACTUAL_GID

echo "MongoDB directories set up successfully:"
echo "Base directory: $MONGODB_BASE_DIR"
echo "Data directory: $MONGODB_DATA_DIR"
echo "Keyfile directory: $MONGODB_KEYFILE_DIR"
echo "Owner: $MONGODB_USER:$MONGODB_GROUP ($ACTUAL_UID:$ACTUAL_GID)"
echo "Permissions: 700 (drwx------)"