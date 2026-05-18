import { MemberTier, getTierColor, getTierLabel } from '@/types';

export default function TierBadge({ tier }: { tier: MemberTier }) {
  const color = getTierColor(tier);
  const label = getTierLabel(tier);
  const emoji = { free: '○', core: '⚡', elite: '💎', founding: '👑' }[tier];
  return (
    <span className="tier-badge" style={{ color, borderColor: color }}>
      {emoji} {label}
    </span>
  );
}
