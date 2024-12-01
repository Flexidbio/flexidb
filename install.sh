#!/bin/bash
set -e

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (use sudo)"
  exit 1
fi

# Get the actual user who ran sudo
ACTUAL_USER=${SUDO_USER:-$USER}
ACTUAL_HOME=$(eval echo ~${ACTUAL_USER})

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Working directory
INSTALL_DIR="${ACTUAL_HOME}/flexidb"

# Universal cloud provider IP detection
get_public_ip() {
    local ip=""
    
    # Try AWS metadata (using IMDSv2)
    if curl -s --connect-timeout 1 "http://169.254.169.254/latest/api/token" -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" >/dev/null 2>&1; then
        local token=$(curl -s "http://169.254.169.254/latest/api/token" -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
        ip=$(curl -s -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/public-ipv4)
    fi

    # Try Azure IMDS if AWS failed
    if [ -z "$ip" ]; then
        ip=$(curl -s -H Metadata:true --noproxy "*" "http://169.254.169.254/metadata/instance/network/interface/0/ipAddress/ipAddress?api-version=2021-02-01")
    fi

    # Try Google Cloud metadata if Azure failed
    if [ -z "$ip" ]; then
        ip=$(curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip")
    fi

    # If all cloud providers failed, try external IP services
    if [ -z "$ip" ] || [[ ! $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        for ip_service in "https://api.ipify.org" "https://ifconfig.me" "https://icanhazip.com"; do
            ip=$(curl -s --max-time 5 "$ip_service")
            if [[ $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                break
            fi
        done
    fi

    # Final validation
    if [[ $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
    else
        echo -e "${RED}Failed to detect public IP address${NC}"
        exit 1
    fi
}

# Enhanced environment file creation
create_env_file() {
    echo -e "${YELLOW}Creating new .env file...${NC}"

    # Generate secure values
    local db_password=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    local auth_secret=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    local server_ip=$(get_public_ip)

    # Ensure the installation directory exists
    mkdir -p "${INSTALL_DIR}"

    # Create .env file with proper permissions
    sudo -u "$ACTUAL_USER" touch "${INSTALL_DIR}/.env"
    chmod 600 "${INSTALL_DIR}/.env"

    # Write environment variables
    cat > "${INSTALL_DIR}/.env" << EOL
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${db_password}
POSTGRES_DB=flexidb
DATABASE_URL=postgresql://postgres:${db_password}@db:5432/flexidb?schema=public

# Server Configuration
SERVER_IP=${server_ip}
NEXT_PUBLIC_SERVER_IP=${server_ip}

# Auth Configuration
NEXTAUTH_SECRET=${auth_secret}
NEXTAUTH_URL=http://${server_ip}:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://${server_ip}:3000

# Docker Configuration
COMPOSE_PROJECT_NAME=flexidb
DOMAIN=${server_ip}

# Traefik Configuration
ACME_EMAIL=admin@flexidb.local
TRAEFIK_CONFIG_DIR=/etc/traefik
EOL

    # Set proper ownership
    chown "$ACTUAL_USER:$ACTUAL_USER" "${INSTALL_DIR}/.env"
    
    echo -e "${GREEN}Created new .env file at ${INSTALL_DIR}/.env${NC}"
}

# Universal Docker setup
setup_docker() {
    echo -e "${YELLOW}Setting up Docker...${NC}"
    
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Installing Docker...${NC}"
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    fi

    # Setup Docker group
    if ! getent group docker > /dev/null; then
        groupadd docker
    fi

    # Add user to docker group
    usermod -aG docker "$ACTUAL_USER"
    
    # Configure Docker daemon
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << EOL
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "iptables": true,
  "default-address-pools": [
    {
      "base": "172.17.0.0/16",
      "size": 24
    }
  ]
}
EOL

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Set proper permissions
    chmod 666 /var/run/docker.sock
    
    echo -e "${GREEN}Docker setup complete${NC}"
}

# Setup Traefik
setup_traefik() {
    echo -e "${YELLOW}Setting up Traefik...${NC}"
    
    # Create required directories
    mkdir -p /etc/traefik/dynamic
    mkdir -p /etc/traefik/acme
    
    # Create and set permissions for acme.json
    touch /etc/traefik/acme/acme.json
    chmod 600 /etc/traefik/acme/acme.json
    
    # Create basic Traefik configuration
    cat > /etc/traefik/traefik.yml << EOL
api:
  dashboard: true
  insecure: true

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    watch: true
  file:
    directory: "/etc/traefik/dynamic"
    watch: true

entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: "admin@flexidb.local"
      storage: "/etc/traefik/acme/acme.json"
      httpChallenge:
        entryPoint: web
EOL

    echo -e "${GREEN}Traefik setup complete${NC}"
}

# Setup repository
setup_repository() {
    echo -e "${YELLOW}Setting up FlexiDB repository...${NC}"
    
    # Remove existing directory if present
    if [ -d "$INSTALL_DIR" ]; then
        rm -rf "$INSTALL_DIR"
    fi
    
    # Clone repository as the actual user
    sudo -u "$ACTUAL_USER" git clone https://github.com/Flexidbio/flexidb.git "$INSTALL_DIR"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to clone repository${NC}"
        exit 1
    fi
    
    # Set proper permissions
    chown -R "$ACTUAL_USER:$ACTUAL_USER" "$INSTALL_DIR"
    
    echo -e "${GREEN}Repository setup complete${NC}"
}

# Main installation process
main() {
    echo -e "${YELLOW}Starting FlexiDB installation...${NC}"
    
    # Perform setup steps
    setup_docker
    setup_repository
    setup_traefik
    create_env_file
    
    # Change to install directory
    cd "$INSTALL_DIR"
    
    # Pull Docker images
    echo -e "${YELLOW}Pulling Docker images...${NC}"
    sudo -u "$ACTUAL_USER" docker compose pull
    
    # Start services
    echo -e "${YELLOW}Starting services...${NC}"
    sudo -u "$ACTUAL_USER" docker compose up -d
    
    # Wait for services and verify
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    sleep 30
    
    if docker compose ps | grep -q "Up"; then
        echo -e "${GREEN}Services are running${NC}"
    else
        echo -e "${RED}Some services failed to start. Please check 'docker compose ps' and logs${NC}"
    fi
    
    # Show installation completion and next steps
    echo -e "\n${GREEN}✨ FlexiDB installation completed!${NC}"
    echo -e "Access your server at http://$(get_public_ip):3000"
    echo -e "\nImportant next steps:"
    echo -e "1. Configure your DNS if using a custom domain"
    echo -e "2. Update the admin email in Traefik configuration"
    echo -e "3. Set up SSL certificates if needed"
    echo -e "\nFor more information, visit: https://github.com/Flexidbio/flexidb"
}

# Run main installation
main