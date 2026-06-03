import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Winner's Circle | Members Portal",
  description: "The exclusive mastermind community for high-performers.",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
