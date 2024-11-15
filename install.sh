#!/bin/bash

# Basic color setup
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Simple logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Generate random string
generate_secure_string() {
    tr -dc A-Za-z0-9 </dev/urandom | head -c 32
}

# Main installation
log "Starting FlexiDB installation..."

# Install required packages
log "Installing required packages..."
apt-get update
apt-get install -y curl wget git docker.io docker-compose

# Clone repository
log "Cloning FlexiDB repository..."
if [ ! -d "flexidb" ]; then
    git clone https://github.com/Flexidbio/flexidb.git
    cd flexidb
else
    cd flexidb
    git pull
fi

# Create environment file
log "Setting up environment..."
DB_PASSWORD=$(generate_secure_string)
AUTH_SECRET=$(generate_secure_string)
ADMIN_PASSWORD=$(generate_secure_string)
ADMIN_EMAIL="admin@flexidb.local"

cat > .env << EOF
# Database Configuration
POSTGRES_USER=flexidb_admin
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=flexidb

# Application Configuration
NEXTAUTH_SECRET=$AUTH_SECRET
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Traefik Configuration
ADMIN_EMAIL=$ADMIN_EMAIL
TRAEFIK_CONFIG_DIR=/etc/traefik

# Initial Admin Account
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF

# Setup Traefik directories
log "Setting up Traefik..."
mkdir -p /etc/traefik/dynamic
mkdir -p /etc/traefik/acme
touch /etc/traefik/acme/acme.json
chmod 600 /etc/traefik/acme/acme.json

# Start services
log "Starting services..."
docker-compose down 2>/dev/null || true
docker-compose pull
docker-compose build --no-cache
docker-compose up -d

# Wait for services
log "Waiting for services to start..."
sleep 30

# Show status
log "Current containers:"
docker ps

# Show credentials
echo -e "${GREEN}Installation completed!${NC}"
echo -e "${YELLOW}Admin Credentials:${NC}"
echo "Email: $ADMIN_EMAIL"
echo "Password: $ADMIN_PASSWORD"
echo -e "${YELLOW}Access FlexiDB at: http://localhost:3000${NC}"