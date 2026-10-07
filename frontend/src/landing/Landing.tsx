import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homeFor, useSession } from '@/auth/session';
import { Logo } from '@/shell/Shell';
import { PARTS } from '@/components/parts';
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

/** Text split into letters for the letter-by-letter reveal. Screen readers get the plain text. */
function Split({ text, as: Tag = 'span', className = '' }: { text: string; as?: 'h1' | 'h2' | 'h3' | 'span' | 'p'; className?: string }) {
  return (
    <Tag className={`split ${className}`} aria-label={text}>
      {text.split(' ').map((word, wi, words) => (
        <span key={wi} aria-hidden>
          <span className="w">
            {[...word].map((ch, ci) => (
              <span key={ci} className="c">{ch}</span>
            ))}
          </span>
          {wi < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  );
}

// Each view of the scan is one part of the questionnaire.
const VIEWS = [
  {
    body: 'front', rail: 'Interests', view: 'Front view', title: 'Interests',
    facts: [
      ['What you enjoy', 'Fixing a fan, planning a science fair model, keeping shop accounts. Activities, not job titles.'],
      ['Six kinds of work', 'Building, investigating, creating, helping, leading and organising.'],
      ['About 4 minutes', 'Your top three become your Holland code, such as IAR.'],
    ],
  },
  {
    body: 'back', rail: 'Aptitude', view: 'Back view', title: 'Aptitude',
    facts: [
      ['What comes easily', 'Numbers, words, logic and shapes, from easy to hard.'],
      ["Guessing won't help", 'Scores are corrected for lucky guesses, so there is nothing to game.'],
      ['About 15 minutes', 'Take it in a second sitting if you prefer.'],
    ],
  },
  {
    body: 'left', rail: 'Thinking', view: 'Left side', title: 'Thinking style',
    facts: [
      ['How you solve problems', 'Analytical, creative or practical, and in what mix.'],
      ['Honest by design', "Some statements are worded in reverse, so agreeing with everything won't skew it."],
      ['About 2 minutes', 'Twelve short statements.'],
    ],
  },
  {
    body: 'right', rail: 'Values', view: 'Right side', title: 'Values, grit and risk',
    facts: [
      ['What matters to you', 'Security, independence, making a difference, or pay.'],
      ['Grit', 'How you keep going when something is hard.'],
      ['Appetite for risk', 'How comfortable you are with an uncertain path.'],
    ],
  },
  { body: 'top', rail: 'Full picture', view: 'From above', title: 'The full picture', facts: [] },
] as const;

const INSTRUMENTS = ['Interests', 'Aptitude', 'Thinking style', 'Values', 'Grit and risk'];
// Which instruments light up in the bar for each view.
const LIT: number[][] = [[0], [1], [2], [3, 4], [0, 1, 2, 3, 4]];

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const masterRef = useRef<gsap.core.Timeline | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [view, setView] = useState(-1);
  const { status, user } = useSession();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lenis: Lenis | null = null;
    const tick = (t: number) => lenis?.raf(t * 1000);
    if (!RM) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
      lenisRef.current = lenis;
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const ctx = gsap.context((self) => {
      const q = self.selector!;
      const chars = (el: Element | null) => (el ? el.querySelectorAll('.c') : []);
      const SHOWN = { opacity: 1, yPercent: 0, filter: 'blur(0px)' };
      const HIDDEN = RM ? { opacity: 0 } : { opacity: 0, yPercent: 70, filter: 'blur(8px)' };

      const turn = (tl: gsap.core.Timeline, from: Element, to: Element, at: number, rise: boolean) => {
        if (RM) {
          tl.to(from, { opacity: 0, duration: 0.5 }, at).to(to, { opacity: 1, duration: 0.5 }, at + 0.3);
        } else if (rise) {
          tl.to(from, { scale: 1.25, yPercent: -8, opacity: 0, duration: 0.6, ease: 'power2.in' }, at);
          tl.fromTo(to, { scale: 0.55, rotation: -30, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, at + 0.45);
        } else {
          tl.to(from, { scaleX: 0.06, opacity: 0, filter: 'brightness(2)', duration: 0.45, ease: 'power2.in' }, at);
          tl.fromTo(to, { scaleX: 0.06, opacity: 0, filter: 'brightness(2)' }, { scaleX: 1, opacity: 1, filter: 'brightness(1)', duration: 0.55, ease: 'power3.out' }, at + 0.45);
        }
      };

      const mm = gsap.matchMedia();
      mm.add({ desktop: '(min-width: 761px)', mobile: '(max-width: 760px)' }, (c) => {
        const desktop = !!c.conditions?.desktop;
        const bodies = q('.l-body') as HTMLElement[];
        const copies = q('.l-copy') as HTMLElement[];
        const shift = desktop ? '17vw' : '0vw';
        const RINGS = desktop
          ? [
              { x: '17vw', y: '-4vh', scale: 1.15 },
              { x: '31vw', y: '-24vh', scale: 0.9 },
              { x: '6vw', y: '18vh', scale: 0.75 },
              { x: '28vw', y: '22vh', scale: 1.25 },
              { x: '17vw', y: '13vh', scale: 1 },
            ]
          : [
              { x: 0, y: '-4vh', scale: 1.1 },
              { x: '22vw', y: '-12vh', scale: 0.8 },
              { x: '-18vw', y: '4vh', scale: 0.7 },
              { x: '16vw', y: '8vh', scale: 1.15 },
              { x: 0, y: '0vh', scale: 0.95 },
            ];

        const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
        const showAt: number[] = [];

        // The giant word spreads apart and dissolves; the hero copy lifts away.
        tl.fromTo('.l-word', { opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: RM ? 'blur(0px)' : 'blur(10px)', duration: 0.7, ease: 'power2.in' }, 0);
        if (!RM) tl.to('.l-word', { letterSpacing: '0.5em', duration: 0.8, ease: 'power2.in' }, 0);
        tl.fromTo('.l-hero', { opacity: 1, y: 0 }, { opacity: 0, y: RM ? 0 : -20, duration: 0.4 }, 0);
        tl.set('.l-hero', { visibility: 'hidden' }, 0.45);
        tl.to('.l-bodies', { x: shift, duration: 1.2 }, 0.1);
        tl.to('.l-ring', { ...RINGS[0], duration: 1.2 }, 0);

        let t = 0.9;
        copies.forEach((copy, i) => {
          if (i > 0) {
            tl.to(copies[i - 1], { autoAlpha: 0, y: RM ? 0 : -40, duration: 0.5, ease: 'power2.in' }, t);
            turn(tl, bodies[i - 1], bodies[i], t + 0.2, i === 4);
            tl.to('.l-ring', { ...RINGS[i], duration: 1.1 }, t + 0.1);
            if (!RM) {
              tl.fromTo('.l-scanline', { top: '0%', opacity: 0 }, { top: '100%', opacity: 1, duration: 0.8, ease: 'none' }, t + 0.45);
              tl.to('.l-scanline', { opacity: 0, duration: 0.15 }, t + 1.15);
            }
            t += 1.1;
          }
          showAt.push(t);
          tl.set(copy, { autoAlpha: 1, y: 0 }, t);
          tl.fromTo(chars(copy.querySelector('h2')), HIDDEN, { ...SHOWN, duration: 0.5, stagger: 0.03, ease: 'power3.out' }, t);
          copy.querySelectorAll('.l-fact, .l-parts li').forEach((fact, k) => {
            const at = t + 0.15 + k * 0.16;
            const h = fact.querySelector('h3, .strong-split');
            if (h) tl.fromTo(chars(h), HIDDEN, { ...SHOWN, duration: 0.5, stagger: 0.02, ease: 'power3.out' }, at);
            const rest = fact.querySelectorAll('p, .help, .swatch');
            tl.fromTo(rest, { opacity: 0, y: RM ? 0 : 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, at + 0.2);
          });
          tl.addLabel(`v${i}`, t + 0.95);
          t += 1.8;
        });

        tl.to(copies[copies.length - 1], { autoAlpha: 0, y: RM ? 0 : -40, duration: 0.5, ease: 'power2.in' }, t);
        tl.to('.l-bodies', { opacity: 0.2, duration: 0.8 }, t);
        tl.to('.l-ring', { x: shift, y: '6vh', scale: RM ? 1 : 1.9, opacity: 0.25, duration: 0.9 }, t);
        t += 0.9;

        tl.eventCallback('onUpdate', () => {
          let i = -1;
          showAt.forEach((s, k) => {
            if (tl.time() >= s - 0.05) i = k;
          });
          setView(i);
        });

        ScrollTrigger.create({
          animation: tl,
          trigger: '.l-stage',
          start: 'top top',
          end: () => `+=${window.innerHeight * t * 0.9}`,
          pin: true,
          scrub: RM ? true : 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        });
        masterRef.current = tl;
        return () => {
          masterRef.current = null;
        };
      });

      // The one page-load moment: the ring draws, the body and the word appear.
      if (!RM) {
        const circ = 2 * Math.PI * 88;
        gsap.timeline({ defaults: { ease: 'power3.out' } })
          .fromTo('.l-ring circle', { strokeDasharray: circ, strokeDashoffset: circ }, { strokeDashoffset: 0, duration: 1.8, ease: 'power3.inOut' }, 0)
          .fromTo('.l-body.is-front', { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 1.6 }, 0.2)
          .fromTo(chars(q('.l-word')[0]), HIDDEN, { ...SHOWN, duration: 0.9, stagger: 0.06 }, 0.4)
          .fromTo('.l-hero, .l-rail, .l-bar', { opacity: 0 }, { opacity: 1, duration: 1, stagger: 0.1 }, 1.1);
        gsap.to('.l-bodies-inner', { y: -12, duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      }
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    return () => {
      window.removeEventListener('load', refresh);
      ctx.revert();
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, []);

  const goTo = (i: number) => {
    const st = masterRef.current?.scrollTrigger;
    if (!st) return;
    const y = st.labelToScroll(`v${i}`);
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.6 });
    else window.scrollTo({ top: y });
  };
  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) lenisRef.current.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView();
  };

  const signedIn = status === 'signed-in' && user;
  const lit = view >= 0 ? LIT[view] : [];

  return (
    <div className="landing" ref={root}>
      <header className="l-top">
        <Logo />
        <nav aria-label="Main">
          <a href="#how" className="hide-sm" onClick={(e) => { e.preventDefault(); scrollToId('how'); }}>How it works</a>
          <Link to="/how-we-know" className="hide-sm">How we know</Link>
          {signedIn ? (
            <button className="btn-quiet min-h-[40px]" onClick={() => navigate(homeFor(user.role))}>Open PRISM</button>
          ) : (
            <>
              <Link to="/signin">Sign in</Link>
              <Link to="/register" className="btn-quiet min-h-[40px]">Create account</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="l-stage" aria-label="How PRISM reads a student">
          <div className="l-guides" aria-hidden><i /><i /><i /><i /><i /></div>
          <svg className="l-ring" viewBox="0 0 200 200" aria-hidden><circle cx="100" cy="100" r="88" /></svg>
          <Split text="PRISM" as="p" className="l-word" />

          <div className="l-bodies" aria-hidden>
            <div className="l-bodies-inner">
              {VIEWS.map((v) => (
                <img key={v.body} className={`l-body is-${v.body}`} src={`/scan/${v.body}.webp`} alt="" />
              ))}
              <span className="l-scanline" />
            </div>
          </div>

          <div className="l-hero">
            <h1>See every path. Choose yours together.</h1>
            <p>Career guidance that weighs your interests, your family's budget and real job demand, and shows its working.</p>
            <div className="ctas">
              <Link to="/register" className="btn-primary">Create account</Link>
              <Link to="/signin" className="btn-quiet">Sign in</Link>
            </div>
          </div>

          {VIEWS.map((v, i) => (
            <article key={v.body} className="l-copy" aria-label={v.title}>
              <h2>
                <Split text={v.title} />
                <span className="view">{v.view}</span>
              </h2>
              {i < 4 ? (
                v.facts.map(([h, p]) => (
                  <div key={h} className="l-fact">
                    <Split text={h} as="h3" />
                    <p>{p}</p>
                  </div>
                ))
              ) : (
                <ul className="l-parts">
                  {PARTS.map((p) => (
                    <li key={p.key}>
                      <span className={`swatch ${p.key === 'disruption' ? 'hatch' : ''}`} style={p.key === 'disruption' ? undefined : { background: p.color }} />
                      <Split text={p.label} as="span" className="strong-split" />
                      <span className="help">{p.help}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}

          <nav className="l-rail" aria-label="Parts of the scan">
            <span className="l-rail-marker" aria-hidden style={{ translate: `0 ${Math.max(view, 0) * 33.2}px`, opacity: view < 0 ? 0 : 1 }} />
            {VIEWS.map((v, i) => (
              <button key={v.body} type="button" className={view === i ? 'is-active' : ''} aria-current={view === i ? 'step' : undefined} onClick={() => goTo(i)}>
                {v.rail}
              </button>
            ))}
          </nav>

          <div className="l-bar">
            <div className="l-stat"><strong>74</strong><span>Questions</span></div>
            <div className="l-stat"><strong>25</strong><span>Minutes</span></div>
            <div className="l-stat"><strong>6</strong><span>Score parts</span></div>
            <ul className="l-instruments" aria-label="Questionnaire sections">
              {INSTRUMENTS.map((name, i) => (
                <li key={name} className={lit.includes(i) ? 'is-on' : ''}>{name}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="l-steps" id="how" aria-labelledby="how-title">
          <h2 id="how-title">From a questionnaire to a plan your family agrees on</h2>
          <ol>
            <li>
              <h3>Know yourself</h3>
              <p>A 25-minute questionnaire on your interests, aptitude, thinking style and values. No right answers.</p>
            </li>
            <li>
              <h3>Plan with your family</h3>
              <p>Parents add the budget privately. See costs, scholarships and loans, and talk through where you differ.</p>
            </li>
            <li>
              <h3>See your future</h3>
              <p>A five-year roadmap with exam dates, deadlines and real problems to work on in your own district.</p>
            </li>
          </ol>
        </section>

        <section className="l-close">
          <div className="grid gap-3">
            <p>Every number shows its source and whether it has been checked.</p>
            <Link to="/how-we-know" className="btn-text min-h-0 justify-self-start">See where our data comes from</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/register" className="btn-primary">Create account</Link>
            <Link to="/signin" className="btn-quiet">Sign in</Link>
          </div>
        </section>
      </main>
      <footer className="l-foot">PRISM, built for DataQuest 3.0. Figures marked as estimates have not been checked against their source yet.</footer>
    </div>
  );
}
