'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Profile, Channel, canAccessTier, getTierColor, getTierLabel, getInitials } from '@/types';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from './NotificationBell';
import PushNotificationSetup from '@/components/PushNotificationSetup';
import NativePushBootstrap from '@/components/NativePushBootstrap';

interface Props {
  profile: Profile;
  channels: Channel[];
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { page: 'home', label: 'Home', icon: '🏠', href: '/home', tier: 'free' as const },
  { page: 'community', label: 'Community', icon: '💬', href: '/community', tier: 'free' as const },
  { page: 'courses', label: 'Courses', icon: '🎓', href: '/courses', tier: 'free' as const },
  { page: 'events', label: 'Events', icon: '📅', href: '/events', tier: 'free' as const },
  { page: 'resources', label: 'Resources', icon: '📚', href: '/resources', tier: 'free' as const },
  { page: 'messages', label: 'Messages', icon: '✉️', href: '/messages', tier: 'free' as const },
  { page: 'challenges', label: 'Challenges', icon: '🎯', href: '/challenges', tier: 'free' as const },
  { page: 'referrals', label: 'Referrals', icon: '🔗', href: '/referrals', tier: 'free' as const },
  { page: 'upgrade', label: 'Upgrade', icon: '⬆️', href: '/upgrade', tier: 'free' as const },
  { page: 'profile', label: 'Profile', icon: '👤', href: '/profile', tier: 'free' as const },
];

export default function PortalShell({ profile, channels, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isCommunity = pathname.startsWith('/community');

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const tierColor = getTierColor(profile?.tier || 'free');
  const initials = getInitials(profile?.full_name || profile?.email || 'U');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black-bg)' }}>
      {/* TOPBAR */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--topbar-h)',
        background: 'var(--black-card)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 20px',
        justifyContent: 'space-between', zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>🏆</span>
          <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--gold)' }}>Winner&apos;s Circle</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NotificationBell userId={profile?.id} />
          <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: profile?.avatar_url ? 'transparent' : 'var(--gold-dim)',
              border: `2px solid ${tierColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: tierColor,
              overflow: 'hidden',
            }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : initials}
            </div>
            <div style={{ display: 'none' }} className="desktop-only">
              <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1 }}>{profile?.full_name}</div>
              <div style={{ fontSize: '11px', color: tierColor, marginTop: '2px' }}>
                {getTierLabel(profile?.tier || 'free')}
              </div>
            </div>
          </Link>
        </div>
      </header>

      {/* MOBILE TOP NAV */}
      <nav style={{
        position: 'fixed', top: 'var(--topbar-h)', left: 0, right: 0,
        height: 'var(--mobile-nav-h)',
        background: 'var(--black-card)', borderBottom: '1px solid var(--border)',
        display: 'flex', overflowX: 'auto', overflowY: 'hidden',
        zIndex: 99, scrollbarWidth: 'none',
      }} className="mobile-nav">
        {NAV_ITEMS.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.page} href={item.href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '3px', padding: '6px 20px',
              minWidth: '72px', height: '100%', flexShrink: 0,
              borderBottom: `3px solid ${active ? 'var(--gold)' : 'transparent'}`,
              textDecoration: 'none',
            }}>
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: active ? 'var(--gold)' : 'var(--muted)', letterSpacing: '0.3px' }}>
                {item.label.toUpperCase()}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* MOBILE CHANNEL SUB-NAV — only shows on community pages */}
      {isCommunity && (
        <nav style={{
          position: 'fixed',
          top: 'calc(var(--topbar-h) + var(--mobile-nav-h))',
          left: 0, right: 0,
          height: '40px',
          background: '#0d0d0d',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          overflowX: 'auto', overflowY: 'hidden',
          gap: '6px', padding: '0 12px',
          zIndex: 98,
          scrollbarWidth: 'none',
        }} className="channel-sub-nav">
          {channels.map(channel => {
            const hasAccess = canAccessTier(profile?.tier || 'free', channel.tier_required);
            const active = pathname === `/community/${channel.slug}`;
            return (
              <Link
                key={channel.id}
                href={hasAccess ? `/community/${channel.slug}` : '/upgrade'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px', borderRadius: '20px', flexShrink: 0,
                  background: active ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                  color: active ? '#0a0a0a' : hasAccess ? 'var(--text)' : 'var(--muted)',
                  fontSize: '12px', fontWeight: active ? 700 : 500,
                  textDecoration: 'none',
                  opacity: hasAccess ? 1 : 0.5,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: '11px' }}>#</span>
                {channel.name.toLowerCase()}
                {!hasAccess && <span style={{ fontSize: '10px' }}>🔒</span>}
              </Link>
            );
          })}
        </nav>
      )}

      {/* SIDEBAR */}
      <aside style={{
        position: 'fixed', top: 'var(--topbar-h)', left: 0, bottom: 0,
        width: 'var(--sidebar-w)',
        background: 'var(--black-card)', borderRight: '1px solid var(--border)',
        overflowY: 'auto', zIndex: 98, display: 'flex', flexDirection: 'column',
      }} className="sidebar">
        {/* Main nav */}
        <div style={{ padding: '16px 12px 8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px', paddingLeft: '8px' }}>
            NAVIGATE
          </div>
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.page} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 10px', borderRadius: '8px', marginBottom: '2px',
                background: active ? 'var(--gold-dim)' : 'transparent',
                border: `1px solid ${active ? 'var(--gold)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: active ? 700 : 500, color: active ? 'var(--gold)' : 'var(--text)' }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Nav flex spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom: member info + sign out */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--gold-dim)', border: `2px solid ${tierColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: tierColor, flexShrink: 0,
            }}>{initials}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.full_name}
              </div>
              <div style={{ fontSize: '11px', color: tierColor }}>{getTierLabel(profile?.tier || 'free')}</div>
            </div>
          </div>
          {profile?.tier !== 'founding' && (
            <Link href="/upgrade" style={{
              display: 'block', textAlign: 'center', padding: '8px', borderRadius: '8px',
              background: 'var(--gold-dim)', border: '1px solid var(--gold)',
              color: 'var(--gold)', fontSize: '12px', fontWeight: 700, marginBottom: '8px',
              textDecoration: 'none',
            }}>
              ⬆️ Upgrade Membership
            </Link>
          )}
          {profile?.role && ['admin', 'moderator'].includes(profile.role) && (
            <Link href="/admin" style={{
              display: 'block', textAlign: 'center', padding: '8px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', fontSize: '12px', fontWeight: 600, marginBottom: '8px',
              textDecoration: 'none',
            }}>
              ⚙️ Admin Panel
            </Link>
          )}
          <button onClick={handleSignOut} style={{
            width: '100%', padding: '8px', borderRadius: '8px',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--muted)', fontSize: '12px', cursor: 'pointer',
          }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{
        marginLeft: 'var(--sidebar-w)',
        paddingTop: 'var(--topbar-h)',
        minHeight: '100vh',
      }} className={isCommunity ? 'main-content main-content-community' : 'main-content'}>
        {children}
      </main>

      <PushNotificationSetup />
      <NativePushBootstrap />

      <style>{`
        @media (max-width: 900px) {
          .sidebar { display: none !important; }
          .main-content { margin-left: 0 !important; padding-top: calc(var(--topbar-h) + var(--mobile-nav-h)) !important; }
          .main-content-community { margin-left: 0 !important; padding-top: calc(var(--topbar-h) + var(--mobile-nav-h) + 40px) !important; }
          .mobile-nav { display: flex !important; }
          .channel-sub-nav { display: flex !important; }
          .channel-sub-nav::-webkit-scrollbar { display: none; }
        }
        @media (min-width: 901px) {
          .mobile-nav { display: none !important; }
          .channel-sub-nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
