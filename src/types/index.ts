export type MemberTier = 'free' | 'core' | 'elite' | 'founding';
export type UserRole = 'member' | 'moderator' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  tier: MemberTier;
  role: UserRole;
  xp_points: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  created_at: string;
  updated_at: string;
  industry: string | null;
  birthday: string | null;
  phone: string | null;
  goals_12_months: string | null;
  goals_30_days: string | null;
  followers_count?: number;
  following_count?: number;
  is_following?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  tier_required: MemberTier;
  is_archived: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  post_count?: number;
}

export interface Post {
  id: string;
  channel_id: string | null;
  challenge_id: string | null;
  author_id: string;
  content: string;
  media_urls: string[];
  is_pinned: boolean;
  is_removed: boolean;
  removed_reason: string | null;
  removed_by: string | null;
  reaction_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  author?: Profile;
  channel?: Channel;
  challenge?: Challenge;
  user_reaction?: string | null;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  is_removed: boolean;
  created_at: string;
  author?: Profile;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  instructions_video_url: string | null;
  instructions_video_thumbnail: string | null;
  tier_required: MemberTier;
  xp_reward: number;
  badge_name: string | null;
  badge_icon: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  is_evergreen: boolean;
  created_by: string;
  created_at: string;
  // Progress tracking fields
  duration_days: number | null;
  daily_tasks: string[];
  target_metric: string | null;
  metric_unit: string | null;
  completion_threshold: number;
  participant_count?: number;
  completion_count?: number;
  post_count?: number;
  user_participation?: ChallengeParticipation | null;
}

export interface ChallengeCheckin {
  id: string;
  challenge_id: string;
  user_id: string;
  check_date: string;
  tasks_completed: boolean[];
  metric_value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeParticipation {
  id: string;
  challenge_id: string;
  user_id: string;
  status: 'enrolled' | 'completed' | 'verified';
  enrolled_at: string;
  completed_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'challenge_new' | 'comment' | 'reaction' | 'follow' | 'challenge_complete' | 'mention';
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
}

export interface ModerationLog {
  id: string;
  moderator_id: string;
  action: 'pin' | 'unpin' | 'remove_post' | 'remove_comment' | 'mute_member' | 'unmute_member' | 'verify_completion';
  target_type: 'post' | 'comment' | 'user';
  target_id: string;
  reason: string | null;
  created_at: string;
  moderator?: Profile;
}

export interface TierConfig {
  name: string;
  label: string;
  price_monthly: number;
  price_annual: number;
  stripe_price_id_monthly: string;
  stripe_price_id_annual: string;
  color: string;
  features: string[];
}

export const TIER_CONFIGS: Record<MemberTier, TierConfig> = {
  free: {
    name: 'free',
    label: 'Free',
    price_monthly: 0,
    price_annual: 0,
    stripe_price_id_monthly: '',
    stripe_price_id_annual: '',
    color: '#888888',
    features: ['1 Zoom call per month', 'Free resources library'],
  },
  core: {
    name: 'core',
    label: 'Core Member',
    price_monthly: 150,
    price_annual: 1500,
    stripe_price_id_monthly: process.env.NEXT_PUBLIC_STRIPE_CORE_MONTHLY_PRICE_ID || '',
    stripe_price_id_annual: process.env.NEXT_PUBLIC_STRIPE_CORE_ANNUAL_PRICE_ID || '',
    color: '#c9a84c',
    features: [
      '4 Zoom Lessons Per Month',
      '1 Special Guest Call',
      'Unlimited Replay Access',
      'Community Access',
      'Challenges',
      'Premium Resources',
      'Courses',
      'Free Member-Only Events',
      'Winners Circle Swag',
    ],
  },
  elite: {
    name: 'elite',
    label: 'Elevate',
    price_monthly: 495,
    price_annual: 4950,
    stripe_price_id_monthly: process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID || '',
    stripe_price_id_annual: process.env.NEXT_PUBLIC_STRIPE_ELITE_ANNUAL_PRICE_ID || '',
    color: '#e0c068',
    features: [
      'Everything in Core',
      'Community Access',
      'Challenges',
      'Premium Resources',
      'Courses',
      '2 Additional Live Group Calls / Month',
      'Group Marketing Call (1x/month)',
      'Group Coaching Call (1x/month)',
      'Small group — limited to 10 people',
    ],
  },
  founding: {
    name: 'founding',
    label: '1-1 Elite Member',
    price_monthly: 497,
    price_annual: 4970,
    stripe_price_id_monthly: process.env.NEXT_PUBLIC_STRIPE_FOUNDING_MONTHLY_PRICE_ID || '',
    stripe_price_id_annual: process.env.NEXT_PUBLIC_STRIPE_FOUNDING_ANNUAL_PRICE_ID || '',
    color: '#ffd700',
    features: [
      'Everything in Elevate',
      'Private 1-on-1 coaching sessions',
      'Direct text/call access to mentors',
      'Custom growth roadmap',
      'Annual in-person event',
      'Elite member badge forever',
    ],
  },
};

export const TIER_ORDER: MemberTier[] = ['free', 'core', 'elite', 'founding'];

export function canAccessTier(userTier: MemberTier, requiredTier: MemberTier): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}

// Re-export utility helpers so files can import from either @/types or @/lib/utils
export { getTierColor, getTierLabel, getInitials, formatDate, formatCurrency, cn } from '@/lib/utils';
