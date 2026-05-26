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
