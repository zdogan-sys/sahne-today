import withSerwistInit from '@serwist/next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
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
  serverExternalPackages: ['@anthropic-ai/sdk'],
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

export default withNextIntl(withSerwist(nextConfig))
