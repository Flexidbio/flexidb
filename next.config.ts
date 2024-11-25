/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config: { externals: any[]; }, { isServer }: any) => {
    if (isServer) {
      config.externals = [...config.externals,
        'bufferutil',
        'utf-8-validate',
        'ssh2',
        'node-pty'
      ];
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: true, // Set to false in development
  },
  eslint: {
    ignoreDuringBuilds: true, // Set to false in development
  }
}

module.exports = nextConfig