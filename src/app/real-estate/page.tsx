import type { Metadata } from 'next';
import RealEstateClient from './real-estate-client';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCallTime } from '@/lib/reMarketing';

// Re-check sessions periodically (admins add/edit calls in the admin panel).
export const revalidate = 300;

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

export default async function RealEstatePage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('re_call_sessions')
    .select('id, label, starts_at')
    .eq('is_active', true)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  const sessions = (data || []).map((s) => ({
    id: s.id,
    label: s.label || formatCallTime(s.starts_at),
    starts_at: s.starts_at as string,
  }));

  return <RealEstateClient sessions={sessions} />;
}
