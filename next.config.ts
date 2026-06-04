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
        ],
      },
    ];
  },
};

export default nextConfig;
