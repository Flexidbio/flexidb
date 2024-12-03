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
  # Add to your .env file creation
  NEXT_PUBLIC_SERVER_IP=${SERVER_IP}
  # Generate a secure secret for NextAuth
  NEXTAUTH_SECRET=$(openssl rand -base64 32)

  cat > "${INSTALL_DIR}/.env" << EOF
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=flexidb
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/flexidb

# Server Configuration
SERVER_IP=${SERVER_IP}
NEXT_PUBLIC_SERVER_IP=${SERVER_IP}

# Auth Configuration
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=https://${SERVER_IP}:3000
NEXTAUTH_URL_INTERNAL=http://localhost:3000
NEXT_PUBLIC_APP_URL=https://${SERVER_IP}:3000

# Docker Configuration
COMPOSE_PROJECT_NAME=flexidb
DOMAIN=${DOMAIN:-$SERVER_IP}

# Traefik Configuration
ACME_EMAIL=${ADMIN_EMAIL}
TRAEFIK_CONFIG_DIR=/etc/traefik
MONGO_KEYFILE_DIR=${PWD}/data/mongodb-keyfiles
MONGO_DATA_DIR=${PWD}/data/mongodb

EOF
  chown "$ACTUAL_USER:$ACTUAL_USER" "${INSTALL_DIR}/.env"
    
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
# Function to clone or update repository
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
# Function to start services
start_services() {
  echo -e "${YELLOW}Starting services...${NC}"
  cd "$INSTALL_DIR"

  # Stash any local changes
  echo -e "${YELLOW}Handling local changes...${NC}"
  git config --global --add safe.directory "$INSTALL_DIR"
  
  # Check if there are any changes
  if git status --porcelain | grep -q '^'; then
    echo -e "${YELLOW}Stashing local changes...${NC}"
    git stash push --include-untracked
  fi

  # Checkout the branch
  echo -e "${YELLOW}Checking out feature branch...${NC}"
  git fetch origin
  git checkout feature/mongo-replica-set || {
    echo -e "${RED}Failed to checkout branch. Creating new tracking branch...${NC}"
    git checkout -b feature/mongo-replica-set origin/feature/mongo-replica-set
  }

  # Pop the stashed changes if any were stashed
  if git stash list | grep -q 'stash@{0}'; then
    echo -e "${YELLOW}Reapplying local changes...${NC}"
    git stash pop
  fi 

  

  echo -e "${YELLOW}Starting Docker services...${NC}"
  docker compose down -v 2>/dev/null || true
  docker compose up -d
  echo -e "${GREEN}Services started${NC}"
}

setup_mongodb() {
    echo -e "${YELLOW}Setting up MongoDB directories...${NC}"
    
    # Execute the MongoDB setup script from the cloned repository
    chmod +x "${INSTALL_DIR}/scripts/setup-mongodb.sh"
    "${INSTALL_DIR}/scripts/setup-mongodb.sh"
    
    # Add MongoDB environment variables to .env file
    cat >> "${INSTALL_DIR}/.env" << EOF

# MongoDB Configuration
MONGODB_BASE_DIR=/var/lib/flexidb
MONGODB_DATA_DIR=/var/lib/flexidb/mongodb
MONGODB_KEYFILE_DIR=/var/lib/flexidb/mongodb-keyfiles
EOF
    
    echo -e "${GREEN}MongoDB setup complete${NC}"
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
  setup_mongodb
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