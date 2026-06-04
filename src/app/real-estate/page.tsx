import type { Metadata } from 'next';
import RealEstateClient from './real-estate-client';

export const metadata: Metadata = {
  title: 'The Winners Circle — Elevate Real Estate Free Mastermind',
  description:
    'A free live Zoom mastermind for real estate agents, brokers, and team leaders. Hosted by John Wentworth — $1B+ in real estate sales. Limited seats.',
  openGraph: {
    type: 'website',
    title: 'Elevate Real Estate — Free Zoom Mastermind with John Wentworth',
    description:
      'One live Zoom mastermind built for real estate agents, brokers, and team leaders ready to scale. Free. Limited seats.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Build the Real Estate Business You Actually Want — free Zoom mastermind with John Wentworth',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Elevate Real Estate — Free Zoom Mastermind with John Wentworth',
    description: 'Free live Zoom mastermind for real estate pros. Limited seats.',
    images: ['/og-image.jpg'],
  },
};

export default function RealEstatePage() {
  return <RealEstateClient />;
}
