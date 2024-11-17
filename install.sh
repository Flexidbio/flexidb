#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
  cat > .env << EOF
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
  echo -e "${YELLOW}NEXTAUTH_SECRET has been generated${NC}"
}

# Function to verify all required variables are set
verify_env_variables() {
  local required_vars=(
    "DATABASE_URL"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "NEXT_PUBLIC_APP_URL"
  )

  local missing_vars=()
  
  for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env || [ -z "$(grep "^${var}=" .env | cut -d'=' -f2)" ]; then
      missing_vars+=("$var")
    fi
  done

  if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${YELLOW}Missing required variables, regenerating .env file...${NC}"
    create_env_file
  fi
}

# Function to check if .env file exists and has required variables
check_env_file() {
  if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating one...${NC}"
    create_env_file
  else
    echo -e "${GREEN}Found existing .env file${NC}"
    verify_env_variables
  fi
}

# Function to verify Docker and Docker Compose installation
verify_docker() {
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
  fi

  if ! docker info &> /dev/null; then
    echo -e "${RED}Docker daemon is not running. Starting Docker...${NC}"
    sudo systemctl start docker
    sudo systemctl enable docker
  fi

  # Add current user to docker group if not already added
  if ! groups | grep -q docker; then
    sudo usermod -aG docker $USER
    echo -e "${YELLOW}Added current user to docker group. You may need to log out and back in.${NC}"
  fi
}

# Function to setup Traefik directories
setup_traefik() {
  echo -e "${YELLOW}Setting up Traefik directories...${NC}"
  mkdir -p /etc/traefik/dynamic
  mkdir -p /etc/traefik/acme
  touch /etc/traefik/acme/acme.json
  chmod 600 /etc/traefik/acme/acme.json
}

# Function to check container health
check_container_health() {
  echo -e "${YELLOW}Waiting for services to be ready...${NC}"
  timeout=60
  while [ $timeout -gt 0 ]; do
    if docker-compose ps | grep -q "unhealthy"; then
      echo -e "${YELLOW}Waiting for services to become healthy... ($timeout seconds remaining)${NC}"
      sleep 1
      ((timeout--))
    else
      echo -e "${GREEN}All services are healthy!${NC}"
      return 0
    fi
  done

  echo -e "${RED}Services failed to become healthy within timeout period${NC}"
  docker-compose logs
  return 1
}

# Function to clone repository
clone_repository() {
  if [ ! -d "flexidb" ]; then
    echo -e "${YELLOW}Cloning FlexiDB repository...${NC}"
    git clone https://github.com/Flexidbio/flexidb.git
    cd flexidb
  else
    echo -e "${YELLOW}Repository already exists. Updating...${NC}"
    cd flexidb
    git pull
  fi
}

# Function to start services
start_services() {
  echo -e "${GREEN}Starting Docker containers...${NC}"
  docker-compose down -v || true
  docker-compose up -d
}

# Function to display completion message
show_completion() {
  echo -e "\n${GREEN}✨ FlexiDB installation completed successfully!${NC}\n"
  echo -e "Access the application at: ${YELLOW}http://localhost:3000${NC}"
  echo -e "\nDatabase configuration:"
  echo -e "  Host: ${YELLOW}localhost${NC}"
  echo -e "  Port: ${YELLOW}5432${NC}"
  echo -e "  Database: ${YELLOW}flexidb${NC}"
  echo -e "  Username: ${YELLOW}postgres${NC}"
  echo -e "  Password: ${YELLOW}postgres${NC}\n"
  
  # Show the generated NEXTAUTH_SECRET
  echo -e "Your NEXTAUTH_SECRET is set in the .env file"
}

# Main execution
main() {
  echo -e "${YELLOW}Starting FlexiDB setup...${NC}"

  # Verify Docker installation
  verify_docker

  # Clone repository
  clone_repository

  # Check and setup environment variables
  check_env_file

  # Setup Traefik
  setup_traefik

  # Start the services
  start_services

  # Check container health
  check_container_health

  # Show completion message
  show_completion
}

# Run main function
main