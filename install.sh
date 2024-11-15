#!/bin/bash
set -e  # Exit on any error

# Colors for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Basic logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}$1${NC}"
}

error() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}ERROR: $1${NC}" >&2
}

warn() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}WARNING: $1${NC}"
}

# Check if script is run as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root/sudo"
   exit 1

# Generate random string
generate_secure_string() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32
}

# Check system requirements
check_system_requirements() {
    log "Checking system requirements..."
    
    # Check minimum memory
    total_memory=$(free -m | awk '/^Mem:/{print $2}')
    if [ $total_memory -lt 2048 ]; then
        error "Minimum 2GB of RAM required. Current: ${total_memory}MB"
        exit 1
    fi

    # Check disk space
    free_space=$(df -m / | awk 'NR==2 {print $4}')
    if [ $free_space -lt 5120 ]; then
        error "Minimum 5GB of free disk space required. Current: ${free_space}MB"
        exit 1
    }
}

# Install dependencies
install_dependencies() {
    log "Installing required packages..."
    apt-get update || {
        error "Failed to update package list"
        exit 1
    }

    # Required packages
    packages=(
        curl
        wget
        git
        docker.io
        docker-compose
        openssl
    )

    for package in "${packages[@]}"; do
        if ! dpkg -l | grep -q "^ii  $package "; then
            apt-get install -y "$package" || {
                error "Failed to install $package"
                exit 1
            }
        fi
    done
}

# Configure Docker
setup_docker() {
    log "Setting up Docker..."
    
    # Start Docker service
    systemctl start docker || {
        error "Failed to start Docker service"
        exit 1
    }
    
    # Enable Docker service
    systemctl enable docker || warn "Failed to enable Docker service"
    
    # Create docker network if it doesn't exist
    docker network inspect flexidb_network >/dev/null 2>&1 || \
    docker network create flexidb_network || warn "Failed to create Docker network"
}

# Main installation
main() {
    log "Starting FlexiDB installation..."

    # Check requirements
    check_system_requirements

    # Install dependencies
    install_dependencies

    # Setup Docker
    setup_docker

    # Clone repository
    log "Cloning FlexiDB repository..."
    if [ ! -d "flexidb" ]; then
        git clone https://github.com/Flexidbio/flexidb.git || {
            error "Failed to clone repository"
            exit 1
        }
        cd flexidb
    else
        cd flexidb
        git pull || warn "Failed to update repository"
    fi

    # Create environment file
    log "Setting up environment..."
    DB_PASSWORD=$(generate_secure_string)
    AUTH_SECRET=$(generate_secure_string)
    ADMIN_PASSWORD=$(generate_secure_string)
    ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@flexidb.local"}

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

    # Stop existing containers
    log "Stopping existing services..."
    docker-compose down --remove-orphans 2>/dev/null || true

    # Build containers
    log "Building containers..."
    export COMPOSE_DOCKER_CLI_BUILD=1
    export DOCKER_BUILDKIT=1
    docker-compose build --no-cache --progress=plain || {
        error "Failed to build containers"
        exit 1
    }

    # Start services
    log "Starting services..."
    docker-compose up -d || {
        error "Failed to start services"
        exit 1
    }

    # Wait for services and check health
    log "Waiting for services to start..."
    sleep 10
    
    # Check container status
    for container in flexidb_postgres flexidb_app flexidb_traefik; do
        if ! docker ps | grep -q $container; then
            warn "Container $container is not running"
        fi
    done

    # Show status
    log "Current containers:"
    docker ps
    
    # Show recent logs
    log "Recent logs:"
    docker-compose logs --tail=50

    # Success message
    echo "----------------------------------------"
    echo -e "${GREEN}Installation completed!${NC}"
    echo "Admin Credentials:"
    echo "Email: $ADMIN_EMAIL"
    echo "Password: $ADMIN_PASSWORD"
    echo "Access FlexiDB at: http://localhost:3000"
    echo -e "${YELLOW}Please save these credentials securely!${NC}"
    echo "----------------------------------------"

    # Save credentials to a file
    echo "Admin Credentials" > flexidb_credentials.txt
    echo "Email: $ADMIN_EMAIL" >> flexidb_credentials.txt
    echo "Password: $ADMIN_PASSWORD" >> flexidb_credentials.txt
    chmod 600 flexidb_credentials.txt
    
    log "Credentials saved to flexidb_credentials.txt"
}

# Cleanup on error
cleanup() {
    if [ $? -ne 0 ]; then
        error "Installation failed! Check the logs above for details."
        if [ -f "docker-compose.yml" ]; then
            warn "Cleaning up containers..."
            docker-compose down --remove-orphans 2>/dev/null || true
        fi
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Run main installation
main "$@"