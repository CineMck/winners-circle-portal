import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/home');

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#0a0a0a', color: '#fff', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #1a1a1a',
        padding: '0 32px', height: '68px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>🏆</span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#c9a84c', letterSpacing: '-0.3px' }}>
            Winner&apos;s Circle
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/login" style={{ fontSize: '14px', color: '#888', textDecoration: 'none', padding: '8px 16px' }}>
            Sign In
          </Link>
          <Link href="/signup" style={{
            fontSize: '14px', fontWeight: 700, color: '#0a0a0a',
            background: '#c9a84c', padding: '9px 20px',
            borderRadius: '8px', textDecoration: 'none', letterSpacing: '0.2px',
          }}>
            Join Now →
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        position: 'relative', minHeight: '90vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0f0c02 50%, #0a0a0a 100%)',
        overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '860px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-block', fontSize: '12px', fontWeight: 700, letterSpacing: '2px',
            color: '#c9a84c', textTransform: 'uppercase', marginBottom: '24px',
            padding: '6px 16px', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px',
            background: 'rgba(201,168,76,0.05)',
          }}>
            Private Mastermind Community
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.1,
            marginBottom: '24px', letterSpacing: '-1px',
          }}>
            We Help Entrepreneurs Gain the{' '}
            <span style={{
              background: 'linear-gradient(135deg, #c9a84c, #ffd700)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Mindset &amp; Strategies
            </span>
            {' '}to Grow Their Businesses
          </h1>

          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: '#888', lineHeight: 1.7, marginBottom: '40px', maxWidth: '640px', margin: '0 auto 40px' }}>
            Join an elite group of entrepreneurs committed to massive growth, wise decision-making, and building a lasting legacy.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{
              display: 'inline-block', padding: '16px 36px',
              background: 'linear-gradient(135deg, #c9a84c, #b8943d)',
              color: '#0a0a0a', fontWeight: 800, fontSize: '16px',
              borderRadius: '12px', textDecoration: 'none', letterSpacing: '0.3px',
              boxShadow: '0 8px 32px rgba(201,168,76,0.3)',
            }}>
              Join for Free →
            </Link>
            <Link href="/signup" style={{
              display: 'inline-block', padding: '16px 36px',
              background: 'transparent',
              color: '#c9a84c', fontWeight: 700, fontSize: '16px',
              borderRadius: '12px', textDecoration: 'none',
              border: '1px solid rgba(201,168,76,0.4)',
            }}>
              View Memberships
            </Link>
          </div>

          {/* Social proof bar */}
          <div style={{ marginTop: '56px', display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            {[
              { num: '7-Figure', label: 'Founder & Coach' },
              { num: '$1B+', label: 'In Sales Led' },
              { num: '100+', label: 'Team Members' },
              { num: '#1', label: 'Team in Michigan' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#c9a84c' }}>{stat.num}</div>
                <div style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU'LL GAIN ── */}
      <section style={{ padding: '100px 24px', background: '#080808' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '12px' }}>
              What You&apos;ll Gain
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-0.5px' }}>
              Built for Those Who Want More
            </h2>
            <p style={{ color: '#666', marginTop: '12px', fontSize: '17px', maxWidth: '520px', margin: '12px auto 0' }}>
              Created by John Wentworth — for entrepreneurs, business owners, and leaders ready to take control.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {[
              {
                icon: '🧠',
                title: 'Master Your Mindset',
                desc: 'Your mindset shapes your reality. Learn from John as he challenges your perspective and helps you unlock next-level growth.',
              },
              {
                icon: '📈',
                title: 'Scale Your Business',
                desc: 'Implement proven strategies to increase revenue, expand your reach, and dominate your market.',
              },
              {
                icon: '💰',
                title: 'Maximize Your Income',
                desc: 'Develop efficient systems that create long-term financial success and freedom.',
              },
              {
                icon: '🎯',
                title: 'Live With Purpose',
                desc: 'Elevate both your personal and professional life to achieve true fulfillment and balance.',
              },
            ].map(item => (
              <div key={item.title} style={{
                background: '#0f0f0f', border: '1px solid #1a1a1a',
                borderRadius: '16px', padding: '32px',
                transition: 'border-color 0.2s',
              }}>
                <div style={{ fontSize: '36px', marginBottom: '16px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '10px', color: '#fff' }}>{item.title}</h3>
                <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT JOHN ── */}
      <section style={{ padding: '100px 24px', background: '#0a0a0a' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px', alignItems: 'center' }}>

          {/* Photo */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: '-2px',
              background: 'linear-gradient(135deg, #c9a84c33, transparent 60%)',
              borderRadius: '20px',
            }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://storage.googleapis.com/msgsndr/0DEshbKtOg3cDPzGlW9f/media/644fee5dfaa9d45f51fba6aa.jpeg"
              alt="John Wentworth"
              style={{ width: '100%', borderRadius: '18px', display: 'block', position: 'relative', zIndex: 1 }}
            />
            {/* Floating badge */}
            <div style={{
              position: 'absolute', bottom: '24px', left: '24px', zIndex: 2,
              background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(201,168,76,0.4)',
              borderRadius: '12px', padding: '12px 16px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#c9a84c' }}>John Wentworth</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>CEO · Wentworth Real Estate Group</div>
            </div>
          </div>

          {/* Text */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '16px' }}>
              Meet Your Coach
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: '20px' }}>
              A Story of Resilience,<br />Success &amp; Impact
            </h2>
            <p style={{ color: '#888', fontSize: '15px', lineHeight: 1.8, marginBottom: '16px' }}>
              At 35, John Wentworth went from completely broke to building a 7-figure net income business from the ground up. As CEO of Wentworth Real Estate Group — the <strong style={{ color: '#c9a84c' }}>#1 Independent Large Team Brokerage in Michigan</strong> with over $1 billion in sales — he leads 100+ professionals while mentoring entrepreneurs worldwide.
            </p>
            <p style={{ color: '#888', fontSize: '15px', lineHeight: 1.8, marginBottom: '28px' }}>
              From childhood trauma to battling addiction and reclaiming his life through sobriety, John&apos;s journey is a testament to resilience and the power of mindset. His mission is simple: <em style={{ color: '#fff' }}>&quot;Develop people. Change lives.&quot;</em>
            </p>

            <blockquote style={{
              borderLeft: '3px solid #c9a84c', paddingLeft: '20px',
              margin: '0 0 32px', color: '#aaa', fontSize: '15px', fontStyle: 'italic', lineHeight: 1.7,
            }}>
              &quot;You must first believe you can win, then have the tools to make it happen. That&apos;s why I started this mastermind — to transfer the knowledge, mindset, and strategies that truly change lives.&quot;
            </blockquote>

            <Link href="/signup" style={{
              display: 'inline-block', padding: '14px 28px',
              background: 'linear-gradient(135deg, #c9a84c, #b8943d)',
              color: '#0a0a0a', fontWeight: 800, fontSize: '14px',
              borderRadius: '10px', textDecoration: 'none',
            }}>
              Join the Circle →
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: '100px 24px', background: '#080808' }} id="pricing">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '2px', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '12px' }}>
              Membership Options
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-0.5px' }}>
              Choose Your Level
            </h2>
            <p style={{ color: '#666', marginTop: '12px', fontSize: '16px' }}>No contracts. Cancel anytime.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

            {/* Free */}
            <div style={{
              background: '#0f0f0f', border: '1px solid #1a1a1a',
              borderRadius: '20px', padding: '36px', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Free</div>
              <div style={{ marginBottom: '28px' }}>
                <span style={{ fontSize: '48px', fontWeight: 900, color: '#fff' }}>$0</span>
                <span style={{ color: '#555', fontSize: '15px' }}> / month</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, marginBottom: '28px' }}>
                {[
                  { title: '1 Zoom Call Per Month', desc: 'Live group call every month' },
                  { title: 'Free Resources Library', desc: 'Curated tools and templates' },
                ].map(f => (
                  <div key={f.title} style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ color: '#c9a84c', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{f.title}</div>
                      <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/signup" style={{
                display: 'block', textAlign: 'center', padding: '13px',
                border: '1px solid #2a2a2a', borderRadius: '10px',
                color: '#888', fontWeight: 700, fontSize: '14px', textDecoration: 'none',
              }}>
                Join for Free
              </Link>
            </div>

            {/* Core */}
            <div style={{
              background: '#0f0f0f', border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '20px', padding: '36px', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Core Member</div>
              <div style={{ marginBottom: '28px' }}>
                <span style={{ fontSize: '48px', fontWeight: 900, color: '#fff' }}>$150</span>
                <span style={{ color: '#555', fontSize: '15px' }}> / month</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, marginBottom: '28px' }}>
                {[
                  { title: '4 Zoom Lessons Per Month', desc: 'Live coaching to keep your strategy sharp' },
                  { title: '1 Special Guest Call', desc: 'Top performers across industries' },
                  { title: 'Unlimited Replay Access', desc: 'Watch on your schedule' },
                  { title: 'Community Access + Challenges', desc: 'Connect, compete, and grow' },
                  { title: 'Premium Resources & Courses', desc: 'Full library access' },
                  { title: 'Free Member-Only Events', desc: 'Exclusive in-person experiences' },
                  { title: 'Winners Circle Swag', desc: 'Represent the mindset that wins' },
                ].map(f => (
                  <div key={f.title} style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ color: '#c9a84c', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{f.title}</div>
                      <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/signup" style={{
                display: 'block', textAlign: 'center', padding: '13px',
                background: 'linear-gradient(135deg, #c9a84c, #b8943d)',
                borderRadius: '10px', color: '#0a0a0a', fontWeight: 800,
                fontSize: '14px', textDecoration: 'none',
              }}>
                Join Core →
              </Link>
            </div>

            {/* Elevate */}
            <div style={{
              background: 'linear-gradient(160deg, #0f0f0f 0%, #111008 100%)',
              border: '1px solid rgba(201,168,76,0.5)',
              borderRadius: '20px', padding: '36px', display: 'flex', flexDirection: 'column',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 0 40px rgba(201,168,76,0.08)',
            }}>
              {/* Best Value badge */}
              <div style={{
                position: 'absolute', top: 0, right: 0,
                background: '#f59e0b', color: '#000',
                fontSize: '11px', fontWeight: 800, padding: '6px 16px',
                borderBottomLeftRadius: '12px', letterSpacing: '0.5px',
              }}>BEST VALUE</div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: '#e0c068', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Elevate</div>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>Small Group — Limited to 10 People</div>
              <div style={{ marginBottom: '28px' }}>
                <span style={{ fontSize: '48px', fontWeight: 900, color: '#fff' }}>$495</span>
                <span style={{ color: '#555', fontSize: '15px' }}> / month</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, marginBottom: '28px' }}>
                {[
                  { title: 'Everything in Core', desc: 'Zoom lessons, events, guest calls, swag, replays' },
                  { title: 'Community Access + Challenges', desc: 'Connect, compete, and grow' },
                  { title: 'Premium Resources & Courses', desc: 'Full library access' },
                  { title: '2 Additional Live Group Calls / Mo', desc: '2nd & 3rd Wednesdays at Noon' },
                  { title: 'Group Marketing Call', desc: 'Branding, lead gen, copywriting & offers' },
                  { title: 'Group Coaching Call', desc: 'Live Q&A and hot seat with John' },
                ].map(f => (
                  <div key={f.title} style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ color: '#e0c068', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{f.title}</div>
                      <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/signup" style={{
                display: 'block', textAlign: 'center', padding: '13px',
                background: 'linear-gradient(135deg, #e0c068, #c9a84c)',
                borderRadius: '10px', color: '#0a0a0a', fontWeight: 800,
                fontSize: '14px', textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
              }}>
                Join Elevate →
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── 1-ON-1 COACHING ── */}
      <section style={{ padding: '100px 24px', background: '#0a0a0a' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, #111 0%, #0f0c02 100%)',
            border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: '24px', padding: '56px 48px', textAlign: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-60px', right: '-60px',
              width: '200px', height: '200px',
              background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)',
            }} />

            <div style={{
              display: 'inline-block', padding: '5px 14px', marginBottom: '20px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: '#ef4444', letterSpacing: '1px',
            }}>
              ⚡ ONLY 1 SPOT AVAILABLE
            </div>

            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 900, marginBottom: '16px', letterSpacing: '-0.5px' }}>
              1-on-1 Coaching with John
            </h2>
            <p style={{ color: '#888', fontSize: '16px', lineHeight: 1.7, marginBottom: '36px', maxWidth: '560px', margin: '0 auto 36px' }}>
              Take your business to the next level with personalized coaching. Gain direct access to proven strategies from a 7-figure entrepreneur who built his success from the ground up.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px', textAlign: 'left' }}>
              {[
                { icon: '📅', title: 'Weekly 30-Min Sessions', desc: 'Focused, actionable strategy tailored to you' },
                { icon: '📲', title: 'Direct Access to John', desc: 'Real-time guidance throughout the week' },
                { icon: '🗺️', title: 'Custom Strategic Map', desc: 'Personalized plan aligned to your vision' },
                { icon: '💪', title: 'Accountability & Support', desc: 'Stay consistent with milestone tracking' },
              ].map(item => (
                <div key={item.title} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid #1e1e1e',
                  borderRadius: '12px', padding: '16px',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>{item.icon}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: '#555' }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <Link href="/signup" style={{
              display: 'inline-block', padding: '15px 36px',
              background: 'linear-gradient(135deg, #c9a84c, #b8943d)',
              color: '#0a0a0a', fontWeight: 800, fontSize: '15px',
              borderRadius: '12px', textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(201,168,76,0.3)',
            }}>
              Apply for 1-on-1 Coaching →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: '#080808', borderTop: '1px solid #111',
        padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '18px' }}>🏆</span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#c9a84c' }}>Winner&apos;s Circle</span>
        </div>
        <p style={{ color: '#333', fontSize: '13px', margin: '0 0 12px' }}>
          No contracts · Cancel anytime
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <Link href="/login" style={{ color: '#444', fontSize: '13px', textDecoration: 'none' }}>Sign In</Link>
          <Link href="/signup" style={{ color: '#444', fontSize: '13px', textDecoration: 'none' }}>Join Now</Link>
          <a href="https://getinthewinnerscircle.com" target="_blank" rel="noopener noreferrer" style={{ color: '#444', fontSize: '13px', textDecoration: 'none' }}>Main Site</a>
        </div>
        <p style={{ color: '#222', fontSize: '12px', marginTop: '24px' }}>
          © {new Date().getFullYear()} The Winner&apos;s Circle — All Rights Reserved
        </p>
      </footer>

    </div>
  );
}
