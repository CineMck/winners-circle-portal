'use client';
import Link from 'next/link';
import { Profile, getTierColor, getTierLabel } from '@/types';

interface CourseLesson { id: string; is_published: boolean; }
interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail_url?: string;
  tier_required: string;
  lessons?: CourseLesson[];
}

interface Props {
  profile: Profile;
  courses: Course[];
  completedLessonIds: string[];
}

const TIER_ORDER: Record<string, number> = { free: 0, core: 1, elite: 2, founding: 3 };
function canAccess(userTier: string, required: string) {
  return (TIER_ORDER[userTier] ?? 0) >= (TIER_ORDER[required] ?? 0);
}

export default function CoursesPage({ profile, courses, completedLessonIds }: Props) {
  const completed = new Set(completedLessonIds);

  return (
    <div style={{ maxWidth: '1000px', padding: '32px 24px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>🎓 Courses</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px' }}>
          Learn from in-depth video courses built for high-performers.
        </p>
      </div>

      {courses.length === 0 && (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
          <h3 style={{ marginBottom: '8px' }}>Courses coming soon</h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Check back — new courses will appear here.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {courses.map(course => {
          const publishedLessons = (course.lessons || []).filter(l => l.is_published);
          const completedCount = publishedLessons.filter(l => completed.has(l.id)).length;
          const total = publishedLessons.length;
          const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
          const accessible = canAccess(profile?.tier || 'free', course.tier_required);
          const tierColor = getTierColor(course.tier_required as 'free' | 'core' | 'elite' | 'founding');

          return (
            <Link
              key={course.id}
              href={accessible ? `/courses/${course.slug}` : '/upgrade'}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div className="card" style={{
                overflow: 'hidden', transition: 'border-color 0.15s',
                opacity: accessible ? 1 : 0.6,
                cursor: 'pointer',
              }}>
                {/* Thumbnail */}
                <div style={{ height: '160px', background: '#161616', position: 'relative', overflow: 'hidden' }}>
                  {course.thumbnail_url
                    ? <img src={course.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#161616,#0d0d0d)' }}>
                        <span style={{ fontSize: '48px' }}>🎓</span>
                      </div>
                    )}
                  {/* Tier badge */}
                  {course.tier_required !== 'free' && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', border: `1px solid ${tierColor}`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, color: tierColor }}>
                      {accessible ? '' : '🔒 '}{getTierLabel(course.tier_required as 'free' | 'core' | 'elite' | 'founding')}+
                    </div>
                  )}
                  {/* Progress overlay */}
                  {pct > 0 && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: '#1e1e1e' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : 'var(--gold)', transition: 'width 0.3s' }} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: 'var(--text)' }}>{course.title}</h3>
                  {course.description && (
                    <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {course.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {total} lesson{total !== 1 ? 's' : ''}
                    </span>
                    {completedCount > 0 && (
                      <span style={{ fontSize: '12px', color: pct === 100 ? '#22c55e' : 'var(--gold)', fontWeight: 600 }}>
                        {pct === 100 ? '✓ Complete' : `${pct}% done`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
