'use client';
import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { uploadToStorage } from '@/lib/upload';

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
  slug: string;
  description?: string;
  intro_video_url?: string;
  thumbnail_url?: string;
  tier_required: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  hide_intro?: boolean;
  lessons?: Lesson[];
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#161616', border: '1px solid #2a2a2a',
  borderRadius: '8px', padding: '10px 14px', color: '#fff',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: '#888',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  marginBottom: '6px', display: 'block',
};

export default function CoursesAdmin({ courses: initial, adminId }: { courses: Course[]; adminId: string }) {
  const [courses, setCourses] = useState<Course[]>(initial);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const supabase = createClient();

  // New course form
  const [courseForm, setCourseForm] = useState({
    title: '', description: '', tier_required: 'free', sort_order: 0,
  });

  // New lesson form (keyed by course id)
  const [lessonForms, setLessonForms] = useState<Record<string, { title: string; description: string }>>({});

  // Video URL inputs (keyed by courseId or lessonId)
  const [videoUrlInputs, setVideoUrlInputs] = useState<Record<string, string>>({});
  const [showUrlInput, setShowUrlInput] = useState<Record<string, boolean>>({});

  const thumbRef = useRef<HTMLInputElement>(null);
  const introRef = useRef<HTMLInputElement>(null);
  const lessonVideoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Upload helper ──────────────────────────────────────────
  // Direct-to-storage upload (no /api/upload proxy) so large course videos
  // don't get buffered into the server's memory or hit Railway timeouts.
  // RLS path layout is courses/<adminId>/<file>, so userId must be the admin's uid.
  async function uploadFile(file: File, userId: string): Promise<string | null> {
    try {
      const { url } = await uploadToStorage({ file, fileName: file.name, folder: 'courses', userId });
      return url;
    } catch (err) {
      console.error('Course upload failed:', err);
      return null;
    }
  }

  // ── Create course ──────────────────────────────────────────
  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const slug = courseForm.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { data, error } = await supabase
      .from('courses')
      .insert({ ...courseForm, slug, created_by: adminId })
      .select('*, lessons:course_lessons(*)')
      .single();
    if (!error && data) {
      setCourses(prev => [data as Course, ...prev]);
      setCourseForm({ title: '', description: '', tier_required: 'free', sort_order: 0 });
      setShowNewCourse(false);
      setExpandedCourse(data.id);
    }
    setSaving(false);
  }

  // ── Toggle publish course ──────────────────────────────────
  async function togglePublish(course: Course) {
    const { data } = await supabase
      .from('courses')
      .update({ is_published: !course.is_published })
      .eq('id', course.id)
      .select('*')
      .single();
    if (data) setCourses(prev => prev.map(c => c.id === course.id ? { ...c, is_published: !course.is_published } : c));
  }

  // ── Delete course ──────────────────────────────────────────
  async function deleteCourse(courseId: string) {
    if (!confirm('Delete this course and all its lessons? This cannot be undone.')) return;
    await supabase.from('courses').delete().eq('id', courseId);
    setCourses(prev => prev.filter(c => c.id !== courseId));
  }

  // ── Upload thumbnail ───────────────────────────────────────
  async function handleThumbnail(courseId: string, file: File) {
    setUploading(`thumb-${courseId}`);
    const url = await uploadFile(file, adminId);
    if (url) {
      await supabase.from('courses').update({ thumbnail_url: url }).eq('id', courseId);
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, thumbnail_url: url } : c));
    }
    setUploading(null);
  }

  // ── Upload intro video ─────────────────────────────────────
  async function handleIntroVideo(courseId: string, file: File) {
    setUploading(`intro-${courseId}`);
    const url = await uploadFile(file, adminId);
    if (url) {
      await supabase.from('courses').update({ intro_video_url: url }).eq('id', courseId);
      setCourses(prev => prev.map(c => c.id === courseId ? { ...c, intro_video_url: url } : c));
    }
    setUploading(null);
  }

  // ── Save intro video URL ───────────────────────────────────
  async function saveIntroUrl(courseId: string) {
    const url = videoUrlInputs[`intro-url-${courseId}`]?.trim();
    if (!url) return;
    await supabase.from('courses').update({ intro_video_url: url }).eq('id', courseId);
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, intro_video_url: url } : c));
    setShowUrlInput(prev => ({ ...prev, [`intro-${courseId}`]: false }));
    setVideoUrlInputs(prev => ({ ...prev, [`intro-url-${courseId}`]: '' }));
  }

  // ── Toggle whether the course shows an intro section ───────
  async function toggleHideIntro(courseId: string, hide: boolean) {
    await supabase.from('courses').update({ hide_intro: hide }).eq('id', courseId);
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, hide_intro: hide } : c));
  }

  // ── Save lesson video URL ──────────────────────────────────
  async function saveLessonUrl(courseId: string, lessonId: string) {
    const url = videoUrlInputs[`lesson-url-${lessonId}`]?.trim();
    if (!url) return;
    await supabase.from('course_lessons').update({ video_url: url }).eq('id', lessonId);
    setCourses(prev => prev.map(c =>
      c.id === courseId
        ? { ...c, lessons: (c.lessons || []).map(l => l.id === lessonId ? { ...l, video_url: url } : l) }
        : c
    ));
    setShowUrlInput(prev => ({ ...prev, [`lesson-${lessonId}`]: false }));
    setVideoUrlInputs(prev => ({ ...prev, [`lesson-url-${lessonId}`]: '' }));
  }

  // ── Add lesson ─────────────────────────────────────────────
  async function addLesson(courseId: string) {
    const form = lessonForms[courseId];
    if (!form?.title?.trim()) return;
    setSaving(true);
    const existingLessons = courses.find(c => c.id === courseId)?.lessons || [];
    const sort_order = existingLessons.length;
    const { data, error } = await supabase
      .from('course_lessons')
      .insert({ course_id: courseId, title: form.title.trim(), description: form.description, sort_order })
      .select('*')
      .single();
    if (!error && data) {
      setCourses(prev => prev.map(c =>
        c.id === courseId ? { ...c, lessons: [...(c.lessons || []), data as Lesson] } : c
      ));
      setLessonForms(prev => ({ ...prev, [courseId]: { title: '', description: '' } }));
    }
    setSaving(false);
  }

  // ── Upload lesson video ────────────────────────────────────
  async function handleLessonVideo(courseId: string, lessonId: string, file: File) {
    setUploading(`lesson-${lessonId}`);
    const url = await uploadFile(file, adminId);
    if (url) {
      await supabase.from('course_lessons').update({ video_url: url }).eq('id', lessonId);
      setCourses(prev => prev.map(c =>
        c.id === courseId
          ? { ...c, lessons: (c.lessons || []).map(l => l.id === lessonId ? { ...l, video_url: url } : l) }
          : c
      ));
    }
    setUploading(null);
  }

  // ── Delete lesson ──────────────────────────────────────────
  async function deleteLesson(courseId: string, lessonId: string) {
    if (!confirm('Delete this lesson?')) return;
    await supabase.from('course_lessons').delete().eq('id', lessonId);
    setCourses(prev => prev.map(c =>
      c.id === courseId ? { ...c, lessons: (c.lessons || []).filter(l => l.id !== lessonId) } : c
    ));
  }

  // ── Move lesson up/down ────────────────────────────────────
  async function moveLesson(courseId: string, lessonId: string, direction: 'up' | 'down') {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    const lessons = [...(course.lessons || [])].sort((a, b) => a.sort_order - b.sort_order);
    const idx = lessons.findIndex(l => l.id === lessonId);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === lessons.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    // Swap sort orders
    const updated = [...lessons];
    [updated[idx].sort_order, updated[swapIdx].sort_order] = [updated[swapIdx].sort_order, updated[idx].sort_order];
    // Persist both
    await Promise.all([
      supabase.from('course_lessons').update({ sort_order: updated[idx].sort_order }).eq('id', updated[idx].id),
      supabase.from('course_lessons').update({ sort_order: updated[swapIdx].sort_order }).eq('id', updated[swapIdx].id),
    ]);
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, lessons: updated } : c));
  }

  function formatDuration(secs?: number) {
    if (!secs) return '';
    const m = Math.floor(secs / 60), s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>🎓 Courses</h1>
          <p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0' }}>
            {courses.length} course{courses.length !== 1 ? 's' : ''} · {courses.filter(c => c.is_published).length} published
          </p>
        </div>
        <button onClick={() => setShowNewCourse(!showNewCourse)} className="btn-gold" style={{ padding: '10px 20px', fontSize: '13px' }}>
          {showNewCourse ? '× Cancel' : '+ New Course'}
        </button>
      </div>

      {/* New course form */}
      {showNewCourse && (
        <div style={{ background: '#111', border: '1px solid #c9a84c', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 20px', color: '#c9a84c', fontSize: '15px', fontWeight: 700 }}>New Course</h3>
          <form onSubmit={createCourse} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Course Title *</label>
              <input style={inputStyle} value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="e.g. Mindset Mastery" required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="What members will learn…" />
            </div>
            <div>
              <label style={labelStyle}>Tier Required</label>
              <select style={inputStyle} value={courseForm.tier_required} onChange={e => setCourseForm({ ...courseForm, tier_required: e.target.value })}>
                <option value="free">Free (all members)</option>
                <option value="core">Core+</option>
                <option value="elite">Elevate+</option>
                <option value="founding">1-1 Elite Only</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sort Order</label>
              <input type="number" style={inputStyle} value={courseForm.sort_order} onChange={e => setCourseForm({ ...courseForm, sort_order: Number(e.target.value) })} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" disabled={saving} className="btn-gold" style={{ padding: '12px 28px' }}>
                {saving ? 'Creating…' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      )}

      {courses.length === 0 && !showNewCourse && (
        <div style={{ textAlign: 'center', padding: '64px', color: '#555' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎓</div>
          <p>No courses yet. Create your first one above.</p>
        </div>
      )}

      {/* Course cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {courses.map(course => {
          const isExpanded = expandedCourse === course.id;
          const lessons = [...(course.lessons || [])].sort((a, b) => a.sort_order - b.sort_order);
          const lf = lessonForms[course.id] || { title: '', description: '' };

          return (
            <div key={course.id} style={{ background: '#111', border: `1px solid ${isExpanded ? '#c9a84c' : '#1e1e1e'}`, borderRadius: '12px', overflow: 'hidden' }}>
              {/* Course header */}
              <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
                onClick={() => setExpandedCourse(isExpanded ? null : course.id)}>
                {/* Thumbnail */}
                <div style={{ width: 72, height: 48, borderRadius: '8px', background: '#161616', border: '1px solid #2a2a2a', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {course.thumbnail_url
                    ? <img src={course.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '22px' }}>🎓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{course.title}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>
                    {lessons.length} lesson{lessons.length !== 1 ? 's' : ''} · {course.tier_required} · {course.is_published ? <span style={{ color: '#22c55e' }}>Published</span> : <span style={{ color: '#f59e0b' }}>Draft</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => togglePublish(course)} style={{
                    padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, border: 'none',
                    background: course.is_published ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                    color: course.is_published ? '#ef4444' : '#22c55e',
                  }}>
                    {course.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => deleteCourse(course.id)} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: '1px solid rgba(239,68,68,0.3)', background: 'none', color: '#ef4444' }}>
                    Delete
                  </button>
                  <span style={{ color: '#555', fontSize: '18px', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                </div>
              </div>

              {/* Expanded editor */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid #1e1e1e', padding: '24px' }}>
                  {/* Media uploads */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
                    {/* Thumbnail */}
                    <div>
                      <label style={labelStyle}>Course Thumbnail</label>
                      <div style={{ background: '#161616', border: '1px dashed #2a2a2a', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                        {course.thumbnail_url && (
                          <img src={course.thumbnail_url} alt="" style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} />
                        )}
                        <input ref={thumbRef} type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={e => e.target.files?.[0] && handleThumbnail(course.id, e.target.files[0])} />
                        <button onClick={() => thumbRef.current?.click()} disabled={uploading === `thumb-${course.id}`}
                          style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '6px 14px', color: '#888', fontSize: '12px', cursor: 'pointer' }}>
                          {uploading === `thumb-${course.id}` ? 'Uploading…' : course.thumbnail_url ? '🔄 Replace' : '📷 Upload'}
                        </button>
                      </div>
                    </div>
                    {/* Intro video */}
                    <div>
                      <label style={labelStyle}>Intro Video</label>
                      <div style={{ background: '#161616', border: '1px dashed #2a2a2a', borderRadius: '8px', padding: '16px' }}>
                        {course.intro_video_url && !showUrlInput[`intro-${course.id}`] && (
                          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#22c55e', wordBreak: 'break-all' }}>
                            ✓ {course.intro_video_url.length > 50 ? course.intro_video_url.slice(0, 50) + '…' : course.intro_video_url}
                          </div>
                        )}
                        {showUrlInput[`intro-${course.id}`] ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              style={{ ...inputStyle, flex: 1, fontSize: '12px', padding: '7px 10px' }}
                              placeholder="Paste YouTube, Vimeo, or direct video URL…"
                              value={videoUrlInputs[`intro-url-${course.id}`] || ''}
                              onChange={e => setVideoUrlInputs(prev => ({ ...prev, [`intro-url-${course.id}`]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && saveIntroUrl(course.id)}
                              autoFocus
                            />
                            <button onClick={() => saveIntroUrl(course.id)}
                              style={{ background: '#c9a84c', border: 'none', borderRadius: '6px', padding: '7px 12px', color: '#0a0a0a', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              Save
                            </button>
                            <button onClick={() => setShowUrlInput(prev => ({ ...prev, [`intro-${course.id}`]: false }))}
                              style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '7px 10px', color: '#888', fontSize: '12px', cursor: 'pointer' }}>
                              ×
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <input ref={introRef} type="file" accept="video/*" style={{ display: 'none' }}
                              onChange={e => e.target.files?.[0] && handleIntroVideo(course.id, e.target.files[0])} />
                            <button onClick={() => introRef.current?.click()} disabled={uploading === `intro-${course.id}`}
                              style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '6px 12px', color: '#888', fontSize: '12px', cursor: 'pointer' }}>
                              {uploading === `intro-${course.id}` ? 'Uploading…' : '⬆ Upload File'}
                            </button>
                            <button onClick={() => setShowUrlInput(prev => ({ ...prev, [`intro-${course.id}`]: true }))}
                              style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '6px 12px', color: '#888', fontSize: '12px', cursor: 'pointer' }}>
                              🔗 Paste URL
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* No-intro toggle — for single-video courses */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', margin: '0 0 24px', cursor: 'pointer', fontSize: '13px', color: '#bbb', lineHeight: 1.5 }}>
                    <input
                      type="checkbox"
                      checked={!!course.hide_intro}
                      onChange={e => toggleHideIntro(course.id, e.target.checked)}
                      style={{ marginTop: '2px', width: 16, height: 16, accentColor: '#c9a84c', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <span><strong style={{ color: '#fff' }}>No intro video</strong> — hide the &ldquo;Course Introduction&rdquo; section and open straight to the first lesson (for single-video courses).</span>
                  </label>

                  {/* Lessons list */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                      Lessons ({lessons.length})
                    </div>

                    {lessons.length === 0 && (
                      <p style={{ color: '#555', fontSize: '13px' }}>No lessons yet. Add the first one below.</p>
                    )}

                    {lessons.map((lesson, idx) => (
                      <div key={lesson.id} style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {/* Order controls */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '2px' }}>
                          <button onClick={() => moveLesson(course.id, lesson.id, 'up')} disabled={idx === 0}
                            style={{ background: 'none', border: 'none', color: idx === 0 ? '#333' : '#666', cursor: idx === 0 ? 'default' : 'pointer', fontSize: '12px', padding: '1px 4px' }}>▲</button>
                          <span style={{ fontSize: '11px', color: '#555', textAlign: 'center' }}>{idx + 1}</span>
                          <button onClick={() => moveLesson(course.id, lesson.id, 'down')} disabled={idx === lessons.length - 1}
                            style={{ background: 'none', border: 'none', color: idx === lessons.length - 1 ? '#333' : '#666', cursor: idx === lessons.length - 1 ? 'default' : 'pointer', fontSize: '12px', padding: '1px 4px' }}>▼</button>
                        </div>

                        {/* Lesson info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{lesson.title}</div>
                          {lesson.description && <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{lesson.description}</div>}
                          <div style={{ marginTop: '8px' }}>
                            {showUrlInput[`lesson-${lesson.id}`] ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <input
                                  style={{ ...inputStyle, flex: 1, fontSize: '12px', padding: '6px 10px' }}
                                  placeholder="Paste YouTube, Vimeo, or direct video URL…"
                                  value={videoUrlInputs[`lesson-url-${lesson.id}`] || ''}
                                  onChange={e => setVideoUrlInputs(prev => ({ ...prev, [`lesson-url-${lesson.id}`]: e.target.value }))}
                                  onKeyDown={e => e.key === 'Enter' && saveLessonUrl(course.id, lesson.id)}
                                  autoFocus
                                />
                                <button onClick={() => saveLessonUrl(course.id, lesson.id)}
                                  style={{ background: '#c9a84c', border: 'none', borderRadius: '6px', padding: '6px 10px', color: '#0a0a0a', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                                  Save
                                </button>
                                <button onClick={() => setShowUrlInput(prev => ({ ...prev, [`lesson-${lesson.id}`]: false }))}
                                  style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '6px 8px', color: '#888', fontSize: '11px', cursor: 'pointer' }}>
                                  ×
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {lesson.video_url
                                  ? <span style={{ fontSize: '11px', color: '#22c55e' }}>✓ Video set{lesson.duration_seconds ? ` · ${formatDuration(lesson.duration_seconds)}` : ''}</span>
                                  : <span style={{ fontSize: '11px', color: '#f59e0b' }}>⚠ No video yet</span>
                                }
                                <input
                                  ref={el => { lessonVideoRefs.current[lesson.id] = el; }}
                                  type="file" accept="video/*" style={{ display: 'none' }}
                                  onChange={e => e.target.files?.[0] && handleLessonVideo(course.id, lesson.id, e.target.files[0])}
                                />
                                <button onClick={() => lessonVideoRefs.current[lesson.id]?.click()}
                                  disabled={uploading === `lesson-${lesson.id}`}
                                  style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: '5px', padding: '3px 10px', color: '#888', fontSize: '11px', cursor: 'pointer' }}>
                                  {uploading === `lesson-${lesson.id}` ? 'Uploading…' : '⬆ Upload'}
                                </button>
                                <button onClick={() => setShowUrlInput(prev => ({ ...prev, [`lesson-${lesson.id}`]: true }))}
                                  style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: '5px', padding: '3px 10px', color: '#888', fontSize: '11px', cursor: 'pointer' }}>
                                  🔗 URL
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <button onClick={() => deleteLesson(course.id, lesson.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '2px 6px', opacity: 0.7 }}>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add lesson form */}
                  <div style={{ background: '#0d0d0d', border: '1px dashed #2a2a2a', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                      + Add Lesson
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <input style={inputStyle} placeholder="Lesson title *" value={lf.title}
                          onChange={e => setLessonForms(prev => ({ ...prev, [course.id]: { ...lf, title: e.target.value } }))} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <input style={inputStyle} placeholder="Short description (optional)"
                          value={lf.description}
                          onChange={e => setLessonForms(prev => ({ ...prev, [course.id]: { ...lf, description: e.target.value } }))} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <button onClick={() => addLesson(course.id)} disabled={saving || !lf.title?.trim()}
                          className="btn-gold" style={{ padding: '10px 24px', fontSize: '13px' }}>
                          {saving ? 'Adding…' : 'Add Lesson'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
