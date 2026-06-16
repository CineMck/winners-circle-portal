import type { Metadata, Viewport } from 'next';
import { Cinzel } from 'next/font/google';
import './globals.css';
import MetaPixel from '@/components/MetaPixel';
import PWARegister from '@/components/PWARegister';

// Brand wordmark font — Trajan-style Roman capitals, matches the Winners
// Circle logo treatment. Loaded as a CSS variable for use in selected
// brand spots only (topbar header, splash, certificates, etc.).
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-brand',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Winner's Circle | Members Portal",
  description: "The exclusive mastermind community for high-performers.",
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Winners Circle',
  },
};

// viewport-fit=cover is required for env(safe-area-inset-*) to return
// non-zero values on iOS — without it the topbar sits under the notch.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cinzel.variable}>
      <body>
        <MetaPixel />
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
