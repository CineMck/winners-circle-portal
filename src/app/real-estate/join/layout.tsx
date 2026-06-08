import type { Metadata } from 'next';

// Promo signup is link-only — keep it out of search results so it's reachable
// only via the Real Estate landing page CTA / shared link.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RealEstateJoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
