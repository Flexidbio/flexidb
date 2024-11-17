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
    echo -e "${RED}Missing or empty required variables in .env file:${NC}"
    printf '%s\n' "${missing_vars[@]}"
    echo -e "${YELLOW}Would you like to regenerate the .env file? [y/N]${NC}"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
      create_env_file
    else
      echo -e "${RED}Please set the missing variables manually and try again${NC}"
      exit 1
    fi
  fi
}

# Function to verify Docker and Docker Compose installation
verify_docker() {
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first${NC}"
    exit 1
  fi

  if ! docker info &> /dev/null; then
    echo -e "${RED}Docker daemon is not running or current user doesn't have permissions${NC}"
    exit 1
  fi

  if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first${NC}"
    exit 1
  fi
}

# Function to setup Traefik directories
setup_traefik() {
  echo -e "${YELLOW}Setting up Traefik directories...${NC}"
  sudo mkdir -p /etc/traefik/dynamic
  sudo mkdir -p /etc/traefik/acme
  sudo touch /etc/traefik/acme/acme.json
  sudo chmod 600 /etc/traefik/acme/acme.json
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

# Function to start services
start_services() {
  echo -e "${GREEN}Starting Docker containers...${NC}"
  docker-compose down -v
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
}

# Main execution
main() {
  echo -e "${YELLOW}Starting FlexiDB setup...${NC}"

  # Verify Docker installation
  verify_docker

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