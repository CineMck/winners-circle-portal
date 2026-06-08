import { MemberTier, getTierColor, getTierLabel } from '@/types';

export default function TierBadge({ tier }: { tier: MemberTier }) {
  const color = getTierColor(tier);
  const label = getTierLabel(tier);
  // re_promo intentionally mirrors core (Real Estate Promo members appear as Core).
  const emoji = { free: '○', core: '⚡', elite: '💎', founding: '👑', re_promo: '⚡' }[tier];
  return (
    <span className="tier-badge" style={{ color, borderColor: color }}>
      {emoji} {label}
    </span>
  );
}
