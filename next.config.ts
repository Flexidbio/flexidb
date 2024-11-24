/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      config.externals.push({
        'ssh2': 'commonjs ssh2',
        'node-pty': 'commonjs node-pty',
        'bufferutil': 'commonjs bufferutil',
        'utf-8-validate': 'commonjs utf-8-validate',
      })
    }
    return config
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  }
}

module.exports = nextConfig