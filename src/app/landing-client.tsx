'use client';

// Public landing page — design ported from the winners-circle-landing site
// (index.html) so the portal homepage matches it exactly. All CTAs point at
// the in-app /signup and /login routes instead of external URLs.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isNative } from '@/lib/native';
import './landing.css';

/* ────────────────────────── data ────────────────────────── */

const BIZ_TYPES = [
  'Real Estate', 'Roofing', 'Coffee', 'Restaurant', 'Consulting',
  'Fitness', 'Marketing', 'Landscaping', 'Tech', 'Construction',
  'Financial', 'Healthcare',
];

const PILLARS = [
  {
    title: <>Master Your<br />Mindset</>,
    desc: 'Your mindset is the foundation of everything you build. John challenges your perspective so you can unlock next-level growth.',
    bullets: [
      'Identify and shatter limiting beliefs',
      'Build an unshakeable belief in your potential',
      'Weekly challenges designed to expand your perspective',
    ],
    visBg: 'linear-gradient(145deg, #121008, #1a1608)',
    emoji: '🧠',
    label: 'Mindset',
  },
  {
    title: <>Scale Your<br />Business</>,
    desc: 'Proven strategies to increase revenue, expand your market reach, and dominate your industry — from someone who did it.',
    bullets: [
      'Actionable growth frameworks from a 7-figure operator',
      'Live coaching and strategy sessions every month',
      'Real strategies — not theory, things that actually work',
    ],
    visBg: 'linear-gradient(145deg, #081408, #0c1c0c)',
    emoji: '🚀',
    label: 'Scale',
  },
  {
    title: <>Maximize Your<br />Income</>,
    desc: 'Build efficient systems that create sustainable, long-term financial success and the freedom to live on your own terms.',
    bullets: [
      'Systems and processes that scale without burnout',
      'Revenue stream clarity and business model optimization',
      'Financial discipline from someone who built it from zero',
    ],
    visBg: 'linear-gradient(145deg, #0e0814, #16101e)',
    emoji: '💰',
    label: 'Income',
  },
  {
    title: <>Live With<br />Purpose</>,
    desc: 'True success is more than financial. Elevate every area of your life — health, relationships, legacy, and deep fulfillment.',
    bullets: [
      'Align your goals with your personal values',
      'Health, relationships, and legacy — not just revenue',
      'A community that holds you accountable to your whole life',
    ],
    visBg: 'linear-gradient(145deg, #080e14, #0c1620)',
    emoji: '⭐',
    label: 'Purpose',
  },
];

const APP_FEATURES = [
  {
    title: '🎯 Challenges',
    desc: 'Stay consistent and earn XP by completing structured challenges. Track streaks, unlock badges, and compete on the leaderboard — accountability built in.',
    tag: '⚡ Earn XP & unlock badges',
  },
  {
    title: '📚 Free Resources',
    desc: 'Access a growing library of templates, guides, playbooks, and session recordings — organized by category so you can find exactly what you need, when you need it.',
    tag: '📂 Templates, guides & replays',
  },
  {
    title: '🎓 Courses',
    desc: 'Deep-dive video courses built for high-performers. Track your progress, complete lessons at your own pace, and build real skills that move the needle in your business.',
    tag: '🎬 Video lessons with progress tracking',
  },
  {
    title: '💬 Community',
    desc: 'Connect in topic-specific channels — #wins, #accountability, #hot-seat, #real-estate, and more. Share breakthroughs, ask questions, and build relationships with fellow winners.',
    tag: '🏆 7 channels including #founders-lounge',
  },
  {
    title: '✉️ Direct Messages',
    desc: 'Message any member directly — including John. Get real-time feedback, celebrate wins together, and stay connected with your network between live sessions.',
    tag: '💬 DM members & John directly',
  },
  {
    title: '📅 Live Events',
    desc: 'Join live Zoom calls, hot seat coaching sessions, and group calls — all scheduled inside the app. Miss one? Every session is recorded and available on demand.',
    tag: '🔴 Live sessions + on-demand replays',
  },
];

const TESTIMONIAL_VIDEOS = [
  'https://player.vimeo.com/video/1197128239?h=6957195b53&badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0',
  'https://player.vimeo.com/video/1197128375?h=3ebb88ddb2&badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0',
  'https://player.vimeo.com/video/1197128241?h=56144d82c4&badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0',
  'https://player.vimeo.com/video/1197128240?h=301a6d0ca2&badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0',
];

const MOCK_NAV = ['🏠 Home', '💬 Community', '🎓 Courses', '📅 Events', '📚 Resources', '✉️ Messages', '🎯 Challenges'];

/* ─────────────────────── tiny pieces ─────────────────────── */

function Check() {
  return (
    <span className="bul-icon">
      <svg viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="#C9A227" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Arrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 7.5H12M12 7.5L8.5 4M12 7.5L8.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MockBrowser({ id, url, active, children }: { id: string; url: string; active: string; children: React.ReactNode }) {
  return (
    <div className="af-mockup" id={id}>
      <div className="mock-browser">
        <div className="mock-bar">
          <div className="mock-dots"><div className="mock-dot" /><div className="mock-dot" /><div className="mock-dot" /></div>
          <div className="mock-url">{url}</div>
        </div>
        <div className="mock-body">
          <div className="mock-sidebar">
            <div className="mock-logo">🏆 WC</div>
            {MOCK_NAV.map(item => (
              <div key={item} className={`mock-nav-item${item === active ? ' active-nav' : ''}`}>{item}</div>
            ))}
          </div>
          <div className="mock-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── main component ─────────────────────── */

export default function LandingClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const router = useRouter();
  const [hideForNative, setHideForNative] = useState(false);

  // On iOS/Android (Capacitor) we skip the marketing page entirely and send
  // the user straight to sign-in — the app is for existing members.
  useEffect(() => {
    if (isNative()) {
      setHideForNative(true);
      router.replace('/login');
    }
  }, [router]);

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // All scroll-driven behavior, ported from the landing page's vanilla JS
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    // ---- Nav scroll effect ----
    const nav = document.getElementById('nav');
    const onNavScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 30);
    onNavScroll();
    window.addEventListener('scroll', onNavScroll, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', onNavScroll));

    // ---- Intersection Observer: scroll-reveal ----
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.lp .reveal').forEach(el => io.observe(el));
    cleanups.push(() => io.disconnect());

    // ---- Cycling business type ----
    const bizEl = document.getElementById('biz-type');
    let bizIndex = 0;
    const cycleBiz = () => {
      if (!bizEl) return;
      bizEl.classList.remove('fade-in');
      bizEl.classList.add('fade-out');
      setTimeout(() => {
        bizEl.textContent = BIZ_TYPES[bizIndex];
        bizIndex = (bizIndex + 1) % BIZ_TYPES.length;
        bizEl.classList.remove('fade-out');
        bizEl.classList.add('fade-in');
      }, 600);
    };
    let bizInterval: ReturnType<typeof setInterval> | undefined;
    const bizStart = setTimeout(() => {
      cycleBiz();
      bizInterval = setInterval(cycleBiz, 2600);
    }, 1400);
    cleanups.push(() => { clearTimeout(bizStart); if (bizInterval) clearInterval(bizInterval); });

    // ---- Apple-style pinned feature scroll (4 pillars) ----
    const track = document.getElementById('featuresTrack');
    const fDots = Array.from(document.querySelectorAll<HTMLElement>('[data-i]'));
    let fCurrent = -1;
    const setFeature = (idx: number) => {
      if (idx === fCurrent) return;
      const prev = fCurrent;
      fCurrent = idx;
      for (let i = 0; i < PILLARS.length; i++) {
        const tc = document.getElementById('fc' + i);
        const vc = document.getElementById('fv' + i);
        if (!tc || !vc) continue;
        if (i === idx) {
          tc.className = 'f-card active';
          vc.className = 'f-vis active';
        } else if (i === prev) {
          tc.className = 'f-card exit';
          vc.className = 'f-vis';
          setTimeout(() => { if (tc.className === 'f-card exit') tc.className = 'f-card'; }, 550);
        } else {
          tc.className = 'f-card';
          vc.className = 'f-vis';
        }
      }
      fDots.forEach((d, i) => d.classList.toggle('active', i === idx));
    };
    setFeature(0);
    const onFeatScroll = () => {
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const trackH = track.offsetHeight;
      const scrolled = -rect.top;
      if (scrolled < 0 || scrolled > trackH - window.innerHeight) return;
      const progress = scrolled / (trackH - window.innerHeight);
      setFeature(Math.min(3, Math.floor(progress * 4)));
    };
    window.addEventListener('scroll', onFeatScroll, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', onFeatScroll));
    fDots.forEach((dot) => {
      const onClick = () => {
        if (!track) return;
        const i = parseInt(dot.dataset.i || '0', 10);
        const rect = track.getBoundingClientRect();
        const target = window.scrollY + rect.top + (i / 4) * (track.offsetHeight - window.innerHeight) + 4;
        window.scrollTo({ top: target, behavior: 'smooth' });
      };
      dot.addEventListener('click', onClick);
      cleanups.push(() => dot.removeEventListener('click', onClick));
    });

    // ---- App features pinned scroll (6 screens) ----
    const afTrack = document.getElementById('appFeaturesTrack');
    const afDots = Array.from(document.querySelectorAll<HTMLElement>('[data-af]'));
    let afCurrent = -1;
    const setAppFeature = (idx: number) => {
      if (idx === afCurrent) return;
      const prev = afCurrent;
      afCurrent = idx;
      for (let i = 0; i < APP_FEATURES.length; i++) {
        const tc = document.getElementById('afc' + i);
        const mc = document.getElementById('afm' + i);
        if (!tc) continue;
        if (i === idx) {
          tc.className = 'af-card active';
          if (mc) mc.className = 'af-mockup active';
        } else if (i === prev) {
          tc.className = 'af-card exit';
          if (mc) mc.className = 'af-mockup';
          setTimeout(() => { if (tc.className === 'af-card exit') tc.className = 'af-card'; }, 550);
        } else {
          tc.className = 'af-card';
          if (mc) mc.className = 'af-mockup';
        }
      }
      afDots.forEach((d, i) => d.classList.toggle('active', i === idx));
    };
    setAppFeature(0);
    const onAfScroll = () => {
      if (!afTrack) return;
      const rect = afTrack.getBoundingClientRect();
      const trackH = afTrack.offsetHeight;
      const scrolled = -rect.top;
      if (scrolled < 0 || scrolled > trackH - window.innerHeight) return;
      const progress = scrolled / (trackH - window.innerHeight);
      setAppFeature(Math.min(5, Math.floor(progress * 6)));
    };
    window.addEventListener('scroll', onAfScroll, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', onAfScroll));
    afDots.forEach((dot) => {
      const onClick = () => {
        if (!afTrack) return;
        const i = parseInt(dot.dataset.af || '0', 10);
        const rect = afTrack.getBoundingClientRect();
        const target = window.scrollY + rect.top + (i / 6) * (afTrack.offsetHeight - window.innerHeight) + 4;
        window.scrollTo({ top: target, behavior: 'smooth' });
      };
      dot.addEventListener('click', onClick);
      cleanups.push(() => dot.removeEventListener('click', onClick));
    });

    return () => cleanups.forEach(fn => fn());
  }, []);

  // Avoid a marketing-page flash while the native shell is redirecting to /login.
  if (hideForNative) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0a' }} />;
  }

  return (
    <div className="lp">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── NAVBAR ── */}
      <nav id="nav">
        <div className="nav-inner">
          <a href="#" className="nav-logo">Winners <span>Circle</span></a>
          <div className="nav-links">
            <a href="#about" className="nav-link">About John</a>
            <a href="#pricing" className="nav-link">Membership</a>
            <Link href="/login" className="nav-link nav-link-app">Sign In</Link>
          </div>
          <Link href="/signup" className="nav-cta">Join Free</Link>
          <button className={`nav-hamburger${menuOpen ? ' open' : ''}`} aria-label="Menu" onClick={() => setMenuOpen(o => !o)}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        <a href="#about" onClick={closeMenu}>About John</a>
        <a href="#pricing" onClick={closeMenu}>Membership</a>
        <Link href="/login" onClick={closeMenu}>Sign In</Link>
        <Link href="/signup" className="mobile-menu-cta" onClick={closeMenu}>Join Free</Link>
      </div>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg"><div className="hero-grid" /></div>
        <div className="hero-content">
          <div className="hero-pill reveal">For Entrepreneurs Who Want More</div>
          <h1 className="reveal d1">
            The Mindset &amp; Strategies<br />
            to Grow Your<br />
            <span className="hero-biz-line"><span id="biz-type" /><span className="gradient-text"> Business</span></span>
          </h1>
          <p className="hero-sub reveal d2">
            Join an elite group of entrepreneurs committed to massive growth, wise decision-making, and building a lasting legacy — for free.
          </p>
          <div className="hero-cta-group reveal d3">
            <Link href="/signup" className="btn-primary">Join the Circle — Free<Arrow /></Link>
            <a href="#about" className="btn-ghost">Meet John →</a>
          </div>
          <div className="hero-social-proof reveal d4">
            <span className="proof-stars">★★★★★</span>
            <span>Trusted by 500+ entrepreneurs</span>
          </div>
        </div>
      </section>

      {/* ── MAIN VIDEO ── */}
      <section className="main-video-section">
        <div className="lp-container">
          <div className="main-video-wrap">
            <div className="main-video-label reveal">
              <div className="section-eyebrow">See It in Action</div>
              <h2>Hear from John<br /><span className="gold">himself</span>.</h2>
            </div>
            <div className="video-frame reveal d1">
              <div className="vimeo-wrapper">
                <iframe
                  src="https://player.vimeo.com/video/1197128330?h=52408c6f3f&badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Winners Circle Main Video"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div className="stats-strip">
        <div className="lp-container">
          <div className="stats-grid">
            <div className="stat-item reveal"><div className="stat-num">$1B+</div><div className="stat-label">In Real Estate Sales</div></div>
            <div className="stat-item reveal d1"><div className="stat-num">500+</div><div className="stat-label">Members Growing Together</div></div>
            <div className="stat-item reveal d2"><div className="stat-num">20+</div><div className="stat-label">Years of Entrepreneurial Wisdom</div></div>
          </div>
        </div>
      </div>

      {/* ── FEATURES — APPLE-STYLE PINNED SCROLL ── */}
      <section className="features-section">
        <div className="features-intro">
          <div className="section-eyebrow reveal">What You&apos;ll Gain</div>
          <h2 className="section-title reveal d1">Four pillars.<br /><span className="gold">One transformation.</span></h2>
          <p className="section-sub reveal d2" style={{ margin: '0 auto' }}>Everything you need to transform your mindset, scale your business, and live with purpose.</p>
        </div>

        <div className="features-track" id="featuresTrack">
          <div className="features-sticky" id="featuresSticky">
            <div className="lp-container" style={{ position: 'relative' }}>
              <div className="features-layout">

                {/* LEFT: Text Cards */}
                <div className="feature-text-wrap">
                  {PILLARS.map((p, i) => (
                    <div className="f-card" id={`fc${i}`} key={p.label}>
                      <div className="f-step">0{i + 1} &nbsp;/&nbsp; 04</div>
                      <h3 className="f-title">{p.title}</h3>
                      <p className="f-desc">{p.desc}</p>
                      <ul className="f-bullets">
                        {p.bullets.map(b => <li key={b}><Check />{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* RIGHT: Visual Cards */}
                <div className="feature-vis-wrap">
                  {PILLARS.map((p, i) => (
                    <div className="f-vis" id={`fv${i}`} key={p.label} style={{ background: p.visBg }}>
                      <div className="f-vis-emoji">{p.emoji}</div>
                      <div className="f-vis-label">{p.label}</div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Scroll progress indicator */}
              <div className="f-dots" id="fDots">
                {PILLARS.map((p, i) => <div className="f-dot" data-i={i} key={p.label} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUOTE ── */}
      <div className="quote-section">
        <div className="lp-container">
          <div className="big-quote reveal">
            <span className="qmark">&quot;</span>You must first believe you can win, then have the tools to make it happen. That&apos;s why I started this — to transfer the knowledge, mindset, and strategies that truly change lives.<span className="qmark">&quot;</span>
          </div>
          <div className="quote-by reveal d1">— <strong>John Wentworth</strong>, Founder of The Winners Circle</div>
        </div>
      </div>

      {/* ── ABOUT JOHN ── */}
      <section className="about-section" id="about">
        <div className="lp-container">
          <div className="about-grid">
            <div className="about-img-wrap reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/john-wentworth.jpg" alt="John Wentworth" />
              <div className="about-badge">
                <div className="b-name">John Wentworth</div>
                <div className="b-role">CEO, Wentworth Real Estate Group</div>
              </div>
            </div>
            <div className="about-text">
              <div className="section-eyebrow reveal">Meet Your Mentor</div>
              <h2 className="section-title reveal d1">A Story of<br />Resilience &amp; Impact</h2>
              <p className="about-quote-line reveal d2">
                <em>&quot;My mission is clear — develop people &amp; change lives.&quot;</em>
              </p>
              <p className="about-body reveal d2">
                At 35, John went from completely broke to building a 7-figure net income business from the ground up. His journey — through childhood trauma, battling addiction, and reclaiming his life through sobriety — shaped a leader defined by transparency, heart, and zero BS.
              </p>
              <p className="about-body reveal d3">
                Today, as CEO of the #1 Independent Large Team Brokerage in Michigan with over $1 billion in sales, John leads a team of 100+ professionals while mentoring entrepreneurs to reach their full potential.
              </p>
              <div className="about-achievements reveal d3">
                <div className="achiev"><div className="a-num">$1B+</div><div className="a-label">Total Sales Volume</div></div>
                <div className="achiev"><div className="a-num">#1</div><div className="a-label">Independent Brokerage in Michigan</div></div>
                <div className="achiev"><div className="a-num">100+</div><div className="a-label">Professionals on His Team</div></div>
                <div className="achiev"><div className="a-num">20yr</div><div className="a-label">Entrepreneurial Experience</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── APP FEATURES ── */}
      <section className="app-features-section" id="app-features">
        <div className="app-features-intro">
          <div className="section-eyebrow reveal">The Members App</div>
          <h2 className="section-title reveal d1">Everything in one<br /><span className="gold">powerful platform</span>.</h2>
          <p className="section-sub reveal d2" style={{ margin: '0 auto' }}>The Winners Circle app puts your entire growth system in your pocket — challenges, courses, community, and direct access to John.</p>
        </div>

        <div className="app-features-track" id="appFeaturesTrack">
          <div className="app-features-sticky">
            <div className="lp-container" style={{ position: 'relative' }}>
              <div className="app-features-layout">

                {/* LEFT: Text cards */}
                <div className="app-text-wrap">
                  {APP_FEATURES.map((f, i) => (
                    <div className="af-card" id={`afc${i}`} key={f.title}>
                      <div className="af-step">0{i + 1} &nbsp;/&nbsp; 06</div>
                      <h3 className="af-title">{f.title}</h3>
                      <p className="af-desc">{f.desc}</p>
                      <div className="af-tag">{f.tag}</div>
                    </div>
                  ))}
                </div>

                {/* RIGHT: App mockups */}
                <div className="app-mockup-wrap">

                  {/* Challenges */}
                  <MockBrowser id="afm0" url="winners-circle-portal.up.railway.app/challenges" active="🎯 Challenges">
                    <div className="mock-page-title">🎯 Challenges</div>
                    <div className="mock-stats">
                      <div className="mock-stat"><div className="mock-stat-num">1</div><div className="mock-stat-lbl">ACTIVE</div></div>
                      <div className="mock-stat"><div className="mock-stat-num">0</div><div className="mock-stat-lbl">DONE</div></div>
                      <div className="mock-stat"><div className="mock-stat-num">300</div><div className="mock-stat-lbl">TOTAL XP</div></div>
                    </div>
                    <div className="mock-card">
                      <div className="mock-badge gold">⚡ IN PROGRESS</div>
                      <div className="mock-card-title">10 Day Pushup Challenge</div>
                      <div className="mock-card-sub">+100 XP · 📅 10 days · 3/10 checked in</div>
                      <div className="mock-progress-bar"><div className="mock-progress-fill" style={{ width: '30%' }} /></div>
                    </div>
                    <div className="mock-card">
                      <div className="mock-badge blue">🔜 UPCOMING</div>
                      <div className="mock-card-title">30 Day Revenue Challenge</div>
                      <div className="mock-card-sub">+500 XP · Starts June 1</div>
                    </div>
                  </MockBrowser>

                  {/* Resources */}
                  <MockBrowser id="afm1" url="winners-circle-portal.up.railway.app/resources" active="📚 Resources">
                    <div className="mock-page-title">📚 Resource Library</div>
                    <div className="mock-tabs">
                      <div className="mock-tab active-tab">All</div>
                      <div className="mock-tab">Mindset</div>
                      <div className="mock-tab">Business</div>
                      <div className="mock-tab">Real Estate</div>
                      <div className="mock-tab">Templates</div>
                      <div className="mock-tab">Replays</div>
                    </div>
                    <div className="mock-card"><div className="mock-card-title">📄 Sales Script Template</div><div className="mock-card-sub">Templates &amp; Toolkits · PDF</div></div>
                    <div className="mock-card"><div className="mock-card-title">🧠 Mindset Reset Guide</div><div className="mock-card-sub">Mindset &amp; Performance · Guide</div></div>
                    <div className="mock-card"><div className="mock-card-title">🏠 RE Buyer Checklist</div><div className="mock-card-sub">Real Estate · Template</div></div>
                  </MockBrowser>

                  {/* Courses */}
                  <MockBrowser id="afm2" url="winners-circle-portal.up.railway.app/courses" active="🎓 Courses">
                    <div className="mock-page-title">🎓 Courses</div>
                    <div className="mock-card">
                      <div className="mock-badge gold">Core+</div>
                      <div className="mock-card-title">Real Estate Master Course</div>
                      <div className="mock-card-sub">2 lessons · John Wentworth</div>
                      <div className="mock-progress-bar"><div className="mock-progress-fill" style={{ width: '100%' }} /></div>
                      <div style={{ fontSize: '8.5px', color: '#28C840', marginTop: '5px' }}>✓ Complete</div>
                    </div>
                    <div className="mock-card">
                      <div className="mock-badge blue">Coming Soon</div>
                      <div className="mock-card-title">Mindset Mastery Series</div>
                      <div className="mock-card-sub">6 lessons · Launching June 2025</div>
                      <div className="mock-progress-bar"><div className="mock-progress-fill" style={{ width: '0%' }} /></div>
                    </div>
                    <div className="mock-card">
                      <div className="mock-badge blue">Coming Soon</div>
                      <div className="mock-card-title">Sales &amp; Lead Generation</div>
                      <div className="mock-card-sub">8 lessons · Launching Q3 2025</div>
                    </div>
                  </MockBrowser>

                  {/* Community */}
                  <MockBrowser id="afm3" url="winners-circle-portal.up.railway.app/community" active="💬 Community">
                    <div className="mock-channels">
                      <div className="mock-channel active-ch"># general</div>
                      <div className="mock-channel"># wins</div>
                      <div className="mock-channel"># accountability</div>
                      <div className="mock-channel"># hot-seat</div>
                      <div className="mock-channel"># founders-lounge</div>
                      <div className="mock-channel"># real-estate</div>
                    </div>
                    <div className="mock-post">
                      <div className="mock-post-header"><div className="mock-avatar">JW</div><div className="mock-post-name">John Wentworth <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>· Founding</span></div></div>
                      <div className="mock-post-text">Big week everyone — remember why you started. Your consistency is your edge. 🏆</div>
                    </div>
                    <div className="mock-post">
                      <div className="mock-post-header"><div className="mock-avatar" style={{ background: '#60a5fa' }}>L</div><div className="mock-post-name">Luke <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>· Member</span></div></div>
                      <div className="mock-post-text">Closed my biggest deal yet this week. This community is 🔥</div>
                    </div>
                  </MockBrowser>

                  {/* DMs */}
                  <MockBrowser id="afm4" url="winners-circle-portal.up.railway.app/messages" active="✉️ Messages">
                    <div className="mock-page-title">✉️ Messages</div>
                    <div className="mock-dm">
                      <div className="mock-avatar">JW</div>
                      <div className="mock-dm-body"><div className="mock-dm-name">John Wentworth</div><div className="mock-dm-msg">&quot;Luke, love seeing you stay consistent with the lessons and check-ins — that&apos;s how real progress happens. Keep that momentum going, brother.&quot;</div></div>
                    </div>
                    <div className="mock-dm">
                      <div className="mock-avatar" style={{ background: '#60a5fa' }}>C</div>
                      <div className="mock-dm-body"><div className="mock-dm-name">Christian Wentworth</div><div className="mock-dm-msg">Hey! Are you coming to the live call on Wednesday? Would love to connect.</div></div>
                    </div>
                    <div className="mock-dm">
                      <div className="mock-avatar" style={{ background: '#a78bfa' }}>M</div>
                      <div className="mock-dm-body"><div className="mock-dm-name">Mike R.</div><div className="mock-dm-msg">Thanks for the referral — just closed! 🙌</div></div>
                    </div>
                  </MockBrowser>

                  {/* Live Events */}
                  <MockBrowser id="afm5" url="winners-circle-portal.up.railway.app/events" active="📅 Events">
                    <div className="mock-page-title">📅 Live Sessions</div>
                    <div className="mock-event">
                      <div className="mock-date-block"><div className="mock-date-num">02</div><div className="mock-date-mon">JUN</div></div>
                      <div><div className="mock-event-title">Weekly Mindset Call</div><div className="mock-event-sub">Monday 6:30pm ET · 60 min · Zoom</div></div>
                    </div>
                    <div className="mock-event">
                      <div className="mock-date-block"><div className="mock-date-num">11</div><div className="mock-date-mon">JUN</div></div>
                      <div><div className="mock-event-title">Group Marketing Call</div><div className="mock-event-sub">Wednesday 12pm ET · Elevate Members</div></div>
                    </div>
                    <div className="mock-event">
                      <div className="mock-date-block" style={{ background: 'rgba(255,255,255,0.05)' }}><div className="mock-date-num" style={{ color: 'var(--text-3)' }}>22</div><div className="mock-date-mon" style={{ color: 'var(--text-3)' }}>MAY</div></div>
                      <div><div className="mock-event-title">Mindset Masters Call</div><div className="mock-event-sub" style={{ color: 'var(--gold)' }}>🎬 Recording available</div></div>
                    </div>
                  </MockBrowser>

                </div>

                {/* Progress dots */}
                <div className="af-dots" id="afDots">
                  {APP_FEATURES.map((f, i) => <div className="f-dot" data-af={i} key={f.title} />)}
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="pricing-section" id="pricing">
        <div className="lp-container">
          <div className="pricing-header">
            <div className="section-eyebrow reveal">Membership</div>
            <h2 className="section-title reveal d1">Choose your level<br />of <span className="gold">commitment</span>.</h2>
            <p className="section-sub reveal d2" style={{ margin: '0 auto' }}>Start for $19.95. Scale when you&apos;re ready. No contracts — cancel anytime.</p>
          </div>
          <div className="pricing-grid">

            {/* STARTER */}
            <div className="p-card reveal">
              <div className="p-tier">Starter</div>
              <div className="p-price-wrap"><span className="p-was">$50</span><span className="p-price"><sup>$</sup>19.95</span></div>
              <div className="p-period">/ month &nbsp;·&nbsp; Cancel anytime</div>
              <div className="p-divider" />
              <ul className="p-features">
                <li><span className="pf-check">✦</span> 2 weekly Zoom lessons per month with John</li>
                <li><span className="pf-check">✦</span> Full access to the Winners Circle App and community</li>
              </ul>
              <Link href="/signup" className="p-cta">Join Now</Link>
            </div>

            {/* ELEVATE — FEATURED */}
            <div className="p-card featured reveal d1">
              <div className="p-best">Best Value</div>
              <div className="p-tier">Elevate</div>
              <div className="p-price-wrap"><span className="p-price"><sup>$</sup>495</span></div>
              <div className="p-period">/ month &nbsp;·&nbsp; Limited to 10 people</div>
              <div className="p-divider" />
              <ul className="p-features">
                <li><span className="pf-check">✦</span> Everything in Core membership</li>
                <li><span className="pf-check">✦</span> 2 additional live group calls per month</li>
                <li><span className="pf-check">✦</span> Group Marketing Call — branding, leads &amp; offers</li>
                <li><span className="pf-check">✦</span> Group Coaching Call — live Q&amp;A with John</li>
                <li><span className="pf-check">✦</span> Hot seat coaching with elite peers</li>
              </ul>
              <Link href="/signup" className="p-cta">Join Elevate</Link>
            </div>

            {/* CORE */}
            <div className="p-card reveal d2">
              <div className="p-tier">Core</div>
              <div className="p-price-wrap"><span className="p-price"><sup>$</sup>150</span></div>
              <div className="p-period">/ month</div>
              <div className="p-divider" />
              <ul className="p-features">
                <li><span className="pf-check">✦</span> 4 Zoom lessons per month</li>
                <li><span className="pf-check">✦</span> 1 special guest call per month</li>
                <li><span className="pf-check">✦</span> Unlimited replay access — watch anytime</li>
                <li><span className="pf-check">✦</span> Free member-only exclusive events</li>
                <li><span className="pf-check">✦</span> Winners Circle swag</li>
              </ul>
              <Link href="/signup" className="p-cta">Join Core</Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="testimonials-section">
        <div className="lp-container">
          <div className="testimonials-header">
            <div className="section-eyebrow reveal">Member Testimonials</div>
            <h2 className="section-title reveal d1">Real people.<br /><span className="gold">Real results.</span></h2>
            <p className="section-sub reveal d2" style={{ margin: '0 auto' }}>Hear directly from Winners Circle members about what this community has done for their business and life.</p>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIAL_VIDEOS.map((src, i) => (
              <div className={`t-card reveal${i % 3 === 1 ? ' d1' : i % 3 === 2 ? ' d2' : ''}`} key={src}>
                <div className="t-video-wrap">
                  <iframe
                    src={src}
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    title={`Testimonial ${i + 1}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 1-ON-1 COACHING CTA ── */}
      <section className="coaching-section">
        <div className="lp-container">
          <div className="coaching-box reveal">
            <div className="coaching-tag">1-on-1 Coaching</div>
            <h2>Direct Access to John.<br /><span className="gold">Accelerate Everything.</span></h2>
            <p className="sub">Personalized coaching from a 7-figure entrepreneur who built it from nothing. Real strategies, accountability, and a custom plan built around your specific goals.</p>
            <div className="spots-line">
              <div className="spot-pulse" />
              Only 1 spot currently available
            </div>
            <div className="coaching-perks">
              <div className="cp">
                <div className="cp-icon">📅</div>
                <div className="cp-title">Weekly 30-Min Sessions</div>
                <div className="cp-desc">Focused, actionable strategy tailored to your challenges and opportunities</div>
              </div>
              <div className="cp">
                <div className="cp-icon">📲</div>
                <div className="cp-title">Direct Access to John</div>
                <div className="cp-desc">In-the-trenches support and guidance throughout the entire week</div>
              </div>
              <div className="cp">
                <div className="cp-icon">🗺️</div>
                <div className="cp-title">Custom Strategic Map</div>
                <div className="cp-desc">A personalized plan that aligns with your vision and drives real growth</div>
              </div>
            </div>
            <Link href="/signup" className="btn-primary" style={{ fontSize: '16px', padding: '18px 48px' }}>
              Apply for 1-on-1 Coaching<Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="lp-container">
          <div className="footer-inner">
            <div className="footer-logo">The Winners <span>Circle</span></div>
            <div className="footer-links">
              <Link href="/terms">Terms &amp; Conditions</Link>
              <span className="footer-sep">·</span>
              <Link href="/privacy">Privacy Policy</Link>
              <span className="footer-sep">·</span>
              <Link href="/login">Sign In</Link>
              <span className="footer-sep">·</span>
              <Link href="/signup">Join Now</Link>
            </div>
            <div className="footer-copy">© The Winners Circle · All Rights Reserved</div>
          </div>
        </div>
      </footer>

    </div>
  );
}
