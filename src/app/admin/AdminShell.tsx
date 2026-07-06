'use client';
import { useState } from 'react';
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
  { href: '/admin/sms', label: 'SMS Marketing', icon: '📱' },
  { href: '/admin/automations', label: 'Automations', icon: '⚙️' },
  { href: '/admin/leads', label: 'RE Marketing List', icon: '🏠' },
  { href: '/admin/call-sessions', label: 'Call Sessions', icon: '📞' },
  { href: '/admin/new-members', label: 'Paid Members', icon: '🌟' },
  { href: '/admin/moderation', label: 'Moderation Log', icon: '🛡️' },
];

export default function AdminShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Suppress lint — profile passed for future use (tier color, name, etc.)
  void getTierColor; void profile;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black-bg)', display: 'flex' }}>
      {/* MOBILE TOP BAR — only on small screens */}
      <header className="admin-mobile-bar app-topbar" style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: 'var(--black-card)', borderBottom: '1px solid var(--border)',
        display: 'none', alignItems: 'center', padding: '0 12px',
        zIndex: 110, gap: 10,
      }}>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open admin menu"
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 8,
            padding: '6px 10px', color: 'var(--text)', fontSize: 18, cursor: 'pointer', lineHeight: 1,
          }}
        >
          ☰
        </button>
        <Logo size={22} />
        <div style={{
          flex: 1, color: 'var(--gold)', fontSize: 14,
          fontFamily: 'var(--font-brand), Georgia, serif',
          fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          The Winners Circle <span style={{ color: '#ef4444', fontSize: 10, marginLeft: 6, letterSpacing: '0.1em' }}>ADMIN</span>
        </div>
        <Link
          href="/home"
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 8,
            padding: '6px 10px', color: 'var(--muted)', fontSize: 12, textDecoration: 'none',
          }}
        >
          ← Portal
        </Link>
      </header>

      {/* Backdrop when mobile menu is open */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="admin-drawer-backdrop"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 120,
          }}
        />
      )}

      {/* Admin Sidebar — also acts as mobile drawer */}
      <aside className="admin-sidebar" data-open={menuOpen} style={{
        width: '220px', background: 'var(--black-card)', borderRight: '1px solid var(--border)',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 130,
        display: 'flex', flexDirection: 'column',
        transition: 'transform 200ms ease',
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Logo size={28} />
              <span style={{
                color: 'var(--gold)', fontSize: '13px',
                fontFamily: 'var(--font-brand), Georgia, serif',
                fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>The Winners Circle</span>
            </div>
            <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚙️ Admin Panel
            </div>
          </div>
          {/* Close button — only visible on mobile */}
          <button
            onClick={() => setMenuOpen(false)}
            className="admin-drawer-close"
            aria-label="Close menu"
            style={{
              display: 'none', background: 'none', border: 'none',
              color: 'var(--muted)', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {ADMIN_NAV.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href) && item.href !== '/admin';
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 10px', borderRadius: '8px', marginBottom: '2px',
                  background: active ? 'rgba(239,68,68,0.1)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
                  color: active ? '#ef4444' : 'var(--text)', fontSize: '13px', fontWeight: active ? 700 : 400,
                  transition: 'all 0.15s',
                  textDecoration: 'none',
                }}
              >
                <span>{item.icon}</span> {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <Link href="/home" style={{ display: 'block', textAlign: 'center', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: '12px', textDecoration: 'none' }}>
            ← Back to Portal
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main" style={{ marginLeft: '220px', flex: 1, padding: '0' }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 900px) {
          .admin-mobile-bar { display: flex !important; }
          .admin-drawer-close { display: block !important; }
          .admin-main { margin-left: 0 !important; padding-top: 56px !important; }
          .admin-sidebar { transform: translateX(-100%); }
          .admin-sidebar[data-open="true"] { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,0.5); }
        }
        @media (min-width: 901px) {
          .admin-drawer-backdrop { display: none !important; }
        }
        body.has-safe-area .admin-mobile-bar {
          padding-top: env(safe-area-inset-top, 0px) !important;
          height: calc(56px + env(safe-area-inset-top, 0px)) !important;
        }
        body.has-safe-area .admin-main {
          padding-top: calc(56px + env(safe-area-inset-top, 0px)) !important;
        }
        @media (min-width: 901px) {
          body.has-safe-area .admin-main { padding-top: 0 !important; }
        }
      `}</style>
    </div>
  );
}
