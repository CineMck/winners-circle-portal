'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Portal error:', error);
  }, [error]);

  return (
    <div style={{ padding: '48px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Something went wrong</h2>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
        This page failed to load. If this keeps happening, the database migration may not have been run yet.
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={reset} className="btn-gold" style={{ padding: '10px 24px', fontSize: '14px' }}>
          Try Again
        </button>
        <Link href="/home" style={{ padding: '10px 24px', fontSize: '14px', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--muted)', textDecoration: 'none' }}>
          Go Home
        </Link>
      </div>
    </div>
  );
}
