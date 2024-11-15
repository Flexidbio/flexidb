#!/bin/bash
set -e

# Print logo
cat << "EOF"
______   **         **____     **  **     **     **___     ______    
/\  ___\ /\ \       /\  ___\   /\_\_\_\   /\ \   /\  __-.  /\  == \   
\ \  **\ \ \ \**__  \ \  __\   \/_/\_\/_  \ \ \  \ \ \/\ \ \ \  __<   
 \ \_\    \ \_____\  \ \_____\   /\_\/\_\  \ \_\  \ \____-  \ \_____\ 
  \/_/     \/_____/   \/_____/   \/_/\/_/   \/_/   \/____/   \/_____/ 
                                                                      
EOF
echo

# Basic logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Generate random string
generate_secure_string() {
    openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root/sudo"
   exit 1
fi

# Main installation
log "Starting FlexiDB installation..."

# Install basic requirements
log "Installing basic requirements..."
apt-get update
apt-get install -y curl wget git

# Install Docker using official method
log "Installing Docker..."
# Remove any old versions
apt-get remove -y docker docker.io containerd runc || true

# Install prerequisites
apt-get install -y ca-certificates gnupg

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update apt and install Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

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

# Stop any existing containers
log "Stopping existing services..."
docker compose down --remove-orphans 2>/dev/null || true

# Build and start services
log "Building and starting services..."
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker compose build --no-cache
docker compose up -d

# Wait for services
log "Waiting for services to start..."
sleep 30

# Show status
log "Current containers:"
docker ps

# Save credentials
echo "----------------------------------------"
echo "Installation completed!"
echo "Admin Credentials:"
echo "Email: $ADMIN_EMAIL"
echo "Password: $ADMIN_PASSWORD"
echo "Access FlexiDB at: http://localhost:3000"
echo "----------------------------------------"

# Save credentials to file
cat > flexidb_credentials.txt << EOF
Admin Credentials
Email: $ADMIN_EMAIL
Password: $ADMIN_PASSWORD
EOF
chmod 600 flexidb_credentials.txt