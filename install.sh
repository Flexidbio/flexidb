#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install packages based on the package manager
install_packages() {
    if command_exists apt-get; then
        sudo apt-get update
        sudo apt-get install -y "$@"
    elif command_exists dnf; then
        sudo dnf install -y "$@"
    elif command_exists yum; then
        sudo yum install -y "$@"
    elif command_exists pacman; then
        sudo pacman -Sy --noconfirm "$@"
    else
        echo -e "${RED}No supported package manager found (apt, dnf, yum, or pacman)${NC}"
        exit 1
    fi
}

# Function to check and install Docker
setup_docker() {
    if ! command_exists docker; then
        echo -e "${YELLOW}Docker not found. Installing Docker...${NC}"
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        sudo systemctl enable docker
        sudo systemctl start docker
        rm get-docker.sh
        echo -e "${GREEN}Docker installed successfully${NC}"
    else
        echo -e "${GREEN}Docker is already installed${NC}"
    fi
}

# Function to install Docker Compose
setup_docker_compose() {
    if ! command_exists docker-compose; then
        echo -e "${YELLOW}Docker Compose not found. Installing Docker Compose...${NC}"
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo -e "${GREEN}Docker Compose installed successfully${NC}"
    else
        echo -e "${GREEN}Docker Compose is already installed${NC}"
    fi
}

# Function to install Git
setup_git() {
    if ! command_exists git; then
        echo -e "${YELLOW}Git not found. Installing Git...${NC}"
        install_packages git
        echo -e "${GREEN}Git installed successfully${NC}"
    else
        echo -e "${GREEN}Git is already installed${NC}"
    fi
}

# Function to install Node.js and npm
setup_node() {
    if ! command_exists node; then
        echo -e "${YELLOW}Node.js not found. Installing Node.js and npm...${NC}"
        curl -fsSL https://fnm.vercel.app/install | bash
        export PATH="/home/$USER/.local/share/fnm:$PATH"
        eval "$(fnm env)"
        fnm install 20
        fnm use 20
        fnm default 20
        echo -e "${GREEN}Node.js and npm installed successfully${NC}"
    else
        echo -e "${GREEN}Node.js is already installed${NC}"
    fi
}

# Main installation process
echo -e "${YELLOW}Starting FlexiDB installation...${NC}"

# Check and install basic requirements
echo "Checking and installing basic requirements..."
install_packages curl wget sudo

# Setup required tools
setup_git
setup_docker
setup_docker_compose
setup_node

# Clone and setup the application
echo -e "${YELLOW}Setting up FlexiDB...${NC}"
if [ ! -d "flexidb" ]; then
    git clone https://github.com/scshiv29-dev/flexidb.git
    cd flexidb
else
    cd flexidb
    git pull
fi

# Install project dependencies
echo "Installing project dependencies..."
npm install
# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "Please update the .env file with your configuration"
fi

# Initialize database
echo "Initializing database..."
npx prisma generate
npx prisma db push

# Start the development server
echo -e "${GREEN}Installation complete!${NC}"
echo -e "You can now start the development server with: ${YELLOW}npm run dev${NC}"
echo -e "Don't forget to update your ${YELLOW}.env${NC} file with your configuration"

# Note about Docker group
if command_exists docker; then
    echo -e "${YELLOW}Note: You may need to log out and back in for Docker group changes to take effect${NC}"
fi