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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    DOCKER_INSTALL_SCRIPT_SHA256="711a0d41213afabc30b963f82c56e1442a3efe1c"
    sh get-docker.sh --dry-run
    if [ $? -eq 0 ]; then
        sh get-docker.sh
    else
        log "Docker installation script verification failed"
        exit 1
    fi
    rm get-docker.sh
else
    log "Docker is already installed, skipping installation..."
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    log "Installing Docker Compose..."
    mkdir -p ~/.docker/cli-plugins/
    curl -SL https://github.com/docker/compose/releases/download/v2.23.3/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
    chmod +x ~/.docker/cli-plugins/docker-compose
else
    log "Docker Compose is already installed, skipping installation..."
fi

# Rest of your installation script...
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

cat > .env << EOF
# Database Configuration
POSTGRES_USER=flexidb_admin
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=flexidb

# Application Configuration
NEXTAUTH_SECRET=$AUTH_SECRET
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000


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



echo "----------------------------------------"
echo "Installation completed!"
echo "Access FlexiDB at: http://localhost:3000"
echo "----------------------------------------"