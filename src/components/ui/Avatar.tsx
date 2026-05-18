import { Profile, getTierColor, getInitials } from '@/types';

interface Props {
  profile: Profile;
  size?: number;
}

export default function Avatar({ profile, size = 40 }: Props) {
  const tierColor = getTierColor(profile.tier);
  const initials = getInitials(profile.full_name || profile.email);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: profile.avatar_url ? 'transparent' : 'var(--gold-dim)',
      border: `2px solid ${tierColor}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700, color: tierColor,
      overflow: 'hidden', flexShrink: 0,
    }}>
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : initials}
    </div>
  );
}
