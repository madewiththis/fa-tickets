/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const origin = process.env.BACKEND_ORIGIN ?? 'http://app:8000'
    console.log('Rewriting API calls to:', origin)
    return [
      {
        source: '/api/:path*',
        destination: `${origin}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
