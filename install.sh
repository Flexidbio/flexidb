#!/bin/bash

# Exit on any error
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log file setup
LOG_FILE="/tmp/flexidb_install.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# Function to log messages
log() {
    local level=$1
    shift
    local message=$*
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

# Function to check system requirements
check_system_requirements() {
    log "INFO" "Checking system requirements..."
    
    # Check CPU cores
    local cpu_cores=$(nproc)
    if [ "$cpu_cores" -lt 2 ]; then
        log "WARNING" "Minimum 2 CPU cores recommended. Found: ${cpu_cores}"
    fi
    
    # Check available memory
    local total_mem=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$total_mem" -lt 2048 ]; then
        log "WARNING" "Minimum 2GB RAM recommended. Found: ${total_mem}MB"
    fi
    
    # Check available disk space
    local free_space=$(df -m / | awk 'NR==2 {print $4}')
    if [ "$free_space" -lt 5120 ]; then
        log "WARNING" "Minimum 5GB free space recommended. Found: ${free_space}MB"
    fi
}

# Function to detect package manager
detect_package_manager() {
    if command -v apt-get >/dev/null; then
        echo "apt"
    elif command -v dnf >/dev/null; then
        echo "dnf"
    elif command -v yum >/dev/null; then
        echo "yum"
    elif command -v pacman >/dev/null; then
        echo "pacman"
    else
        log "ERROR" "No supported package manager found"
        exit 1
    fi
}

# Function to install packages based on the detected package manager
install_packages() {
    local pkg_manager=$(detect_package_manager)
    log "INFO" "Installing packages using ${pkg_manager}..."
    
    case $pkg_manager in
        apt)
            sudo apt-get update
            sudo apt-get install -y "$@"
            ;;
        dnf)
            sudo dnf install -y "$@"
            ;;
        yum)
            sudo yum install -y "$@"
            ;;
        pacman)
            sudo pacman -Sy --noconfirm "$@"
            ;;
    esac
}

# Function to setup Docker with error handling
setup_docker() {
    if ! command -v docker >/dev/null; then
        log "INFO" "Installing Docker..."
        
        # Install Docker using the official convenience script
        curl -fsSL https://get.docker.com -o get-docker.sh
        if ! sudo sh get-docker.sh; then
            log "ERROR" "Docker installation failed"
            exit 1
        fi
        
        # Start and enable Docker service
        sudo systemctl enable docker
        sudo systemctl start docker
        
        # Add current user to docker group
        sudo usermod -aG docker "$USER"
        
        rm get-docker.sh
        log "INFO" "Docker installed successfully"
        
        # Verify Docker installation
        if ! docker --version; then
            log "ERROR" "Docker installation verification failed"
            exit 1
        fi
    else
        log "INFO" "Docker is already installed"
    fi
}

# Function to setup Docker Compose
setup_docker_compose() {
    if ! command -v docker-compose >/dev/null; then
        log "INFO" "Installing Docker Compose..."
        
        COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d '"' -f 4)
        sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        if ! docker-compose --version; then
            log "ERROR" "Docker Compose installation verification failed"
            exit 1
        fi
        
        log "INFO" "Docker Compose installed successfully"
    else
        log "INFO" "Docker Compose is already installed"
    fi
}

# Function to generate secure random string for environment variables
generate_secure_string() {
    head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32
}

# Function to create and configure environment file
setup_environment() {
    log "INFO" "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        log "INFO" "Creating new .env file..."
        # Generate secure passwords
        DB_PASSWORD=$(generate_secure_string)
        AUTH_SECRET=$(generate_secure_string)
        ADMIN_PASSWORD=$(generate_secure_string)
        
        # Set default admin email if running non-interactively
        if [ -t 0 ]; then
            # Running interactively
            read -p "Enter admin email (for SSL certificates): " ADMIN_EMAIL
        else
            # Running non-interactively
            ADMIN_EMAIL="admin@flexidb.local"
            log "INFO" "Using default admin email: $ADMIN_EMAIL"
            log "INFO" "You can change this later in the admin panel"
        fi
        
        log "INFO" "Writing environment configuration..."
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
        log "INFO" "Environment file created successfully"
        log "INFO" "Admin credentials - SAVE THESE:"
        log "INFO" "Admin Email: $ADMIN_EMAIL"
        log "INFO" "Admin Password: $ADMIN_PASSWORD"
    else
        log "INFO" "Environment file already exists"
    fi
    
    # Verify .env file was created
    if [ ! -f ".env" ]; then
        log "ERROR" "Failed to create .env file"
        exit 1
    fi
    
    log "INFO" "Environment setup completed"

}

setup_traefik_directories() {
    log "INFO" "Setting up Traefik directory structure..."
    
    # Create required directories
    sudo mkdir -p /etc/traefik/dynamic
    sudo mkdir -p /etc/traefik/acme
    
    # Set permissions
    sudo chown -R $USER:$USER /etc/traefik
    sudo chmod 755 /etc/traefik
    
    # Create and secure acme.json
    sudo touch /etc/traefik/acme/acme.json
    sudo chmod 600 /etc/traefik/acme/acme.json
    
    log "INFO" "Traefik directories configured successfully"
}

start_services() {
    log "INFO" "Building and starting services..."
    
    # Verify docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        log "ERROR" "docker-compose.yml not found"
        exit 1
    fi
    
    # Stop any existing containers
    log "INFO" "Stopping any existing containers..."
    docker-compose down 2>/dev/null || true
    
    # Pull latest images
    log "INFO" "Pulling latest images..."
    if ! docker-compose pull; then
        log "ERROR" "Failed to pull Docker images"
        exit 1
    fi
    
    # Build services
    log "INFO" "Building services..."
    if ! docker-compose build --no-cache; then
        log "ERROR" "Failed to build services"
        exit 1
    fi
    
    # Start services
    log "INFO" "Starting services..."
    if ! docker-compose up -d; then
        log "ERROR" "Failed to start services"
        exit 1
    fi
    
    log "INFO" "Services started successfully"
}

main() {
     log "INFO" "Starting FlexiDB installation..."
    
    # Installation steps...
    check_system_requirements
    install_packages curl wget git netcat
    setup_docker
    setup_docker_compose
    setup_traefik_directories

    # Clone or update repository
    if [ ! -d "flexidb" ]; then
        log "INFO" "Cloning FlexiDB repository..."
        git clone https://github.com/Flexidbio/flexidb.git
        cd flexidb
    else
        log "INFO" "Updating existing FlexiDB installation..."
        cd flexidb
        git pull
    fi
    
    # Setup environment and start services
    setup_environment
    
    log "INFO" "Building and starting services..."
    docker-compose down 2>/dev/null || true
    docker-compose pull
    docker-compose build --no-cache
    docker-compose up -d
    
    # Wait for services to start
    log "INFO" "Waiting for services to be ready..."
    sleep 30
    
    # Display service status
    log "INFO" "Current service status:"
    docker ps
    
    # Show important information
    log "SUCCESS" "FlexiDB installation completed!"
    log "INFO" "You can access FlexiDB at: http://localhost:3000"
    log "INFO" "Check the .env file for admin credentials"
    
    # Show admin credentials again
    if [ -f ".env" ]; then
        ADMIN_EMAIL=$(grep ADMIN_EMAIL .env | tail -n1 | cut -d'=' -f2)
        ADMIN_PASSWORD=$(grep ADMIN_PASSWORD .env | cut -d'=' -f2)
        log "INFO" "Admin credentials:"
        log "INFO" "Email: $ADMIN_EMAIL"
        log "INFO" "Password: $ADMIN_PASSWORD"
    fi
}


# Run main installation
main "$@"