#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting FlexiDB setup...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Docker daemon is not running${NC}"
    exit 1
fi

# Create Traefik directories
echo -e "${YELLOW}Setting up Traefik directories...${NC}"
sudo mkdir -p /etc/traefik/dynamic
sudo mkdir -p /etc/traefik/acme
sudo touch /etc/traefik/acme/acme.json
sudo chmod 600 /etc/traefik/acme/acme.json

# Generate a secure random string for NEXTAUTH_SECRET
generate_secret() {
    # Generate a 32-character random string using OpenSSL
    openssl rand -base64 32 | tr -d '/+=' | cut -c1-32
}

# Create or update .env file
setup_env() {
    local secret=$(generate_secret)
    
    # Create .env file with the configuration
    cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flexidb

# Authentication
NEXTAUTH_SECRET=${secret}
NEXTAUTH_URL=http://localhost:3000

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

    echo -e "${GREEN}Created .env file with secure NEXTAUTH_SECRET${NC}"
    echo -e "${YELLOW}Your NEXTAUTH_SECRET has been generated: ${secret}${NC}"
}

# Main execution
echo -e "${YELLOW}Setting up environment configuration...${NC}"

# Check if .env exists
if [ -f .env ]; then
    echo -e "${YELLOW}Existing .env file found. Do you want to regenerate it? (y/N)${NC}"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        setup_env
    else
        echo -e "${YELLOW}Checking existing .env file...${NC}"
        if ! grep -q "^NEXTAUTH_SECRET=" .env || [ -z "$(grep "^NEXTAUTH_SECRET=" .env | cut -d'=' -f2)" ]; then
            echo -e "${YELLOW}NEXTAUTH_SECRET is missing or empty. Adding it now...${NC}"
            secret=$(generate_secret)
            # If NEXTAUTH_SECRET line exists but is empty, replace it
            if grep -q "^NEXTAUTH_SECRET=" .env; then
                sed -i "s/^NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=${secret}/" .env
            else
                # If line doesn't exist, append it
                echo "NEXTAUTH_SECRET=${secret}" >> .env
            fi
            echo -e "${GREEN}Added NEXTAUTH_SECRET to .env file${NC}"
            echo -e "${YELLOW}Your NEXTAUTH_SECRET has been generated: ${secret}${NC}"
        else
            echo -e "${GREEN}NEXTAUTH_SECRET already exists in .env file${NC}"
        fi
    fi
else
    setup_env
fi

echo -e "${GREEN}Environment configuration complete!${NC}"
# Start the services
echo -e "${YELLOW}Starting Docker containers...${NC}"
docker-compose down -v
docker-compose up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
timeout=60
while [ $timeout -gt 0 ]; do
    if docker-compose ps | grep -q "unhealthy"; then
        echo -e "${YELLOW}Waiting for services to become healthy... ($timeout seconds remaining)${NC}"
        sleep 1
        ((timeout--))
    else
        echo -e "${GREEN}All services are healthy!${NC}"
        break
    fi
done

if [ $timeout -eq 0 ]; then
    echo -e "${RED}Services failed to become healthy within timeout period${NC}"
    docker-compose logs
    exit 1
fi

echo -e "${GREEN}FlexiDB is now running!${NC}"
echo -e "Access the application at: ${YELLOW}http://localhost:3000${NC}"
echo -e "${YELLOW}Default database credentials:${NC}"
