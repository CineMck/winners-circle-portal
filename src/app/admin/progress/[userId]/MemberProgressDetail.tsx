'use client';
import { useState } from 'react';
import Link from 'next/link';
import { getTierColor, getTierLabel, getInitials } from '@/types';

interface Lesson {
  id: string;
  title: string;
  sort_order: number;
  duration_seconds?: number;
  completed: boolean;
  completed_at: string | null;
}

interface CourseData {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  tier_required: string;
  lessons: Lesson[];
  completedCount: number;
  totalLessons: number;
  pct: number;
}

interface Checkin {
  challenge_id: string;
  check_date: string;
  tasks_completed: unknown[];
  metric_value: number | null;
  notes: string | null;
  created_at: string;
}

interface ChallengeData {
  id: string;
  title: string;
  description?: string;
  target_metric?: string;
  metric_unit?: string;
  duration_days?: number;
  badge_icon?: string;
  badge_name?: string;
  xp_reward?: number;
  participationStatus: string;
  enrolledAt: string;
  completedAt?: string;
  checkins: Checkin[];
  streak: number;
  totalCheckins: number;
}

interface Member {
  id: string;
  full_name: string;
  avatar_url?: string;
  tier: string;
  username: string;
  email: string;
  bio?: string;
  created_at: string;
}

interface Props {
  member: Member;
  courseData: CourseData[];
  challengeData: ChallengeData[];
}

function ProgressBar({ pct, height = 8 }: { pct: number; height?: number }) {
  const color = pct === 100 ? '#10b981' : pct > 50 ? 'var(--gold)' : '#3b82f6';
  return (
    <div style={{ width: '100%', height, background: '#2a2a2a', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'width 0.4s ease' }} />
    </div>
  );
}

function formatDuration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MemberProgressDetail({ member, courseData, challengeData }: Props) {
  const [activeTab, setActiveTab] = useState<'courses' | 'challenges'>('courses');
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);

  const tc = getTierColor(member.tier as 'free' | 'core' | 'elite' | 'founding');
  const totalLessons = courseData.reduce((s, c) => s + c.totalLessons, 0);
  const completedLessons = courseData.reduce((s, c) => s + c.completedCount, 0);
  const totalCheckins = challengeData.reduce((s, c) => s + c.totalCheckins, 0);

  return (
    <div style={{ padding: '32px' }}>
      {/* Back */}
      <Link href="/admin/progress" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '13px', textDecoration: 'none', marginBottom: '20px' }}>
        ← Back to Progress Overview
      </Link>

      {/* Member header */}
      <div style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gold-dim)', border: `3px solid ${tc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: tc, overflow: 'hidden', flexShrink: 0 }}>
          {member.avatar_url ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(member.full_name || '?')}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px' }}>{member.full_name}</h1>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            <span style={{ color: tc, fontWeight: 700 }}>{getTierLabel(member.tier as 'free'|'core'|'elite'|'founding')}</span>
            {' · '}@{member.username}{' · '}{member.email}
          </div>
          {member.bio && <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px', maxWidth: '500px' }}>{member.bio}</div>}
        </div>
        {/* Quick stats */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {[
            { label: 'Joined', value: formatDate(member.created_at) },
            { label: 'Lessons Done', value: `${completedLessons}/${totalLessons}` },
            { label: 'Challenges', value: String(challengeData.length) },
            { label: 'Check-ins', value: String(totalCheckins) },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gold)' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '1px solid var(--border)' }}>
        {(['courses', 'challenges'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? 'var(--gold)' : 'var(--muted)',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--gold)' : 'transparent'}`,
              marginBottom: '-1px', transition: 'all 0.15s',
            }}
          >
            {tab === 'courses' ? `📚 Courses (${courseData.length})` : `🎯 Challenges (${challengeData.length})`}
          </button>
        ))}
      </div>

      {/* ── COURSES TAB ── */}
      {activeTab === 'courses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {courseData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)', fontSize: '14px' }}>
              This member hasn&apos;t started any courses yet.
            </div>
          )}
          {courseData.map(course => {
            const isExpanded = expandedCourse === course.id;
            const statusColor = course.pct === 100 ? '#10b981' : course.completedCount > 0 ? 'var(--gold)' : 'var(--muted)';
            const statusLabel = course.pct === 100 ? '✅ Completed' : course.completedCount > 0 ? '▶ In Progress' : '○ Not Started';
            return (
              <div key={course.id} style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                {/* Course header */}
                <div
                  onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
                  style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{course.title}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: statusColor }}>{statusLabel}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, maxWidth: '300px' }}>
                        <ProgressBar pct={course.pct} />
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {course.completedCount}/{course.totalLessons} lessons · {course.pct}%
                      </span>
                    </div>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '16px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
                </div>

                {/* Lesson list */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {course.lessons.map((lesson, i) => (
                      <div key={lesson.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 20px',
                        borderBottom: i < course.lessons.length - 1 ? '1px solid #1a1a1a' : 'none',
                        background: lesson.completed ? '#0d1a0d' : 'transparent',
                      }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: lesson.completed ? '#10b981' : '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>
                          {lesson.completed ? '✓' : <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{i + 1}</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', color: lesson.completed ? 'var(--text)' : 'var(--muted)', fontWeight: lesson.completed ? 500 : 400 }}>
                            {lesson.title}
                          </div>
                          {lesson.completed && lesson.completed_at && (
                            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
                              Completed {formatDate(lesson.completed_at)}
                            </div>
                          )}
                        </div>
                        {lesson.duration_seconds && (
                          <span style={{ fontSize: '11px', color: 'var(--muted)', flexShrink: 0 }}>{formatDuration(lesson.duration_seconds)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CHALLENGES TAB ── */}
      {activeTab === 'challenges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {challengeData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)', fontSize: '14px' }}>
              This member hasn&apos;t joined any challenges yet.
            </div>
          )}
          {challengeData.map(ch => {
            const isExpanded = expandedChallenge === ch.id;
            const statusColor = ch.participationStatus === 'completed' ? '#10b981' : ch.totalCheckins > 0 ? 'var(--gold)' : 'var(--muted)';
            const statusLabel = ch.participationStatus === 'completed' ? '✅ Completed' : ch.totalCheckins > 0 ? '▶ Active' : '○ Enrolled';

            // Sort checkins by date descending (already sorted from server)
            const sortedCheckins = [...ch.checkins].sort((a, b) => b.check_date.localeCompare(a.check_date));

            return (
              <div key={ch.id} style={{ background: 'var(--black-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                {/* Challenge header */}
                <div
                  onClick={() => setExpandedChallenge(isExpanded ? null : ch.id)}
                  style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '16px' }}
                >
                  {ch.badge_icon && (
                    <div style={{ fontSize: '28px', flexShrink: 0 }}>{ch.badge_icon}</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{ch.title}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: statusColor }}>{statusLabel}</span>
                      {ch.xp_reward && <span style={{ fontSize: '11px', color: 'var(--gold)', background: 'var(--gold-dim)', padding: '2px 8px', borderRadius: '12px' }}>+{ch.xp_reward} XP</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Enrolled {formatDate(ch.enrolledAt)}</span>
                      <span style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 600 }}>{ch.totalCheckins} check-ins</span>
                      {ch.streak > 0 && <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 600 }}>🔥 {ch.streak}-day streak</span>}
                      {ch.completedAt && <span style={{ fontSize: '12px', color: '#10b981' }}>Completed {formatDate(ch.completedAt)}</span>}
                    </div>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '16px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▾</span>
                </div>

                {/* Check-in history */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {sortedCheckins.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                        No check-ins recorded yet.
                      </div>
                    ) : (
                      <>
                        {/* Metric header if applicable */}
                        {ch.target_metric && (
                          <div style={{ padding: '12px 20px', background: '#0d0d0d', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)' }}>
                            Tracking: <strong style={{ color: 'var(--text)' }}>{ch.target_metric}</strong>
                            {ch.metric_unit && ` (${ch.metric_unit})`}
                          </div>
                        )}
                        <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                          {sortedCheckins.map((checkin, i) => {
                            const tasks = Array.isArray(checkin.tasks_completed) ? checkin.tasks_completed : [];
                            return (
                              <div key={i} style={{
                                padding: '12px 20px',
                                borderBottom: i < sortedCheckins.length - 1 ? '1px solid #1a1a1a' : 'none',
                                display: 'flex', alignItems: 'flex-start', gap: '12px',
                              }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', marginTop: '5px', flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: checkin.notes || checkin.metric_value != null ? '4px' : 0 }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                                      {new Date(checkin.check_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>
                                    {checkin.metric_value != null && (
                                      <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>
                                        {checkin.metric_value} {ch.metric_unit || ''}
                                      </span>
                                    )}
                                    {tasks.length > 0 && (
                                      <span style={{ fontSize: '11px', color: '#10b981' }}>
                                        {tasks.length} task{tasks.length !== 1 ? 's' : ''} done
                                      </span>
                                    )}
                                  </div>
                                  {checkin.notes && (
                                    <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                                      &ldquo;{checkin.notes}&rdquo;
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
