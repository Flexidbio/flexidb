#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Working directory
INSTALL_DIR="/root/flexidb"

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

# Function to create .env file with required variables
create_env_file() {
  echo -e "${YELLOW}Creating new .env file...${NC}"
  cat > "${INSTALL_DIR}/.env" << EOF
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flexidb

# Auth Configuration
NEXTAUTH_SECRET=$(generate_password)
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Docker Configuration
COMPOSE_PROJECT_NAME=flexidb
EOF

  echo -e "${GREEN}Created new .env file with secure configuration${NC}"
}

# Function to verify Docker installation
verify_docker() {
  echo -e "${YELLOW}Checking Docker installation...${NC}"
  if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
  fi

  if ! docker info &> /dev/null; then
    echo -e "${YELLOW}Starting Docker service...${NC}"
    systemctl start docker
    systemctl enable docker
  fi
  
  echo -e "${GREEN}Docker is ready${NC}"
}

# Function to setup Traefik directories
setup_traefik() {
  echo -e "${YELLOW}Setting up Traefik directories...${NC}"
  mkdir -p /etc/traefik/dynamic
  mkdir -p /etc/traefik/acme
  touch /etc/traefik/acme/acme.json
  chmod 600 /etc/traefik/acme/acme.json
  echo -e "${GREEN}Traefik directories setup complete${NC}"
}

# Function to clone or update repository
setup_repository() {
  echo -e "${YELLOW}Setting up FlexiDB repository...${NC}"
  if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Updating existing repository...${NC}"
    cd "$INSTALL_DIR"
    git pull origin main
  else
    echo -e "${YELLOW}Cloning repository...${NC}"
    git clone https://github.com/Flexidbio/flexidb.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  fi
  echo -e "${GREEN}Repository setup complete${NC}"
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
  
  # Setup Traefik
  setup_traefik
  
  # Start services
  start_services
  
  # Wait for services to be ready
  wait_for_services
  
  # Show completion message
  echo -e "\n${GREEN}✨ FlexiDB installation completed!${NC}"
  echo -e "\nAccess the application at: ${YELLOW}http://localhost:3000${NC}"
  echo -e "\nDatabase configuration:"
  echo -e "  Host: ${YELLOW}localhost${NC}"
  echo -e "  Port: ${YELLOW}5432${NC}"
  echo -e "  Database: ${YELLOW}flexidb${NC}"
  echo -e "  Username: ${YELLOW}postgres${NC}"
  echo -e "  Password: ${YELLOW}postgres${NC}\n"
}

# Run main installation
main