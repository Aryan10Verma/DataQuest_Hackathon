import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMarketMap } from '@/api/hooks';
import type { RegionDemand } from '@/api/types';
import { homeFor, useSession } from '@/auth/session';
import { sectorLabel } from '@/lib/format';
import { Logo } from '@/shell/Brand';
import { CITIES } from '@/components/map/cities';
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

/** Text split into letters for the letter-by-letter reveal. Screen readers get the plain text. */
function Split({ text, as: Tag = 'span', className = '' }: { text: string; as?: 'h1' | 'h2' | 'h3' | 'span' | 'p'; className?: string }) {
  return (
    // The letters are split for animation and hidden from screen readers, which read the whole text instead.
    <Tag className={`split ${className}`}>
      <span className="sr-only">{text}</span>
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

const BRAINS = ['top', 'left', 'front', 'right', 'back'] as const;
// Pixel sizes of the 1600px views, so each one takes its shape before its file arrives.
const BRAIN_HEIGHT: Record<(typeof BRAINS)[number], number> = { top: 1592, left: 1239, front: 1413, right: 1215, back: 1528 };
const INSTRUMENTS = ['Interests', 'Aptitude', 'Thinking style', 'Values', 'Family budget', 'Job market'];

// The scroll story: five views of the brain (what PRISM measures), a fly into the neural network
// (how it connects into one score), then out onto India (where those strengths are needed).
const STORY: { key: string; rail: string; where: string; title: string; facts: [string, string][]; lit: number[] }[] = [
  {
    key: 'top', rail: 'The whole you', where: 'From above', title: 'The whole student',
    facts: [
      ['Four sides of you', 'Interests, aptitude, thinking style and values, in one 25-minute questionnaire.'],
      ['And your family', 'The budget and hopes your parents add, kept private.'],
    ],
    lit: [0, 1, 2, 3, 4],
  },
  {
    key: 'left', rail: 'Interests', where: 'Left side', title: 'Interests',
    facts: [
      ['What you enjoy', 'Activities, not job titles.'],
      ['About 4 minutes', 'Your top three become your Holland code.'],
    ],
    lit: [0],
  },
  {
    key: 'front', rail: 'Aptitude', where: 'Front', title: 'Aptitude',
    facts: [
      ['What comes easily', 'Numbers, words, logic and shapes.'],
      ['About 15 minutes', 'Corrected for lucky guesses.'],
    ],
    lit: [1],
  },
  {
    key: 'right', rail: 'Thinking and values', where: 'Right side', title: 'Thinking and values',
    facts: [
      ['How you solve problems', 'Analytical, creative or practical.'],
      ['What matters to you', 'Security, freedom, impact or pay, and how much risk you would take.'],
    ],
    lit: [2, 3],
  },
  {
    key: 'back', rail: 'Family and money', where: 'Back', title: 'Family and money',
    facts: [
      ['What your family can do', 'Budget, savings and loans, added privately by a parent.'],
      ['Where you agree', 'Where you and your parents differ, and careers you could both back.'],
    ],
    lit: [4],
  },
  {
    key: 'neural', rail: 'Connections', where: 'Closer', title: 'How it all connects',
    facts: [
      ['Six parts, one score', 'Fit, job market, affordability, return on cost, family agreement and automation risk.'],
      ['Every link shown', 'How much each part added, and where every number came from.'],
    ],
    lit: [0, 1, 2, 3, 4, 5],
  },
  {
    key: 'map', rail: 'Where you are needed', where: 'India', title: 'Where you are needed',
    facts: [
      ['Job demand by city', 'The brighter the point, the more openings in the careers PRISM tracks.'],
      ['Your city matters', 'It changes the jobs, colleges and exams PRISM shows you.'],
    ],
    lit: [5],
  },
];

const src = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const pic = (name: string, small: number, large: number, sizes: string) => ({
  src: src(`${name}.webp`),
  srcSet: `${src(`${name}-sm.webp`)} ${small}w, ${src(`${name}.webp`)} ${large}w`,
  sizes,
});
const BRAIN_SIZES = '(max-width: 760px) 92vw, 62vh'; // index.html preloads the top view with the same sizes
const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const masterRef = useRef<gsap.core.Timeline | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [step, setStep] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const { status, user } = useSession();
  const navigate = useNavigate();
  const market = useMarketMap();
  const demand = useMemo(() => new Map((market.data ?? []).map((r) => [r.region.code, r])), [market.data]);
  // The first brain gets the connection to itself: the other views, the close-up and the map only
  // start downloading once it has arrived (or after 4 s, whatever happens).
  const [rest, setRest] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setRest(true), 4000);
    return () => window.clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lenis: Lenis | null = null;
    const tick = (t: number) => lenis?.raf(t * 1000);
    if (!RM) {
      lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1.2, touchMultiplier: 1.6 });
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

      // Camera fly-through: the current view grows past the camera and dissolves while the next one
      // comes into focus from slightly smaller. Scrubbed, so it plays backwards just as smoothly.
      const fly = (tl: gsap.core.Timeline, from: gsap.TweenTarget, to: gsap.TweenTarget, at: number, depth = 1.6) => {
        if (RM) {
          tl.to(from, { autoAlpha: 0, duration: 0.5 }, at).to(to, { autoAlpha: 1, duration: 0.5 }, at + 0.3);
          return;
        }
        tl.to(from, { scale: depth, autoAlpha: 0, duration: 0.75, ease: 'power2.in' }, at);
        tl.fromTo(to, { scale: 0.78, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.85, ease: 'power3.out' }, at + 0.3);
      };

      const mm = gsap.matchMedia();
      mm.add({ desktop: '(min-width: 761px)', mobile: '(max-width: 760px)' }, (c) => {
        const desktop = !!c.conditions?.desktop;
        const brains = q('.l-brain') as HTMLElement[];
        const copies = q('.l-copy') as HTMLElement[];
        const shift = desktop ? '17vw' : '0vw';

        const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
        const showAt: number[] = [];

        // Opening: the giant word spreads and dissolves, the hero copy lifts, the brain slides aside.
        tl.fromTo('.l-word', { opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: RM ? 'blur(0px)' : 'blur(10px)', duration: 0.7, ease: 'power2.in' }, 0);
        if (!RM) tl.to('.l-word', { letterSpacing: '0.4em', duration: 0.8, ease: 'power2.in' }, 0);
        tl.fromTo('.l-hero', { opacity: 1, y: 0 }, { opacity: 0, y: RM ? 0 : -20, duration: 0.4 }, 0);
        tl.set('.l-hero', { visibility: 'hidden' }, 0.45);
        tl.to('.l-brains, .l-neural, .l-map', { x: shift, duration: 1.2 }, 0.1);

        let t = 0.9;
        copies.forEach((copy, i) => {
          if (i > 0) {
            tl.to(copies[i - 1], { autoAlpha: 0, y: RM ? 0 : -40, duration: 0.5, ease: 'power2.in' }, t);
            if (i < 5) {
              fly(tl, brains[i - 1], brains[i], t + 0.15);
            } else if (i === 5) {
              // Into the brain: the back view rushes past and the neural network opens up.
              fly(tl, brains[4], '.l-neural', t + 0.15, 3.2);
            } else {
              // And back out: the network shrinks to a point and India opens around it.
              if (RM) {
                tl.to('.l-neural', { autoAlpha: 0, duration: 0.5 }, t + 0.15).to('.l-map', { autoAlpha: 1, duration: 0.5 }, t + 0.45);
              } else {
                tl.to('.l-neural', { scale: 0.12, autoAlpha: 0, duration: 0.8, ease: 'power3.in' }, t + 0.15);
                tl.fromTo('.l-map', { scale: 2.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.95, ease: 'power3.out' }, t + 0.5);
              }
              tl.fromTo('.l-city', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4, stagger: 0.025, ease: 'back.out(2)' }, t + 1.0);
              tl.set('.l-map', { pointerEvents: 'auto' }, t + 1.3);
            }
            t += i >= 5 ? 1.5 : 1.1;
          }
          showAt.push(t);
          tl.set(copy, { autoAlpha: 1, y: 0 }, t);
          tl.fromTo(chars(copy.querySelector('h2 .split')), HIDDEN, { ...SHOWN, duration: 0.5, stagger: 0.03, ease: 'power3.out' }, t);
          copy.querySelectorAll('.l-fact').forEach((fact, k) => {
            const at = t + 0.15 + k * 0.16;
            tl.fromTo(chars(fact.querySelector('h3')), HIDDEN, { ...SHOWN, duration: 0.5, stagger: 0.02, ease: 'power3.out' }, at);
            tl.fromTo(fact.querySelectorAll('p'), { opacity: 0, y: RM ? 0 : 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, at + 0.2);
          });
          tl.addLabel(`v${i}`, t + 0.95);
          t += 1.5;
        });
        t += 0.3;

        tl.eventCallback('onUpdate', () => {
          let i = -1;
          showAt.forEach((s, k) => {
            if (tl.time() >= s - 0.05) i = k;
          });
          setStep(i);
        });

        ScrollTrigger.create({
          animation: tl,
          trigger: '.l-stage',
          start: 'top top',
          // About half a screen of scrolling per unit of timeline.
          end: () => `+=${window.innerHeight * t * 0.45}`,
          pin: true,
          scrub: RM ? true : 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        });
        masterRef.current = tl;
        return () => {
          masterRef.current = null;
        };
      });

      // The one page-load moment: the brain comes into focus and the word appears.
      if (!RM) {
        gsap.timeline({ defaults: { ease: 'power3.out' } })
          .fromTo('.l-brain.is-top', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.4 }, 0.15)
          .fromTo(chars(q('.l-word')[0]), HIDDEN, { ...SHOWN, duration: 0.8, stagger: 0.05 }, 0.3)
          .fromTo('.l-hero, .l-bar', { opacity: 0 }, { opacity: 1, duration: 0.9, stagger: 0.1 }, 0.9);
        gsap.to('.l-float', { y: -12, duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
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
  const lit = step >= 0 ? STORY[step].lit : [];
  const pickedCity = picked ? demand.get(picked) : undefined;
  const pickedAt = CITIES.find((c) => c.code === picked);

  return (
    <div className="landing" ref={root}>
      <header className="l-top">
        <Logo tagline />
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
          <Split text="PRISM" as="p" className="l-word" />

          <div className="l-brains" aria-hidden>
            <div className="l-float">
              {BRAINS.map((b, i) => (
                <img
                  key={b}
                  className={`l-brain is-${b}`}
                  width={1600}
                  height={BRAIN_HEIGHT[b]}
                  {...(i === 0 || rest ? pic(`brain/${b}`, 800, 1600, BRAIN_SIZES) : {})}
                  onLoad={i === 0 ? () => setRest(true) : undefined}
                  onError={i === 0 ? () => setRest(true) : undefined}
                  alt=""
                  decoding="async"
                />
              ))}
            </div>
          </div>
          <div className="l-neural" aria-hidden>
            <img {...(rest ? pic('brain/neural', 1200, 2400, '(max-width: 760px) 140vw, min(110vh, 120vw)') : {})} alt="" decoding="async" />
          </div>

          {/* The map image is screen-blended like the brain; the points and the card sit in a twin layer
              on top that isn't blended, so text and the card's glass stay crisp. Both move together. */}
          <div className="l-map" aria-hidden>
            <div className="l-map-inner">
              <img {...(rest ? pic('map/india', 1200, 2400, '(max-width: 760px) 90vw, 70vh') : {})} alt="" decoding="async" />
            </div>
          </div>
          <div className="l-map l-map-ui" role="group" aria-label="Job demand by city across India">
            <div className="l-map-inner" onMouseLeave={() => setPicked(null)}>
              {CITIES.map((c) => {
                const d = demand.get(c.code);
                const size = d ? 8 + d.demand_index * 14 : 6;
                return (
                  <button
                    key={c.code}
                    type="button"
                    className={`l-city ${d ? '' : 'is-quiet'} ${c.side === 'left' ? 'is-left' : ''} ${picked === c.code ? 'is-picked' : ''}`}
                    style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, ['--s' as string]: `${size}px`, ['--g' as string]: d ? (0.35 + d.demand_index * 0.65).toFixed(2) : '0.2' }}
                    onClick={() => setPicked(picked === c.code ? null : c.code)}
                    onMouseEnter={() => setPicked(c.code)}
                    onFocus={() => setPicked(c.code)}
                    aria-label={d ? `${c.name}: job demand ${pct(d.demand_index)}` : `${c.name}: data coming soon`}
                  >
                    <span className="dot" aria-hidden />
                    <span className="name" aria-hidden>{c.name}</span>
                  </button>
                );
              })}
              {pickedCity && pickedAt && <CityCard city={pickedCity} x={pickedAt.x} y={pickedAt.y} />}
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

          {STORY.map((s) => (
            <article key={s.key} className="l-copy" aria-label={s.title}>
              <h2>
                <span className="where">{s.where}</span>
                <Split text={s.title} className="title" />
              </h2>
              {s.facts.map(([h, p]) => (
                <div key={h} className="l-fact">
                  <Split text={h} as="h3" />
                  <p>{p}</p>
                </div>
              ))}
            </article>
          ))}

          <nav className={`l-rail ${step < 0 ? 'is-idle' : ''}`} aria-label="Parts of the story">
            <span className="l-rail-marker" aria-hidden style={{ translate: `0 ${Math.max(step, 0) * 33.2}px`, opacity: step < 0 ? 0 : 1 }} />
            {STORY.map((s, i) => (
              <button key={s.key} type="button" className={step === i ? 'is-active' : ''} aria-current={step === i ? 'step' : undefined} onClick={() => goTo(i)}>
                {s.rail}
              </button>
            ))}
          </nav>

          <div className="l-bar">
            <div className="l-stat"><strong>74</strong><span>Questions</span></div>
            <div className="l-stat"><strong>25</strong><span>Minutes</span></div>
            <div className="l-stat"><strong>{market.data?.length || CITIES.length}</strong><span>Cities</span></div>
            <ul className="l-instruments" aria-label="What PRISM weighs">
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

/** The city under the pointer, in a small card beside its point (flipped left in the east). */
function CityCard({ city, x, y }: { city: RegionDemand; x: number; y: number }) {
  const growth = city.job_velocity;
  return (
    <div className={`l-citycard ${x > 0.55 ? 'is-left' : ''}`} style={{ left: `${x * 100}%`, top: `${y * 100}%` }} aria-live="polite">
      <p className="city">{city.region.name}</p>
      <div className="nums">
        <span><strong>{pct(city.demand_index)}</strong> demand</span>
        <span><strong>{growth >= 0 ? '+' : ''}{pct(growth)}</strong> hiring a year</span>
      </div>
      <p className="sectors">{city.top_sectors.map(sectorLabel).join(', ')}</p>
      {city.rising.length > 0 && <p className="rising">Rising: {city.rising.map((r) => r.name).join(', ')}</p>}
      {city.is_estimate && <p className="est">Estimates, not yet checked against a source.</p>}
    </div>
  );
}
