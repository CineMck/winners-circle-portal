'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Profile, getTierColor } from '@/types';
import Logo from '@/components/Logo';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/members', label: 'Members', icon: '👥' },
  { href: '/admin/challenges', label: 'Challenges', icon: '🎯' },
  { href: '/admin/channels', label: 'Channels', icon: '💬' },
  { href: '/admin/courses', label: 'Courses', icon: '🎓' },
  { href: '/admin/events', label: 'Events', icon: '📅' },
  { href: '/admin/resources', label: 'Resources', icon: '📚' },
  { href: '/admin/progress', label: 'Progress', icon: '📈' },
  { href: '/admin/agent', label: 'AI Agent', icon: '🤖' },
  { href: '/admin/email', label: 'Email Marketing', icon: '✉️' },
  { href: '/admin/new-members', label: 'Paid Members', icon: '🌟' },
  { href: '/admin/moderation', label: 'Moderation Log', icon: '🛡️' },
];

export default function AdminShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black-bg)', display: 'flex' }}>
      {/* Admin Sidebar */}
      <aside style={{
        width: '220px', background: 'var(--black-card)', borderRight: '1px solid var(--border)',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Logo size={22} />
            <span style={{ fontWeight: 800, color: 'var(--gold)', fontSize: '14px' }}>Winner&apos;s Circle</span>
          </div>
          <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⚙️ Admin Panel
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {ADMIN_NAV.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href) && item.href !== '/admin';
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 10px', borderRadius: '8px', marginBottom: '2px',
                background: active ? 'rgba(239,68,68,0.1)' : 'transparent',
                border: `1px solid ${active ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
                color: active ? '#ef4444' : 'var(--text)', fontSize: '13px', fontWeight: active ? 700 : 400,
                transition: 'all 0.15s',
              }}>
                <span>{item.icon}</span> {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <Link href="/home" style={{ display: 'block', textAlign: 'center', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: '12px' }}>
            ← Back to Portal
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: '220px', flex: 1, padding: '0' }}>
        {children}
      </main>
    </div>
  );
}
