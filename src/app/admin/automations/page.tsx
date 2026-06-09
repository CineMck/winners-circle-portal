import { createAdminClient } from '@/lib/supabase/admin';
import AutomationsAdmin, { type SeqWithSteps } from './AutomationsAdmin';

export const dynamic = 'force-dynamic';

export default async function AutomationsPage() {
  const db = createAdminClient();
  const { data: sequences } = await db.from('email_sequences').select('*').order('created_at', { ascending: true });
  const out: SeqWithSteps[] = [];
  for (const seq of sequences || []) {
    const { data: steps } = await db.from('sequence_steps').select('*').eq('sequence_id', seq.id).order('step_order', { ascending: true });
    const counts: Record<string, number> = {};
    for (const st of ['active', 'completed', 'exited']) {
      const { count } = await db.from('sequence_enrollments').select('*', { count: 'exact', head: true }).eq('sequence_id', seq.id).eq('status', st);
      counts[st] = count || 0;
    }
    out.push({ ...seq, steps: steps || [], counts });
  }
  return <AutomationsAdmin initial={out} />;
}
