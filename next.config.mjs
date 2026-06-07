import withPWAInit from 'next-pwa'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

// Self-hosted Supabase storage host'unu (NEXT_PUBLIC_SUPABASE_URL) otomatik allowlist'e ekle
const supabaseRemotePattern = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url) return null
    const { protocol, hostname } = new URL(url)
    return { protocol: protocol.replace(':', ''), hostname }
  } catch {
    return null
  }
})()

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    missingSuspenseWithCSRBailout: false,
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
  async headers() {
    return [
      {
        source: '/api/cron/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.vimeocdn.com' },
      ...(supabaseRemotePattern ? [supabaseRemotePattern] : []),
    ],
  },
}

export default withNextIntl(withPWA(nextConfig))
