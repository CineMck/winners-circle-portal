import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  // Silence Stripe server-only import warnings in client build
  serverExternalPackages: ['stripe'],
  async redirects() {
    return [
      // Alias matching the original landing-site URL for this page.
      // (Note: redirect sources match case-insensitively, so a source that
      // only differs from its destination by case creates a redirect loop —
      // case normalization for /Real-Estate lives in middleware instead.)
      { source: '/elevate-real-estate', destination: '/real-estate', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow the app to load inside Capacitor webview
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Allow camera/mic access for future native features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
          // Stop MIME sniffing (drive-by content-type confusion).
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Don't leak full URLs (which can carry tokens) to other origins.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Force HTTPS for 2 years (browsers only honor this over HTTPS).
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
