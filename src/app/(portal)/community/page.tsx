import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function CommunityPage() {
  const supabase = await createClient();
  const { data: channels } = await supabase.from('channels').select('slug').eq('is_archived', false).order('sort_order').limit(1);
  if (channels && channels.length > 0) redirect(`/community/${channels[0].slug}`);
  return null;
}
