/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
    serverComponentsExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'],
  },
}

module.exports = nextConfig
