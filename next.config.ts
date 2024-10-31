/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config: { externals: { ssh2: string; 'node-pty': string; bufferutil: string; 'utf-8-validate': string }[] }, { isServer }: any) => {
    // Only on server configuration
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
}

module.exports = nextConfig