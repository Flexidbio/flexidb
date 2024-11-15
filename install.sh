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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root/sudo"
   exit 1
fi

# Main installation
log "Starting FlexiDB installation..."

# Install Docker using convenience script
log "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

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
DB_PASSWORD=$(openssl rand -base64 24)
AUTH_SECRET=$(openssl rand -base64 24)
ADMIN_PASSWORD=$(openssl rand -base64 24)
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

# Initial Admin Account
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF

# Setup Traefik directory
log "Setting up Traefik..."
mkdir -p /etc/traefik/dynamic
mkdir -p /etc/traefik/acme
touch /etc/traefik/acme/acme.json
chmod 600 /etc/traefik/acme/acme.json

# Start services
log "Starting services..."
docker compose up -d --build

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