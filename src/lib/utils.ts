import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MemberTier } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function getTierColor(tier: MemberTier): string {
  const colors: Record<MemberTier, string> = {
    free: '#888888',
    base: '#b8c4d0',
    core: '#c9a84c',
    elite: '#e0c068',
    founding: '#ffd700',
    // Real Estate Promo members appear identical to Core members.
    re_promo: '#c9a84c',
  };
  return colors[tier] || '#888888';
}

export function getTierLabel(tier: MemberTier): string {
  const labels: Record<MemberTier, string> = {
    free: 'Free',
    base: 'Base',
    core: 'Core',
    elite: 'Elevate',
    founding: '1-1 Elite',
    // Real Estate Promo members appear identical to Core members.
    re_promo: 'Core',
  };
  return labels[tier] || tier;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
