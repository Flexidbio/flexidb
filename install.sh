#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Working directory - use current user's home directory
INSTALL_DIR="$HOME/flexidb"

# Print logo
cat << "EOF"
______   **         **____     **  **     **     **___     ______    
/\  ___\ /\ \       /\  ___\   /\_\_\_\   /\ \   /\  __-.  /\  == \   
\ \  **\ \ \ \**__  \ \  __\   \/_/\_\/_  \ \ \  \ \ \/\ \ \ \  __<   
 \ \_\    \ \_____\  \ \_____\   /\_\/\_\  \ \_\  \ \____-  \ \_____\ 
  \/_/     \/_____/   \/_____/   \/_/\/_/   \/_/   \/____/   \/_____/ 
                                                                      
EOF
echo

# Function to generate a random secure password
generate_password() {
  openssl rand -base64 24 | tr -d '/+=' | cut -c1-32
}

# Function to get server IP
get_server_ip() {
  SERVER_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '^127\.' | head -n 1)
  if [ -z "$SERVER_IP" ]; then
    SERVER_IP=$(hostname -I | awk '{print $1}')
  fi
  echo "$SERVER_IP"
}

# Function to create .env file with required variables
create_env_file() {
  echo -e "${YELLOW}Creating new .env file...${NC}"
  
  # Generate passwords and get server IP
  DB_PASSWORD=$(generate_password)
  AUTH_SECRET=$(generate_password)
  SERVER_IP=$(get_server_ip)
  
  # Ensure directory exists
  mkdir -p "${INSTALL_DIR}"
  
  # Create .env file with proper permissions
  touch "${INSTALL_DIR}/.env"
  chmod 600 "${INSTALL_DIR}/.env"
  
  cat > "${INSTALL_DIR}/.env" << EOF
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=flexidb
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/flexidb

# Auth Configuration
NEXTAUTH_SECRET=${AUTH_SECRET}
NEXTAUTH_URL=http://${SERVER_IP}:3000
NEXT_PUBLIC_APP_URL=http://${SERVER_IP}:3000

# Docker Configuration
COMPOSE_PROJECT_NAME=flexidb
DOMAIN=${SERVER_IP}

# Traefik Configuration
ACME_EMAIL=admin@${SERVER_IP}
TRAEFIK_CONFIG_DIR=/etc/traefik
EOF

  echo -e "${GREEN}Created new .env file at ${INSTALL_DIR}/.env${NC}"
  # Debug output
  ls -la "${INSTALL_DIR}/.env"
}

# Function to verify Docker installation
verify_docker() {
  echo -e "${YELLOW}Checking Docker installation...${NC}"
  if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
    sudo curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
  fi

  if ! docker info &> /dev/null; then
    echo -e "${YELLOW}Starting Docker service...${NC}"
    sudo systemctl start docker
    sudo systemctl enable docker
    # Add current user to docker group
    sudo usermod -aG docker $USER
  fi
  
  echo -e "${GREEN}Docker is ready${NC}"
}

# Function to setup Traefik directories
setup_traefik() {
  echo -e "${YELLOW}Setting up Traefik directories...${NC}"
  
  # Create directories with sudo
  sudo mkdir -p /etc/traefik/dynamic
  sudo mkdir -p /etc/traefik/acme
  
  # Create and set permissions for ACME storage
  sudo touch /etc/traefik/acme/acme.json
  sudo chmod 600 /etc/traefik/acme/acme.json
  
  # Copy Traefik configuration
  sudo cp "${INSTALL_DIR}/docker/traefik.yml" /etc/traefik/traefik.yml
  
  echo -e "${GREEN}Traefik directories setup complete${NC}"
}

# Function to clone or update repository
setup_repository() {
  echo -e "${YELLOW}Setting up FlexiDB repository...${NC}"
  
  # Check if directory exists
  if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Removing existing directory...${NC}"
    rm -rf "$INSTALL_DIR"
  fi
  
  # Clone repository
  echo -e "${YELLOW}Cloning repository...${NC}"
  git clone https://github.com/Flexidbio/flexidb.git "$INSTALL_DIR"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Repository cloned successfully${NC}"
    cd "$INSTALL_DIR"
  else
    echo -e "${RED}Failed to clone repository${NC}"
    exit 1
  fi
}

# Function to start services
start_services() {
  echo -e "${YELLOW}Starting services...${NC}"
  cd "$INSTALL_DIR"
  docker compose down -v 2>/dev/null || true
  docker compose up -d
  echo -e "${GREEN}Services started${NC}"
}

# Function to wait for services
wait_for_services() {
  echo -e "${YELLOW}Waiting for services to be ready...${NC}"
  local timeout=60
  while [ $timeout -gt 0 ]; do
    if docker compose ps | grep -q "unhealthy"; then
      echo -e "${YELLOW}Waiting for services... ($timeout seconds remaining)${NC}"
      sleep 1
      ((timeout--))
    else
      echo -e "${GREEN}All services are healthy!${NC}"
      return 0
    fi
  done
  
  echo -e "${RED}Services failed to become healthy within timeout${NC}"
  docker compose logs
  return 1
}

# Main installation function
main() {
  echo -e "${YELLOW}Starting FlexiDB installation...${NC}"
  
  # Verify Docker installation
  verify_docker
  
  # Setup repository
  setup_repository
  
  # Create new .env file
  create_env_file
  
  # Debug: Check if .env was created
  if [ -f "${INSTALL_DIR}/.env" ]; then
    echo -e "${GREEN}.env file exists${NC}"
  else
    echo -e "${RED}.env file was not created!${NC}"
    exit 1
  fi
  
  # Setup Traefik
  setup_traefik
  
  # Start services
  start_services
  
  # Wait for services to be ready
  wait_for_services
  
  echo -e "\n${GREEN}✨ FlexiDB installation completed!${NC}"
}

# Run main installation
main