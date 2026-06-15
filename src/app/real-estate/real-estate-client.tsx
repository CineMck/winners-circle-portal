'use client';

// Elevate Real Estate Mastermind page — design ported from the
// winners-circle-landing site (elevate-real-estate.html). The registration
// form posts to /api/real-estate/register (Supabase + email notification).

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import './re-landing.css';

// Live call target for the countdown: Wednesday June 17, 2026, 12:00pm ET
const EVENT_DATE_ISO = '2026-06-17T16:00:00Z';

const LEARN_CARDS = [
  {
    icon: '📈',
    title: 'Lead Gen That Refills the Pipeline',
    desc: 'The exact channels and follow-up cadence that keep agents from ever sitting on a dry pipeline again.',
    d: '',
  },
  {
    icon: '🏠',
    title: 'Listing Presentations That Convert',
    desc: 'A repeatable structure to win listings against discount brokers and high-volume teams — without dropping your commission.',
    d: ' d1',
  },
  {
    icon: '👥',
    title: 'Scale Past the Solo-Producer Ceiling',
    desc: 'The first three hires every producing agent needs to make, and the comp structure that makes them stick.',
    d: ' d2',
  },
  {
    icon: '🎯',
    title: 'Recruit Agents Who Actually Produce',
    desc: 'How John built a 100+ professional team — without burning cash on recruits who ghost after 90 days.',
    d: ' d1',
  },
  {
    icon: '🔁',
    title: 'Build a Referral Engine on Autopilot',
    desc: 'The systems that turn one closed client into three more deals — without you chasing or begging.',
    d: ' d2',
  },
  {
    icon: '🧠',
    title: 'Operator Mindset, Not Hustle Mindset',
    desc: 'How to think like a 7-figure operator — so your business stops depending on whether you feel motivated this morning.',
    d: ' d3',
  },
];

const AGENDA = [
  {
    title: 'Where the money actually is in real estate right now',
    desc: "The market shifts most agents missed — and the lanes John's team is winning in this year.",
    d: '',
  },
  {
    title: 'A live teardown of the operator playbook',
    desc: 'Lead gen → conversion → retention → referral. The exact loop John runs his team on, walked through end to end.',
    d: ' d1',
  },
  {
    title: 'Live hot-seat coaching',
    desc: "A few attendees get John to look at their actual numbers and tell them where they're leaving money on the table.",
    d: ' d2',
  },
  {
    title: 'Open Q&A — anything goes',
    desc: "Bring whatever's keeping you up at night. Recruiting, comp plans, listing scripts, mindset — John will answer it on camera.",
    d: ' d3',
  },
];

const FAQS = [
  {
    q: 'Is this really free?',
    a: 'Yes. No credit card, no upsell on the call, no catch. We run this because most agents have never seen what a real operator playbook looks like — and the easiest way to show it is to actually run one with you.',
  },
  {
    q: 'Will it be recorded?',
    a: "Recording is not guaranteed. We keep these sessions intentionally small and intimate — if a recording happens, registrants get first access, but the only way to be sure you don't miss it is to show up live.",
  },
  {
    q: 'Who is this actually for?',
    a: 'Real estate agents, brokers, and team leaders who are past the "do I want to do this?" phase and are now asking "how do I scale this without burning out?" If you\'ve closed at least a few deals and are serious about building a real business, you\'re in the room.',
  },
  {
    q: 'Will you pitch me on something?',
    a: "At the end John will mention how The Winners Circle Elevate tier works for the few attendees who want ongoing coaching. It's a one-minute mention, not a 30-minute pitch. The other 59 minutes are about your business.",
  },
  {
    q: "What if I can't make the live time?",
    a: "Reserve a spot anyway and let us know on the form. If a recording is made available we'll send it to registered attendees. But the hot-seat coaching only happens live — so do everything you can to clear the calendar.",
  },
  {
    q: "What if I'm not in Michigan?",
    a: "Doesn't matter. Real estate is local; operator principles aren't. John coaches members across the country (and outside it) — the playbook works wherever you sell.",
  },
];

interface CallSession { id: string; label: string; starts_at: string }

function Arrow({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 7.5H12M12 7.5L8.5 4M12 7.5L8.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function RealEstateClient({ sessions = [] }: { sessions?: CallSession[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [countdown, setCountdown] = useState('starts soon');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const heroRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setMenuOpen(false);

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const cleanups: (() => void)[] = [];

    // ---- Nav scroll effect ----
    const nav = document.getElementById('re-nav');
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', onScroll));

    // ---- Sticky mobile CTA — show after hero ----
    const sticky = stickyRef.current;
    const hero = heroRef.current;
    if (sticky && hero) {
      const so = new IntersectionObserver(entries => {
        entries.forEach(e => sticky.classList.toggle('show', !e.isIntersecting));
      }, { threshold: 0.1 });
      so.observe(hero);
      cleanups.push(() => so.disconnect());
    }

    // ---- Scroll-reveal ----
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.relp .reveal').forEach(el => io.observe(el));
    cleanups.push(() => io.disconnect());

    // ---- Countdown ----
    const fmt = (n: number) => String(n).padStart(2, '0');
    const update = () => {
      const target = new Date(EVENT_DATE_ISO).getTime();
      if (isNaN(target)) { setCountdown('starts soon'); return; }
      const diff = target - Date.now();
      if (diff <= 0) { setCountdown('live now'); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setCountdown(days > 0 ? `${days}d ${fmt(hours)}h ${fmt(mins)}m` : `${fmt(hours)}h ${fmt(mins)}m`);
    };
    update();
    const iv = setInterval(update, 60000);
    cleanups.push(() => clearInterval(iv));

    return () => cleanups.forEach(fn => fn());
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError('');
    const fd = new FormData(e.currentTarget);
    const payload = {
      firstName: String(fd.get('firstName') || '').trim(),
      lastName: String(fd.get('lastName') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      brokerage: String(fd.get('brokerage') || '').trim(),
      sessionId: String(fd.get('sessionId') || ''),
      problem: String(fd.get('problem') || '').trim(),
      smsConsent: fd.get('smsConsent') === 'on',
    };
    setSubmitting(true);
    try {
      const res = await fetch('/api/real-estate/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Something went wrong. Please try again.');
      }
      setSubmitted(true);
      // Fire the Meta Pixel "Lead" conversion on successful webinar
      // registration so ad campaigns can optimize for sign-ups.
      if (typeof window !== 'undefined') {
        (window as Window & { fbq?: (...args: unknown[]) => void }).fbq?.(
          'track',
          'Lead',
          { content_name: 'Real Estate Mastermind Registration' }
        );
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relp">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── URGENCY BAR ── */}
      <div className="urgency-bar" role="region" aria-label="Limited availability">
        Only <strong>25</strong> seats left for the Elevate Real Estate Mastermind
        <span className="countdown">{countdown}</span>
      </div>

      {/* ── NAVBAR ── */}
      <nav id="re-nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">Winners <span>Circle</span></Link>
          <div className="nav-links">
            <Link href="/#about" className="nav-link">About John</Link>
            <Link href="/#pricing" className="nav-link">Membership</Link>
            <Link href="/login" className="nav-link nav-link-app">Sign In</Link>
          </div>
          <a href="#register" className="nav-cta">Reserve My Spot</a>
          <button
            className={`nav-hamburger${menuOpen ? ' open' : ''}`}
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        <Link href="/#about" onClick={closeMenu}>About John</Link>
        <Link href="/#pricing" onClick={closeMenu}>Membership</Link>
        <Link href="/login" onClick={closeMenu}>Sign In</Link>
        <a href="#register" className="mobile-menu-cta" onClick={closeMenu}>Reserve My Spot</a>
      </div>

      {/* ── HERO ── */}
      <section className="hero" ref={heroRef}>
        <div className="hero-bg"><div className="hero-grid" /></div>
        <div className="hero-content">
          <div className="hero-pill reveal">For Real Estate Pros Who Want More</div>
          <h1 className="reveal d1">
            Build the Real Estate<br />
            Business <span className="gradient-text">You Actually Want</span>.
          </h1>
          <p className="hero-sub reveal d2">
            One live Zoom mastermind for agents, brokers, and team leaders ready to scale past stalled pipelines, hire-and-pray recruiting, and the solo-producer ceiling — hosted by John Wentworth.
          </p>
          <div className="hero-cta-group reveal d3">
            <a href="#register" className="btn-primary">Reserve My Free Spot<Arrow /></a>
            <a href="#agenda" className="btn-ghost">What you&apos;ll get →</a>
          </div>
          <div className="hero-reassure reveal d4">
            <span>No cost</span>
            <span>No contracts</span>
            <span>Live with John</span>
          </div>
        </div>
      </section>

      {/* ── PROMO VIDEO ── */}
      <section className="promo-video-section">
        <div className="container">
          <div className="promo-video-wrap">
            <div className="promo-video-label reveal">
              <div className="section-eyebrow">Watch This First</div>
              <h2>What this <span className="gold">mastermind</span> is really about.</h2>
            </div>
            <div className="video-frame reveal d1">
              <div className="vimeo-wrapper">
                <iframe
                  src="https://player.vimeo.com/video/1197178860?h=77cd8670aa&badge=0&autopause=0&player_id=0&app_id=58479&loop=1"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="TWC_RealEstate_Promo1"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <div className="stats-strip">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item reveal"><div className="stat-num">$1B+</div><div className="stat-label">In Real Estate Sales</div></div>
            <div className="stat-item reveal d1"><div className="stat-num">#1</div><div className="stat-label">Independent Brokerage in Michigan</div></div>
            <div className="stat-item reveal d2"><div className="stat-num">500+</div><div className="stat-label">Members Growing Together</div></div>
          </div>
        </div>
      </div>

      {/* ── WHAT YOU'LL LEARN ── */}
      <section className="learn-section">
        <div className="container">
          <div className="learn-header">
            <div className="section-eyebrow reveal">What You&apos;ll Walk Away With</div>
            <h2 className="section-title reveal d1">Five real-estate problems,<br /><span className="gold">solved on one call</span>.</h2>
            <p className="section-sub reveal d2" style={{ margin: '0 auto' }}>
              No theory. No fluff. Just the specific frameworks John used to build the #1 independent brokerage in Michigan — translated for where you are right now.
            </p>
          </div>
          <div className="learn-grid">
            {LEARN_CARDS.map(c => (
              <div className={`l-card reveal${c.d}`} key={c.title}>
                <div className="l-icon" aria-hidden="true">{c.icon}</div>
                <div className="l-title">{c.title}</div>
                <div className="l-desc">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOST SECTION ── */}
      <section className="host-section" id="about">
        <div className="container">
          <div className="host-grid">
            <div className="host-photo-wrap reveal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/john-wentworth.jpg" alt="John Wentworth, CEO of Wentworth Real Estate Group" />
              <div className="host-photo-tag">Your host</div>
            </div>
            <div className="host-content reveal d1">
              <div className="section-eyebrow">Meet Your Mentor</div>
              <h2>The operator behind <span className="gold">$1B in sales</span>.</h2>
              <div className="host-quote">&quot;My mission is clear — develop people &amp; change lives.&quot;</div>
              <p>
                At 35, John went from completely broke to building a 7-figure real estate business from the ground up. His journey — through childhood trauma, addiction, and reclaiming his life through sobriety — shaped a leader defined by transparency, heart, and zero BS.
              </p>
              <p>
                Today, as CEO of the #1 Independent Large Team Brokerage in Michigan with over $1 billion in sales, John leads 100+ professionals while mentoring real estate operators to scale past the ceilings that keep most agents stuck.
              </p>
              <div className="host-achievements">
                <div className="ha"><div className="ha-num">$1B+</div><div className="ha-label">Total Sales Volume</div></div>
                <div className="ha"><div className="ha-num">#1</div><div className="ha-label">Indie Brokerage in MI</div></div>
                <div className="ha"><div className="ha-num">100+</div><div className="ha-label">Professionals on His Team</div></div>
                <div className="ha"><div className="ha-num">20yr</div><div className="ha-label">Entrepreneurial Experience</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AGENDA ── */}
      <section className="agenda-section" id="agenda">
        <div className="container">
          <div className="agenda-header">
            <div className="section-eyebrow reveal">What to Expect</div>
            <h2 className="section-title reveal d1">Your <span className="gold">60-minute</span> agenda.</h2>
            <p className="section-sub reveal d2" style={{ margin: '0 auto' }}>
              Show up live. Bring one problem you want solved. Leave with a plan.
            </p>
          </div>
          <div className="agenda-list">
            {AGENDA.map((item, i) => (
              <div className={`agenda-item reveal${item.d}`} key={item.title}>
                <div className="agenda-num">0{i + 1}</div>
                <div>
                  <div className="agenda-title">{item.title}</div>
                  <div className="agenda-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCARCITY ── */}
      <section className="scarcity">
        <div className="container">
          <div className="scarcity-inner reveal">
            <h3>This call is capped at <span className="gold">25 seats</span>.</h3>
            <p>
              We keep it small so John can actually see you, hear you, and coach you live. <strong>Recording is not guaranteed</strong> — if you want the room, you have to be in the room.
            </p>
          </div>
        </div>
      </section>

      {/* ── REGISTRATION FORM ── */}
      <section className="register-section" id="register">
        <div className="container">
          <div className="register-urgency reveal">
            <span className="ru-text">Limited seating — Spots filling up fast!</span>
            <span className="ru-countdown">{countdown}</span>
          </div>
          <div className="register-box reveal">
            {submitted ? (
              <div className="register-header" style={{ marginBottom: 0 }}>
                <div className="section-eyebrow">You&apos;re In</div>
                <h2>Your spot is <span className="gold">reserved</span>.</h2>
                <p>
                  Keep an eye on your inbox — we&apos;ll send your Zoom link and a calendar invite shortly. Show up live, bring one problem you want solved, and leave with a plan.
                </p>
              </div>
            ) : (
              <>
                <div className="register-header">
                  <div className="section-eyebrow">Reserve My Spot</div>
                  <h2>One free seat. One live call.<br /><span className="gold">Zero fluff—Just work</span>.</h2>
                  <p>Fill this out and we&apos;ll send you the Zoom link plus a calendar invite. <strong style={{ color: 'var(--gold)' }}>Spots are first-come, first-served.</strong></p>
                </div>
                <form className="form-grid" onSubmit={handleSubmit}>
                  <div className="form-field">
                    <label htmlFor="firstName">First name</label>
                    <input id="firstName" name="firstName" type="text" autoComplete="given-name" required />
                  </div>
                  <div className="form-field">
                    <label htmlFor="lastName">Last name</label>
                    <input id="lastName" name="lastName" type="text" autoComplete="family-name" required />
                  </div>
                  <div className="form-field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" autoComplete="email" required />
                  </div>
                  <div className="form-field">
                    <label htmlFor="phone">Phone</label>
                    <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(555) 555-5555" required />
                  </div>
                  <div className="form-field full">
                    <label htmlFor="brokerage">Brokerage / team</label>
                    <input id="brokerage" name="brokerage" type="text" required />
                  </div>
                  <div className="date-picker" role="radiogroup" aria-labelledby="dateLabel">
                    <span className="date-label" id="dateLabel">Which call do you want to join?</span>
                    {sessions.length === 0 ? (
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '4px 0 0' }}>
                        New call dates are being scheduled — check back soon, or reach out and we&apos;ll let you know.
                      </p>
                    ) : (
                      <div className="date-options">
                        {sessions.map((s, i) => {
                          const parts = s.label.split('·');
                          return (
                            <label className="date-card" key={s.id}>
                              <input type="radio" name="sessionId" value={s.id} required defaultChecked={sessions.length === 1 || i === 0 ? false : undefined} />
                              <span className="date-main">{parts[0].trim()}</span>
                              {parts[1] && <span className="date-time">{parts[1].trim()}</span>}
                              <span className="date-check" aria-hidden="true" />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="form-field full">
                    <label htmlFor="problem">What&apos;s the #1 thing you want John to help you solve?</label>
                    <textarea id="problem" name="problem" rows={3} placeholder="e.g., my pipeline goes cold every 90 days, recruiting drains my time, I can't get past $X in GCI..." />
                  </div>
                  <label className="form-field full" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', flexDirection: 'row' }}>
                    <input type="checkbox" name="smsConsent" style={{ marginTop: 3, accentColor: 'var(--gold)' }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                      Text me reminders &amp; updates about the call (optional). Msg &amp; data rates may apply; reply STOP to opt out anytime.
                    </span>
                  </label>
                  <button type="submit" className="btn-primary form-submit" disabled={submitting}>
                    {submitting ? 'Reserving…' : 'Reserve My Free Spot'}
                    <Arrow />
                  </button>
                  {submitError && (
                    <p className="form-reassure" style={{ color: '#ff6b6b' }}>{submitError}</p>
                  )}
                  <p className="form-reassure">Free · No contracts · Cancel any future communication anytime</p>
                </form>
              </>
            )}
          </div>

          {/* ── Promo membership CTA (below the free call signup) ── */}
          <div
            className="reveal"
            style={{
              maxWidth: 620, margin: '28px auto 0',
              background: 'linear-gradient(180deg,#141414,#0e0e0e)',
              border: '1px solid rgba(201,168,76,0.35)', borderRadius: 18,
              padding: '32px 26px', textAlign: 'center',
            }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,77,77,0.14)', border: '1px solid rgba(255,77,77,0.5)',
              color: '#ff6b6b', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em',
              textTransform: 'uppercase', padding: '6px 14px', borderRadius: 999, marginBottom: 14,
            }}>
              🔥 Limited Promo · 50% Off
            </div>
            <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', margin: '4px 0 12px', lineHeight: 1.2 }}>
              Save <span className="gold">50%</span> on 4 Months of The Winners Circle!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 440, margin: '0 auto 22px', lineHeight: 1.6 }}>
              Full access to the community, courses, challenges, and live events.
            </p>

            {/* Price-cut badge: $600 → $300 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{
                fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
                textDecoration: 'line-through', textDecorationColor: '#ff4d4d', textDecorationThickness: 3,
              }}>$600</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 22 }}>→</span>
              <span style={{ fontSize: 44, fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>$300</span>
              <span style={{
                background: '#ff4d4d', color: '#fff', fontWeight: 800, fontSize: 12,
                padding: '4px 10px', borderRadius: 8, letterSpacing: '0.04em',
              }}>SAVE 50%</span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>for your first 4 months</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 22 }}>
              then <strong style={{ color: 'var(--gold)' }}>$150/mo</strong> ongoing
            </p>
            <Link href="/real-estate/join" className="btn-primary" style={{ display: 'inline-flex' }}>
              Become a Member <Arrow />
            </Link>
            <p className="form-reassure" style={{ marginTop: 14 }}>$300 today (normally $600) · covers your first 4 months · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="faq-section">
        <div className="container">
          <div className="faq-header">
            <div className="section-eyebrow reveal">FAQ</div>
            <h2 className="section-title reveal d1">Real questions, <span className="gold">real answers</span>.</h2>
          </div>
          <div className="faq-list">
            {FAQS.map(f => (
              <details className="faq-item reveal" key={f.q}>
                <summary>{f.q}
                  <span className="faq-icon" aria-hidden="true">+</span>
                </summary>
                <div className="faq-answer">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="container">
          <div className="footer-inner">
            <div className="footer-logo">The Winners <span>Circle</span></div>
            <div className="footer-links">
              <Link href="/terms">Terms &amp; Conditions</Link>
              <span className="footer-sep">·</span>
              <Link href="/privacy">Privacy Policy</Link>
              <span className="footer-sep">·</span>
              <a href="#register">Reserve My Spot</a>
            </div>
            <div className="footer-copy">© The Winners Circle · All Rights Reserved</div>
          </div>
        </div>
      </footer>

      {/* ── STICKY MOBILE CTA ── */}
      <div className="sticky-cta" ref={stickyRef}>
        <a href="#register">
          Reserve My Free Spot
          <Arrow size={14} />
        </a>
      </div>

    </div>
  );
}
