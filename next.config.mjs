/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_SERVER_IP: process.env.NEXT_PUBLIC_SERVER_IP,
    SERVER_IP: process.env.SERVER_IP,
    DOMAIN: process.env.DOMAIN,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_INTERNAL: process.env.NEXTAUTH_URL_INTERNAL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    TRAEFIK_CONFIG_DIR: process.env.TRAEFIK_CONFIG_DIR,
  },
  experimental: {
    instrumentationHook: false,
    serverActions: {
      allowedOrigins: [process.env.NEXTAUTH_URL || "http://localhost:3000"],
    }
  },
}

export default nextConfig