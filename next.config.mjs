/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  headers: async () => [
    {
      // Prevent caching of HTML pages (so PWA always gets latest app shell)
      source: '/((?!_next/static|_next/image|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico|.*\\.json).*)',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Pragma', value: 'no-cache' },
        { key: 'Expires', value: '0' },
      ],
    },
    {
      // Allow manifest to be cached briefly but revalidate
      source: '/manifest.json',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
      ],
    },
  ],
}

export default nextConfig
