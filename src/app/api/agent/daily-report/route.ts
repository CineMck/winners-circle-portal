import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const JOHN_EMAIL = process.env.AGENT_JOHN_EMAIL || 'john@wentworthre.com';
const CHRISTIAN_EMAIL = process.env.AGENT_CHRISTIAN_EMAIL || 'christian@wentworthgroup.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://winners-circle-portal-production.up.railway.app';

// ── Helper: find or create a DM conversation between two users ──
async function getOrCreateConversation(userAId: string, userBId: string): Promise<string | null> {
  const { data: aRows } = await supabaseAdmin
    .from('conversation_participants').select('conversation_id').eq('user_id', userAId);
  if (aRows && aRows.length > 0) {
    const ids = aRows.map(r => r.conversation_id);
    const { data: shared } = await supabaseAdmin
      .from('conversation_participants').select('conversation_id')
      .eq('user_id', userBId).in('conversation_id', ids);
    if (shared && shared.length > 0) return shared[0].conversation_id;
  }
  const { data: conv, error } = await supabaseAdmin
    .from('conversations').insert({}).select('id').single();
  if (error || !conv) return null;
  await supabaseAdmin.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: userAId },
    { conversation_id: conv.id, user_id: userBId },
  ]);
  return conv.id;
}

// ── Helper: send a DM as a specific user (using admin client to bypass RLS) ──
async function sendDMAs(senderId: string, conversationId: string, content: string) {
  await supabaseAdmin.from('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content,
  });
  await supabaseAdmin.from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

// ── Helper: call Claude API ──
async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set in Railway.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err}`);
  }
  const json = await res.json();
  return json.content?.[0]?.text || '';
}

// ── GET /api/agent/daily-report — callable by cron or manually ──
export async function GET(req: NextRequest) {
  // Verify cron secret (optional but recommended)
  const secret = req.nextUrl.searchParams.get('secret');
  if (process.env.AGENT_CRON_SECRET && secret !== process.env.AGENT_CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // ── Fetch member data ──
    const { data: members } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, username, tier, email')
      .order('full_name');

    const { data: courseProgress } = await supabaseAdmin
      .from('course_progress')
      .select('user_id, lesson_id, completed_at, course_lessons(course_id, courses(title))');

    const { data: recentCourseProgress } = await supabaseAdmin
      .from('course_progress')
      .select('user_id, lesson_id, completed_at, course_lessons(courses(title))')
      .gte('completed_at', sevenDaysAgo);

    const { data: allLessons } = await supabaseAdmin
      .from('course_lessons')
      .select('id, course_id')
      .eq('is_published', true);

    const { data: participations } = await supabaseAdmin
      .from('challenge_participations')
      .select('user_id, challenge_id, status, enrolled_at');

    const { data: recentCheckins } = await supabaseAdmin
      .from('challenge_checkins')
      .select('user_id, challenge_id, check_date, metric_value, notes')
      .gte('check_date', sevenDaysAgo.split('T')[0]);

    const { data: allCheckins } = await supabaseAdmin
      .from('challenge_checkins')
      .select('user_id, check_date')
      .order('check_date', { ascending: false });

    const { data: challenges } = await supabaseAdmin
      .from('challenges')
      .select('id, title, target_metric, metric_unit, is_active');

    // ── Build per-member summary for the AI ──
    const lessonsByCourse: Record<string, number> = {};
    (allLessons || []).forEach(l => {
      lessonsByCourse[l.course_id] = (lessonsByCourse[l.course_id] || 0) + 1;
    });

    const memberSummaries = (members || []).map(m => {
      // Course completions this week
      const weekLessons = (recentCourseProgress || []).filter(p => p.user_id === m.id);
      const allMyLessons = (courseProgress || []).filter(p => p.user_id === m.id);

      // Course progress
      const courseMap: Record<string, { title: string; completed: number; total: number }> = {};
      allMyLessons.forEach(p => {
        const lesson = p.course_lessons as unknown as { course_id: string; courses: { title: string } };
        if (!lesson?.courses) return;
        const title = lesson.courses.title;
        const cid = lesson.course_id;
        if (!courseMap[cid]) courseMap[cid] = { title, completed: 0, total: lessonsByCourse[cid] || 0 };
        courseMap[cid].completed++;
      });
      const coursesInProgress = Object.values(courseMap).filter(c => c.completed > 0 && c.completed < c.total);
      const coursesCompleted = Object.values(courseMap).filter(c => c.completed >= c.total && c.total > 0);

      // Challenge stats
      const myParticipations = (participations || []).filter(p => p.user_id === m.id);
      const myCheckins = (allCheckins || []).filter(c => c.user_id === m.id);
      const myRecentCheckins = (recentCheckins || []).filter(c => c.user_id === m.id);

      // Current streak calculation
      let streak = 0;
      const checkinDates = myCheckins.map(c => c.check_date).sort().reverse();
      if (checkinDates.length > 0) {
        const last = checkinDates[0];
        const daysSinceLast = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
        if (daysSinceLast <= 1) {
          streak = 1;
          for (let i = 1; i < checkinDates.length; i++) {
            const prev = new Date(checkinDates[i - 1]);
            const curr = new Date(checkinDates[i]);
            if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) streak++;
            else break;
          }
        }
      }

      // Days since last activity
      const dates = [
        ...allMyLessons.map(p => p.completed_at),
        ...myCheckins.map(c => c.check_date + 'T00:00:00'),
      ].filter(Boolean).sort().reverse();
      const lastActive = dates[0];
      const daysSinceActive = lastActive
        ? Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000)
        : null;

      return {
        id: m.id,
        name: m.full_name,
        username: m.username,
        tier: m.tier,
        coursesInProgress: coursesInProgress.map(c => c.title),
        coursesCompleted: coursesCompleted.map(c => c.title),
        lessonsThisWeek: weekLessons.length,
        challengesJoined: myParticipations.length,
        checkinsThisWeek: myRecentCheckins.length,
        currentStreak: streak,
        daysSinceLastActivity: daysSinceActive,
        completedChallenges: myParticipations.filter(p => p.status === 'completed').length,
      };
    });

    // ── Call Claude for analysis ──
    const systemPrompt = `You are an AI assistant helping John Wentworth manage the Winner's Circle mastermind community. John is a successful real estate entrepreneur who genuinely cares about his members' growth and progress.

Your job is to:
1. Analyze member activity data
2. Identify members worth celebrating (giving props to)
3. Identify members who need encouragement or a check-in
4. Write DM messages in John's voice: warm, direct, motivational, and personal — like a successful mentor texting a member he genuinely cares about. Keep messages concise (2-4 sentences max).

Today's date: ${today}

Respond ONLY with valid JSON in this exact format:
{
  "summary": "2-4 sentence executive summary of community activity this week",
  "propsTo": [
    {
      "userId": "string",
      "name": "string",
      "reason": "brief reason (1 sentence)",
      "message": "the DM message John will send"
    }
  ],
  "encourage": [
    {
      "userId": "string",
      "name": "string",
      "reason": "brief reason (1 sentence)",
      "message": "the DM message John will send"
    }
  ]
}

Only include members where there's a genuine reason to reach out. Quality over quantity.`;

    const userPrompt = `Here is this week's member activity data:\n\n${JSON.stringify(memberSummaries, null, 2)}\n\nGenerate the daily report.`;

    let analysisJson: { summary: string; propsTo: Array<{ userId: string; name: string; reason: string; message: string }>; encourage: Array<{ userId: string; name: string; reason: string; message: string }> } = {
      summary: 'Could not generate AI analysis. Check ANTHROPIC_API_KEY in Railway environment variables.',
      propsTo: [],
      encourage: [],
    };

    try {
      const rawResponse = await callClaude(systemPrompt, userPrompt);
      // Extract JSON from response (Claude sometimes wraps it in markdown code fences)
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisJson = JSON.parse(jsonMatch[0]);
      } else {
        // Claude returned text but not valid JSON — use the raw text as summary
        analysisJson = { summary: rawResponse.slice(0, 500), propsTo: [], encourage: [] };
      }
    } catch (aiErr) {
      console.error('Claude API error:', aiErr);
      // Surface the actual error so it's visible in the dashboard
      analysisJson.summary = `Claude API error: ${String(aiErr)}`;
    }

    // Build suggested outreach array
    const suggestedOutreach = [
      ...(analysisJson.propsTo || []).map(item => ({ ...item, type: 'props', approved: null, sent: false })),
      ...(analysisJson.encourage || []).map(item => ({ ...item, type: 'encourage', approved: null, sent: false })),
    ];

    // ── Store report in DB ──
    const { data: report, error: reportErr } = await supabaseAdmin
      .from('agent_reports')
      .insert({
        summary_text: analysisJson.summary,
        suggested_outreach: suggestedOutreach,
        status: 'pending',
        metadata: { memberCount: members?.length || 0, date: today },
      })
      .select('id')
      .single();

    if (reportErr) {
      console.error('Failed to save report:', reportErr);
    }

    const reportId = report?.id || 'unknown';
    const dashboardUrl = `${APP_URL}/admin/agent`;

    // ── Look up John and Christian ──
    const { data: johnProfile } = await supabaseAdmin
      .from('profiles').select('id, full_name').ilike('email', JOHN_EMAIL).single();
    const { data: christianProfile } = await supabaseAdmin
      .from('profiles').select('id, full_name').ilike('email', CHRISTIAN_EMAIL).single();

    // ── Send email to John ──
    const resend = new Resend(process.env.RESEND_API_KEY);
    const propsHtml = (analysisJson.propsTo || []).map(p =>
      `<li><strong>${p.name}</strong> — ${p.reason}</li>`
    ).join('');
    const encourageHtml = (analysisJson.encourage || []).map(p =>
      `<li><strong>${p.name}</strong> — ${p.reason}</li>`
    ).join('');

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@neuluma.com',
      to: JOHN_EMAIL,
      subject: `🏆 Winner's Circle Daily Report — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f5f5f5; padding: 32px; border-radius: 12px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
            <span style="font-size: 28px;">🏆</span>
            <div>
              <h1 style="margin: 0; font-size: 20px; color: #d4af37;">Winner's Circle</h1>
              <p style="margin: 0; font-size: 12px; color: #888;">AI Agent Daily Report · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div style="background: #161616; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 12px; font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">SUMMARY</h2>
            <p style="margin: 0; line-height: 1.7; color: #f5f5f5;">${analysisJson.summary}</p>
          </div>

          ${propsHtml ? `
          <div style="background: #0d1a0d; border: 1px solid #1a3a1a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 12px; font-size: 14px; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px;">🎉 GIVE PROPS TO</h2>
            <ul style="margin: 0; padding-left: 20px; line-height: 2; color: #f5f5f5;">${propsHtml}</ul>
          </div>` : ''}

          ${encourageHtml ? `
          <div style="background: #1a1000; border: 1px solid #3a2800; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 12px; font-size: 14px; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px;">💪 NEEDS A CHECK-IN</h2>
            <ul style="margin: 0; padding-left: 20px; line-height: 2; color: #f5f5f5;">${encourageHtml}</ul>
          </div>` : ''}

          <div style="text-align: center; margin-top: 24px;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #d4af37; color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
              Review & Approve Outreach →
            </a>
          </div>
          <p style="text-align: center; margin-top: 16px; font-size: 12px; color: #555;">
            ${suggestedOutreach.length} outreach message${suggestedOutreach.length !== 1 ? 's' : ''} ready for your review
          </p>
        </div>
      `,
    }).catch(err => console.error('Email send error:', err));

    // ── Send DM to Christian (as John) ──
    if (johnProfile && christianProfile) {
      const convId = await getOrCreateConversation(johnProfile.id, christianProfile.id);
      if (convId) {
        const shortSummary = analysisJson.summary;
        const propsCount = (analysisJson.propsTo || []).length;
        const encourageCount = (analysisJson.encourage || []).length;

        const dmText = `Hey Christian — here's today's member progress report (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}).\n\n${shortSummary}\n\n🎉 Members to give props: ${propsCount}\n💪 Members to check in on: ${encourageCount}\n\nHead to the Agent Dashboard to review the messages and approve outreach:\n${dashboardUrl}\n\nOr type a command here and I'll handle it.`;

        await sendDMAs(johnProfile.id, convId, dmText);
      }
    }

    return NextResponse.json({
      success: true,
      reportId,
      suggestedCount: suggestedOutreach.length,
      summary: analysisJson.summary,
    });
  } catch (err) {
    console.error('Daily report error:', err);
    return NextResponse.json({ error: 'Failed to generate report', details: String(err) }, { status: 500 });
  }
}

// Also allow POST (for manual triggering from dashboard)
export async function POST(req: NextRequest) {
  try {
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    // Auth check via header
    const authHeader = req.headers.get('x-admin-secret');
    if (authHeader !== process.env.AGENT_CRON_SECRET && process.env.AGENT_CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Re-use GET logic
    return GET(req);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
