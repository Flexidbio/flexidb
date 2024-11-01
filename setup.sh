#!/bin/bash

# Exit on error
set -e

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Create necessary directories
sudo mkdir -p /etc/traefik
sudo mkdir -p /etc/traefik/dynamic
sudo mkdir -p /var/log/traefik

echo "Creating traefik configuration"
# get userEmail address for letsencrypt 

# Create traefik configuration
cat > /etc/traefik/traefik.yml << EOL
api:
  dashboard: true
  insecure: true

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: "your-email@example.com"  # Change this
      storage: "/etc/traefik/acme.json"
      httpChallenge:
        entryPoint: web

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
  file:
    directory: "/etc/traefik/dynamic"
    watch: true
EOL

# Create acme.json for SSL certificates
sudo touch /etc/traefik/acme.json
sudo chmod 600 /etc/traefik/acme.json

# Pull required Docker images
docker pull traefik:latest
docker pull mysql:latest
docker pull postgres:latest
docker pull mongo:latest
docker pull redis:latest
docker pull mariadb:latest

# Create Docker network
docker network create traefik-net

# Start Traefik
docker run -d \
  --name traefik \
  --restart unless-stopped \
  --network traefik-net \
  -p 80:80 \
  -p 443:443 \
  -p 8080:8080 \
  -v /etc/traefik:/etc/traefik \
  -v /var/run/docker.sock:/var/run/docker.sock \
  traefik:latest

# Clone and build the application
git clone https://github.com/your-repo/flexidb.git
cd flexidb

# Create .env file
cat > .env << EOL
DATABASE_URL="postgresql://postgres:password@db:5432/flexidb"
NEXTAUTH_URL="https://your-domain.com"  # Change this
NEXTAUTH_SECRET="your-secret-here"      # Change this
TRAEFIK_CONFIG_DIR="/etc/traefik"
EOL

# Build and start the application
docker build -t flexidb .
docker run -d \
  --name flexidb \
  --restart unless-stopped \
  --network traefik-net \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /etc/traefik:/etc/traefik \
  --label "traefik.enable=true" \
  --label "traefik.http.routers.flexidb.rule=Host(\`your-domain.com\`)" \
  --label "traefik.http.routers.flexidb.entrypoints=websecure" \
  --label "traefik.http.routers.flexidb.tls.certresolver=letsencrypt" \
  flexidb

echo "Setup complete! Please update the following:"
echo "1. Edit /etc/traefik/traefik.yml and set your email address"
echo "2. Update the .env file with your domain and secrets"
echo "3. Update the docker run command with your domain"