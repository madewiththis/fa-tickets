/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const origin = process.env.BACKEND_ORIGIN ?? 'http://localhost:8000'
    return [
      {
        source: '/api/:path*',
        destination: `${origin}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
