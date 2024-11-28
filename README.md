# FlexiDB

A modern, self-hosted database management platform built with Next.js 14, shadcn/ui, and Docker.

## Features

- 🚀 Quick database deployment and management
- 🔐 Built-in authentication with NextAuth v5
- 🎨 Modern UI with shadcn/ui and Tailwind CSS
- 🐳 Docker-based infrastructure
- 📝 Real-time logs and monitoring
- 🔧 Customizable environment variables
- 🌐 Custom domain support
- 📨 Email integration for notifications

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma
- TanStack Query
- Next-Auth v5
- shadcn/ui
- Tailwind CSS
- Docker
- Traefik

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Bun (optional, but recommended)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/flexidb.git
cd flexidb
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Initialize the database:
```bash
docker compose up -d db
bun prisma migrate dev
```

5. Create an admin user:
```bash
bun scripts/create-admin.ts
```

6. Start the development server:
```bash
bun dev
# or
npm run dev
```

## Project Structure

```
flexidb/
├── src/
│   ├── app/             # Next.js app router pages
│   ├── components/      # React components
│   ├── lib/            # Utilities and business logic
│   └── hooks/          # Custom React hooks
├── prisma/             # Database schema and migrations
└── docker/            # Docker configuration files
```

## Development

The project uses Next.js server actions and TanStack Query for data management. Key conventions:

- Server actions are located in `src/lib/actions/`
- React components use shadcn/ui for consistent styling
- Database operations are handled through Prisma client
- Docker management through custom hooks in `src/hooks/`

## Deployment

1. Build the Docker image:
```bash
docker compose build
```

2. Start the production stack:
```bash
docker compose -f docker-compose.yml up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
You should have received a copy of the GNU Affero General Public License along with this program. If not, see https://www.gnu.org/licenses/.