# install.sh
#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check for required commands
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is required but not installed.${NC}"
        exit 1
    fi
}

check_command docker
check_command docker-compose
check_command git
check_command openssl

# Generate random passwords and secrets
generate_password() {
    openssl rand -base64 24
}

echo -e "${GREEN}Setting up FlexiDB...${NC}"

# Clone the repository
echo -e "${YELLOW}Cloning the repository...${NC}"
git clone https://github.com/your-repo/flexidb.git
cd flexidb

# Generate environment variables
echo -e "${YELLOW}Generating environment variables...${NC}"
cat > .env << EOF
# Database Configuration
POSTGRES_USER=flexidb_user
POSTGRES_PASSWORD=$(generate_password)
POSTGRES_DB=flexidb
DATABASE_URL=postgresql://flexidb_user:${POSTGRES_PASSWORD}@db:5432/flexidb

# Next.js Configuration
PORT=3000
NEXTAUTH_SECRET=$(generate_password)
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Docker Configuration
DOCKER_SOCKET_PATH=/var/run/docker.sock
EOF

# Ensure proper permissions for Docker socket
echo -e "${YELLOW}Setting up Docker permissions...${NC}"
sudo chmod 666 /var/run/docker.sock

# Pull and build containers
echo -e "${YELLOW}Building and starting containers...${NC}"
docker-compose pull
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Create first admin user
echo -e "${YELLOW}Creating admin user...${NC}"
docker-compose exec app bun run create-admin

echo -e "${GREEN}Installation complete!${NC}"
echo -e "${GREEN}You can now access FlexiDB at http://localhost:3000${NC}"
echo -e "${YELLOW}Admin credentials have been saved to admin-credentials.txt${NC}"

# Save admin credentials
cat > admin-credentials.txt << EOF
FlexiDB Admin Credentials
------------------------
URL: http://localhost:3000
Email: admin@flexidb.local
Password: $(generate_password)
EOF

chmod 600 admin-credentials.txt

echo -e "${YELLOW}Please save the admin credentials from admin-credentials.txt${NC}"