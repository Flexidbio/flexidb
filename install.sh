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

# Working directory - use actual user's home directory
INSTALL_DIR="${ACTUAL_HOME}/flexidb"

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

# Function to get public IP address
get_public_ip() {
  # Try multiple IP detection services
  SERVER_IP=$(curl -s https://api.ipify.org || \
              curl -s https://ifconfig.me || \
              curl -s https://icanhazip.com)

  if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}Failed to detect public IP address${NC}"
    exit 1
  fi

  echo "$SERVER_IP"
}

# Function to generate a random email
generate_email() {
  local random_string=$(openssl rand -hex 8)
  echo "admin-${random_string}@flexib.site"
}

# Function to create .env file with required variables
create_env_file() {
  echo -e "${YELLOW}Creating new .env file...${NC}"

  # Generate passwords and get server IP
  DB_PASSWORD=$(generate_password)
  AUTH_SECRET=$(generate_password)
  SERVER_IP=$(get_public_ip)
  ADMIN_EMAIL=$(generate_email)
  ACME_EMAIL="admin@flexib.site"
  # Ensure directory exists
  mkdir -p "${INSTALL_DIR}"

  # Create .env file with proper permissions
  touch "${INSTALL_DIR}/.env"
  chmod 600 "${INSTALL_DIR}/.env"

  # Generate a secure secret for NextAuth
  NEXTAUTH_SECRET=$(openssl rand -base64 32)

  cat > "${INSTALL_DIR}/.env" << EOF
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=flexidb
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/flexidb

# Auth Configuration
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=http://${SERVER_IP}:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://${SERVER_IP}:3000

# Docker Configuration
COMPOSE_PROJECT_NAME=flexidb
DOMAIN=${DOMAIN:-$SERVER_IP}

# Traefik Configuration
ACME_EMAIL=${ADMIN_EMAIL}
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
    sudo usermod -aG docker ${ACTUAL_USER}
  fi

  echo -e "${GREEN}Docker is ready${NC}"
}

# Function to setup Traefik directories and permissions
setup_traefik() {
  echo -e "${YELLOW}Setting up Traefik configuration...${NC}"
  
  # Create required directories
  sudo mkdir -p /etc/traefik/dynamic
  sudo mkdir -p /etc/traefik/acme
  
  # Create files
  sudo touch /etc/traefik/acme/acme.json
  sudo touch /etc/traefik/dynamic/website.yml
  
  # Set permissions for acme.json
  sudo chmod 600 /etc/traefik/acme/acme.json
  sudo chown root:root /etc/traefik/acme/acme.json
  
  # Set permissions for dynamic config
  sudo chmod -R 755 /etc/traefik/dynamic
  sudo chown -R 1000:1000 /etc/traefik/dynamic
  
  echo -e "${GREEN}Traefik configuration setup complete${NC}"
}

# Function to clone or update repository
setup_repository() {
  echo -e "${YELLOW}Setting up FlexiDB repository...${NC}"

  # Check if directory exists
  if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Removing existing directory...${NC}"
    rm -rf "$INSTALL_DIR"
  fi

  # Clone repository as the actual user
  echo -e "${YELLOW}Cloning repository...${NC}"
  sudo -u ${ACTUAL_USER} git clone https://github.com/Flexidbio/flexidb.git "$INSTALL_DIR"

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Repository cloned successfully${NC}"
    # Removed 'exit 1' to allow script to continue
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

# Function to setup database schema
setup_database() {
  echo -e "${YELLOW}Setting up database schema...${NC}"
  cd "$INSTALL_DIR"

  # Wait for database to be ready
  echo -e "${YELLOW}Waiting for database to be ready...${NC}"
  timeout=30
  while [ $timeout -gt 0 ]; do
    if docker compose exec -T db pg_isready -h localhost -U postgres > /dev/null 2>&1; then
      echo -e "${GREEN}Database is ready!${NC}"
      break
    fi
    echo -e "${YELLOW}Waiting for database... ($timeout seconds remaining)${NC}"
    sleep 1
    ((timeout--))
  done

  if [ $timeout -eq 0 ]; then
    echo -e "${RED}Database failed to become ready within timeout${NC}"
    exit 1
  fi

  # Run Prisma migrations with -T flag
  echo -e "${YELLOW}Running database migrations...${NC}"
  docker compose exec -T app bunx prisma migrate deploy

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database schema setup complete${NC}"
  else
    echo -e "${RED}Failed to setup database schema${NC}"
    exit 1
  fi
}

# Function to setup Docker permissions
setup_docker_permissions() {
  echo -e "${YELLOW}Setting up Docker permissions...${NC}"

  # Ensure docker group exists with correct GID
  if ! getent group docker > /dev/null; then
    sudo groupadd -g 998 docker
  fi

  # Set permissions on Docker socket
  sudo chmod 666 /var/run/docker.sock

  echo -e "${GREEN}Docker permissions configured${NC}"
}

# Function to setup permissions
setup_permissions() {
  echo -e "${YELLOW}Setting up permissions...${NC}"

  # Set full permissions for Docker socket
  sudo chmod 777 /var/run/docker.sock

  # Set full permissions for app directory
  sudo chmod -R 755 ${INSTALL_DIR}

  echo -e "${GREEN}Permissions setup complete${NC}"
}

# Function to setup environment variables
setup_environment() {
  # Get the server's public IP
  SERVER_IP=$(curl -s https://api.ipify.org || curl -s https://ifconfig.me || curl -s https://icanhazip.com)
  if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}Failed to detect public IP address${NC}"
    exit 1
  fi

  # Export for immediate use
  export SERVER_IP

  echo -e "${GREEN}Environment configured with SERVER_IP: ${SERVER_IP}${NC}"
}

# Function to verify environment configuration
verify_environment() {
  echo -e "${YELLOW}Verifying environment configuration...${NC}"

  if [ -z "$SERVER_IP" ]; then
    echo -e "${RED}SERVER_IP is not set${NC}"
    exit 1
  fi

  echo -e "${GREEN}SERVER_IP is set to: ${SERVER_IP}${NC}"

  if [ ! -f "${INSTALL_DIR}/.env" ]; then
    echo -e "${RED}.env file not found at ${INSTALL_DIR}/.env${NC}"
    exit 1
  fi

  echo -e "${GREEN}Environment configuration verified${NC}"
}

# Main installation function
main() {
  # 1. Initial setup
  setup_environment

  # 2. Docker setup
  verify_docker
  setup_docker_permissions

  # 3. Repository and environment setup
  setup_repository
  create_env_file
  verify_environment  # Moved after create_env_file

  # 4. Export environment variables
  set -a
  source "${INSTALL_DIR}/.env"
  set +a

  # 5. Traefik setup
  setup_traefik

  # 6. Permissions
  setup_permissions

  # 7. Services
  start_services
  wait_for_services

  # 8. Database setup
  setup_database

  # 9. Final output
  SERVER_IP=$(get_public_ip)
  echo -e "\n${GREEN}✨ FlexiDB installation completed!${NC} Access your server at http://${SERVER_IP}:3000"
}

# Run main installation
main