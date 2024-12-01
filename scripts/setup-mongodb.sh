#!/bin/bash
set -e

# Setup directories
mkdir -p data/mongodb/{primary,secondary1,secondary2}
mkdir -p data/mongodb-keyfiles
mkdir -p data/mongodb-compose
mkdir -p templates

# Copy compose template
cp mongodb-compose.yml templates/

# Set permissions
chmod 700 data/mongodb/primary
chmod 700 data/mongodb/secondary1
chmod 700 data/mongodb/secondary2
chmod 700 data/mongodb-keyfiles

# Set ownership
chown -R 999:999 data/mongodb
chown -R 999:999 data/mongodb-keyfiles

echo "MongoDB directory structure setup complete"