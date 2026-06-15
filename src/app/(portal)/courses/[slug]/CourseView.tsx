'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, getTierLabel } from '@/types';
import Link from 'next/link';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  duration_seconds?: number;
  sort_order: number;
  is_published: boolean;
}

interface Course {
  id: string;
  title: string;
  description?: string;
  intro_video_url?: string;
  thumbnail_url?: string;
  tier_required: string;
  hide_intro?: boolean;
  lessons?: Lesson[];
}

interface Props {
  course: Course;
  profile: Profile;
  completedLessonIds: string[];
  accessible: boolean;
}

function getEmbedUrl(url: string): { type: 'youtube' | 'vimeo' | 'direct'; src: string } {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: 'youtube', src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1` };
  // Vimeo — unlisted videos require a privacy hash, which can appear either as
  // a path segment (vimeo.com/ID/HASH) or a query param (?h=HASH). Without it,
  // Vimeo shows "Sorry, we're having a little trouble."
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?/);
  if (vimeoMatch) {
    const id = vimeoMatch[1];
    const hParam = url.match(/[?&]h=([a-zA-Z0-9]+)/);
    const hash = hParam?.[1] || vimeoMatch[2];
    return { type: 'vimeo', src: `https://player.vimeo.com/video/${id}?dnt=1${hash ? `&h=${hash}` : ''}` };
  }
  // Direct file
  return { type: 'direct', src: url };
}

function formatDuration(secs?: number) {
  if (!secs) return '';
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CourseView({ course, profile, completedLessonIds, accessible }: Props) {
  const supabase = createClient();
  const lessons = [...(course.lessons || [])].filter(l => l.is_published).sort((a, b) => a.sort_order - b.sort_order);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedLessonIds));
  const [marking, setMarking] = useState(false);

  const currentVideo = activeLesson ? activeLesson.video_url : course.intro_video_url;
  const currentTitle = activeLesson ? activeLesson.title : (course.hide_intro ? course.title : 'Course Introduction');
  const currentDesc = activeLesson ? activeLesson.description : course.description;
  const completedCount = lessons.filter(l => completed.has(l.id)).length;
  const pct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  async function markComplete(lesson: Lesson) {
    if (completed.has(lesson.id) || marking) return;
    setMarking(true);
    await supabase.from('course_progress').upsert({
      user_id: profile.id,
      lesson_id: lesson.id,
    }, { onConflict: 'user_id,lesson_id' });
    setCompleted(prev => new Set([...prev, lesson.id]));
    setMarking(false);
    // Auto-advance to next lesson
    const idx = lessons.findIndex(l => l.id === lesson.id);
    if (idx < lessons.length - 1) {
      setTimeout(() => setActiveLesson(lessons[idx + 1]), 400);
    }
  }

  async function markIncomplete(lesson: Lesson) {
    await supabase.from('course_progress').delete()
      .eq('user_id', profile.id)
      .eq('lesson_id', lesson.id);
    setCompleted(prev => { const s = new Set(prev); s.delete(lesson.id); return s; });
  }

  if (!accessible) {
    return (
      <div style={{ padding: '64px 24px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ marginBottom: '8px' }}>{course.title}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '24px', fontSize: '14px' }}>
          This course is available to {getTierLabel(course.tier_required as 'free' | 'core' | 'elite' | 'founding')}+ members.
        </p>
        <Link href="/upgrade" className="btn-gold" style={{ padding: '12px 28px', display: 'inline-block' }}>
          Upgrade Membership
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--topbar-h))', overflow: 'hidden' }} className="course-layout">
      {/* ── Sidebar — lesson list ── */}
      <aside style={{
        width: '300px', flexShrink: 0, borderRight: '1px solid var(--border)',
        overflowY: 'auto', background: 'var(--black-card)', display: 'flex', flexDirection: 'column',
      }} className="course-sidebar">
        {/* Course header */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <Link href="/courses" style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none', display: 'block', marginBottom: '8px' }}>
            ← All Courses
          </Link>
          <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 10px', lineHeight: 1.3 }}>{course.title}</h2>
          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '6px', background: '#1e1e1e', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : 'var(--gold)', transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: '11px', color: pct === 100 ? '#22c55e' : 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {completedCount}/{lessons.length}
            </span>
          </div>
        </div>

        {/* Intro / course overview */}
        <button
          onClick={() => setActiveLesson(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px', background: activeLesson === null ? 'var(--gold-dim)' : 'none',
            border: 'none', borderBottom: '1px solid var(--border)',
            cursor: 'pointer', textAlign: 'left', width: '100%',
          }}
        >
          <span style={{ fontSize: '16px', flexShrink: 0 }}>▶</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: activeLesson === null ? 700 : 500, color: activeLesson === null ? 'var(--gold)' : 'var(--text)' }}>
              {course.hide_intro ? 'Overview' : 'Course Introduction'}
            </div>
            {course.intro_video_url && (
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Intro video</div>
            )}
          </div>
        </button>

        {/* Lessons */}
        {lessons.map((lesson, idx) => {
          const isDone = completed.has(lesson.id);
          const isActive = activeLesson?.id === lesson.id;
          return (
            <button
              key={lesson.id}
              onClick={() => setActiveLesson(lesson)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px 16px', background: isActive ? 'var(--gold-dim)' : 'none',
                border: 'none', borderBottom: '1px solid var(--border)',
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              {/* Completion circle */}
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                border: `2px solid ${isDone ? '#22c55e' : isActive ? 'var(--gold)' : '#333'}`,
                background: isDone ? '#22c55e' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px',
              }}>
                {isDone ? '✓' : <span style={{ color: '#555', fontSize: '10px' }}>{idx + 1}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--gold)' : isDone ? '#888' : 'var(--text)', lineHeight: 1.4 }}>
                  {lesson.title}
                </div>
                {lesson.duration_seconds && (
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{formatDuration(lesson.duration_seconds)}</div>
                )}
              </div>
            </button>
          );
        })}
      </aside>

      {/* ── Main — video + info ── */}
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--black-bg)' }}>
        {/* Video player */}
        <div style={{ background: '#000', position: 'relative', paddingTop: '56.25%' }}>
          {currentVideo ? (() => {
            const embed = getEmbedUrl(currentVideo);
            if (embed.type === 'direct') {
              return (
                <video key={currentVideo} src={embed.src} controls
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
              );
            }
            return (
              <iframe key={currentVideo} src={embed.src}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            );
          })() : course.thumbnail_url ? (
            // No video for this view (e.g. a no-intro course overview) — show the
            // course thumbnail instead of an empty player.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnail_url}
              alt={course.title}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
          ) : (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#555' }}>
              <span style={{ fontSize: '48px' }}>🎬</span>
              <span style={{ fontSize: '14px' }}>No video added yet</span>
            </div>
          )}
        </div>

        {/* Lesson info */}
        <div style={{ padding: '24px 28px', maxWidth: '760px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{currentTitle}</h1>
            {activeLesson && (
              <div style={{ flexShrink: 0 }}>
                {completed.has(activeLesson.id) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>✓ Completed</span>
                    <button onClick={() => markIncomplete(activeLesson)}
                      style={{ background: 'none', border: '1px solid #333', borderRadius: '6px', padding: '5px 10px', color: '#666', fontSize: '11px', cursor: 'pointer' }}>
                      Undo
                    </button>
                  </div>
                ) : (
                  <button onClick={() => markComplete(activeLesson)} disabled={marking}
                    className="btn-gold" style={{ padding: '8px 18px', fontSize: '13px' }}>
                    {marking ? 'Saving…' : '✓ Mark Complete'}
                  </button>
                )}
              </div>
            )}
          </div>

          {currentDesc && (
            <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>{currentDesc}</p>
          )}

          {/* Completion celebration */}
          {pct === 100 && (
            <div style={{ marginTop: '24px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
              <div style={{ fontWeight: 700, color: '#22c55e', marginBottom: '4px' }}>Course Complete!</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>You&apos;ve finished all lessons in this course.</div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .course-layout { flex-direction: column; height: auto; overflow: visible; }
          .course-sidebar { width: 100% !important; height: auto; border-right: none !important; border-bottom: 1px solid var(--border); }
        }
      `}</style>
    </div>
  );
}
