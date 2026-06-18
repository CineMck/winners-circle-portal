'use client';

import { useEffect } from 'react';

// Hides member tier labels (the text shown under names) from non-staff members
// by toggling a body class that the layout's CSS targets. Admins and moderators
// keep seeing tiers everywhere.
export default function TierVisibility({ role }: { role?: string | null }) {
  useEffect(() => {
    const staff = role === 'admin' || role === 'moderator';
    document.body.classList.toggle('hide-tiers', !staff);
    return () => { document.body.classList.remove('hide-tiers'); };
  }, [role]);
  return null;
}
