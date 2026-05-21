import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// (unused in this route — we call Claude inline below with conversation history support)

// POST /api/agent/command
// Body: { reportId, instruction, commandLog }
// Returns: { reply, actions?: [{ type, userId, name, message }] }
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reportId, instruction, commandLog } = await req.json() as {
      reportId: string;
      instruction: string;
      commandLog: Array<{ role: string; content: string }>;
    };

    // Get report context
    let reportContext = '';
    if (reportId) {
      const { data: report } = await supabaseAdmin
        .from('agent_reports')
        .select('summary_text, suggested_outreach, generated_at')
        .eq('id', reportId)
        .single();
      if (report) {
        reportContext = `\nCurrent report summary: ${report.summary_text}\nSuggested outreach: ${JSON.stringify(report.suggested_outreach)}`;
      }
    }

    // Get all members for context
    const { data: members } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, username, tier')
      .order('full_name');

    const systemPrompt = `You are an AI assistant helping manage John Wentworth's Winner's Circle mastermind community. You take instructions from John or his co-admin Christian and execute them on John's behalf.

When given an instruction, respond in JSON:
{
  "reply": "Your conversational reply explaining what you'll do or did",
  "actions": [
    {
      "type": "dm",
      "userId": "string",
      "name": "string",
      "message": "the exact DM message to send as John"
    }
  ]
}

If the instruction doesn't require sending messages, return an empty actions array.
Write DM messages in John's voice: warm, direct, motivational. Keep them concise.

Available members: ${JSON.stringify((members || []).map(m => ({ id: m.id, name: m.full_name, username: m.username, tier: m.tier })))}
${reportContext}`;

    const conversationHistory = (commandLog || []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          { role: 'user', content: instruction },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ reply: 'Sorry, I encountered an error connecting to Claude. Please check the ANTHROPIC_API_KEY environment variable.', actions: [] });
    }

    const json = await res.json();
    const rawContent = json.content?.[0]?.text || '{}';

    let parsed: { reply: string; actions?: Array<{ type: string; userId: string; name: string; message: string }> } = {
      reply: rawContent,
      actions: [],
    };

    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      parsed = { reply: rawContent, actions: [] };
    }

    // Update command log in DB
    if (reportId) {
      const { data: report } = await supabaseAdmin
        .from('agent_reports').select('command_log').eq('id', reportId).single();
      const existingLog = (report?.command_log as Array<unknown>) || [];
      await supabaseAdmin.from('agent_reports')
        .update({
          command_log: [
            ...existingLog,
            { role: 'user', content: instruction, timestamp: new Date().toISOString() },
            { role: 'agent', content: parsed.reply, timestamp: new Date().toISOString() },
          ],
        })
        .eq('id', reportId);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Command error:', err);
    return NextResponse.json({ reply: 'An error occurred. Please try again.', actions: [] });
  }
}
