(() => {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Which body systems light up for each view (-1 = hero).
  const SYSTEMS = [
    ['cardio', 'respiratory'],
    ['skeletal', 'muscular'],
    ['neural', 'skeletal'],
    ['digestive', 'cardio'],
    ['neural', 'cardio', 'respiratory', 'digestive', 'skeletal', 'muscular'],
  ];

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!RM && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToY = (y) =>
    lenis ? lenis.scrollTo(y, { duration: 1.6 }) : window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });

  /* ---------- split headings into letters ---------- */
  const charsOf = new Map();
  document.querySelectorAll('.split').forEach((el) => {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const frag = document.createDocumentFragment();
    const chars = [];
    el.childNodes.forEach((node) => {
      if (node.nodeName === 'BR') return frag.appendChild(document.createElement('br'));
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          if (frag.lastChild && frag.lastChild.nodeName !== 'BR') frag.appendChild(document.createTextNode(' '));
          return;
        }
        const word = document.createElement('span');
        word.className = 'w';
        for (const ch of part) {
          const c = document.createElement('span');
          c.className = 'c';
          c.textContent = ch;
          word.appendChild(c);
          chars.push(c);
        }
        frag.appendChild(word);
      });
    });
    el.textContent = '';
    el.appendChild(frag);
    el.setAttribute('aria-label', label);
    [...el.children].forEach((n) => n.setAttribute('aria-hidden', 'true'));
    charsOf.set(el, chars);
  });

  const SHOWN = { opacity: 1, yPercent: 0, filter: 'blur(0px)' };
  const HIDDEN_BELOW = RM ? { opacity: 0 } : { opacity: 0, yPercent: 70, filter: 'blur(8px)' };

  function revealChars(tl, el, at, stagger = 0.025) {
    tl.fromTo(charsOf.get(el), HIDDEN_BELOW, { ...SHOWN, duration: 0.5, stagger, ease: 'power3.out' }, at);
  }

  // A turntable turn between two views: squeeze to a sliver, swap, open up.
  function turn(tl, from, to, at, rise) {
    if (RM) {
      tl.to(from, { opacity: 0, duration: 0.5 }, at);
      tl.to(to, { opacity: 1, duration: 0.5 }, at + 0.3);
    } else if (rise) {
      // Camera rises above the body for the top-down view.
      tl.to(from, { scale: 1.25, yPercent: -8, opacity: 0, duration: 0.6, ease: 'power2.in' }, at);
      tl.fromTo(to, { scale: 0.55, rotation: -30, opacity: 0 },
        { scale: 1, rotation: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, at + 0.45);
    } else {
      tl.to(from, { scaleX: 0.06, opacity: 0, filter: 'brightness(2)', duration: 0.45, ease: 'power2.in' }, at);
      tl.fromTo(to, { scaleX: 0.06, opacity: 0, filter: 'brightness(2)' },
        { scaleX: 1, opacity: 1, filter: 'brightness(1)', duration: 0.55, ease: 'power3.out' }, at + 0.45);
    }
  }

  /* ---------- UI that follows the scroll position ---------- */
  const railButtons = [...document.querySelectorAll('.rail button')];
  const railMarker = document.querySelector('.rail-marker');
  const systemItems = [...document.querySelectorAll('.systems li')];
  const navLinks = [...document.querySelectorAll('.nav a')];
  let current = null;

  function setView(i) {
    if (i === current) return;
    current = i;
    railButtons.forEach((b, k) => {
      b.classList.toggle('is-active', k === i);
      if (k === i) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    const target = railButtons[Math.max(i, 0)];
    railMarker.style.translate = `0 ${target.offsetTop - 4}px`;
    railMarker.style.opacity = i < 0 ? '0' : '1';
    const on = SYSTEMS[i] || [];
    systemItems.forEach((li) => li.classList.toggle('is-on', on.includes(li.dataset.system)));
    const navIndex = i < 0 ? 0 : i < 4 ? 1 : 2;
    navLinks.forEach((a, k) => a.classList.toggle('is-active', k === navIndex));
  }

  /* ---------- the scroll timeline ---------- */
  let master = null;
  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 761px)', mobile: '(max-width: 760px)' }, (ctx) => {
    const { desktop } = ctx.conditions;
    const bodies = gsap.utils.toArray('.body');
    const copies = gsap.utils.toArray('.view-copy');
    const shift = desktop ? '17vw' : '0vw';

    // Where the ring sits for each view, relative to its hero position.
    const RINGS = desktop
      ? [
          { x: '17vw', y: '-4vh', scale: 1.15 },
          { x: '31vw', y: '-24vh', scale: 0.9 },
          { x: '6vw', y: '18vh', scale: 0.75 },
          { x: '28vw', y: '22vh', scale: 1.25 },
          { x: '17vw', y: '13vh', scale: 1 },
        ]
      : [
          { x: 0, y: '-6vh', scale: 1.1 },
          { x: '22vw', y: '-14vh', scale: 0.8 },
          { x: '-18vw', y: '4vh', scale: 0.7 },
          { x: '16vw', y: '10vh', scale: 1.15 },
          { x: 0, y: '0vh', scale: 0.95 },
        ];

    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    const showAt = [];

    // Hero leaves: headline lifts away, body and ring slide right.
    // The headline behind the body spreads apart and dissolves.
    tl.fromTo('.hero-title', { opacity: 1, filter: 'blur(0px)' },
      { opacity: 0, filter: RM ? 'blur(0px)' : 'blur(10px)', duration: 0.7, ease: 'power2.in' }, 0);
    if (!RM) tl.to('.hero-title', { letterSpacing: '0.42em', duration: 0.8, ease: 'power2.in' }, 0);
    tl.fromTo('.hero-sub', { opacity: 1, y: 0 }, { opacity: 0, y: RM ? 0 : -20, duration: 0.4 }, 0);
    tl.to('.bodies', { x: shift, duration: 1.2 }, 0.1);
    tl.to('.ring', { ...RINGS[0], duration: 1.2 }, 0);

    let t = 0.9;
    copies.forEach((copy, i) => {
      if (i > 0) {
        tl.to(copies[i - 1], { autoAlpha: 0, y: RM ? 0 : -40, duration: 0.5, ease: 'power2.in' }, t);
        turn(tl, bodies[i - 1], bodies[i], t + 0.2, i === 4);
        tl.to('.ring', { ...RINGS[i], duration: 1.1 }, t + 0.1);
        if (!RM) {
          tl.fromTo('.scanline', { top: '0%', opacity: 0 }, { top: '100%', opacity: 1, duration: 0.8, ease: 'none' }, t + 0.45);
          tl.to('.scanline', { opacity: 0, duration: 0.15 }, t + 1.15);
        }
        t += 1.1;
      }
      showAt.push(t);
      tl.set(copy, { autoAlpha: 1, y: 0 }, t);
      revealChars(tl, copy.querySelector('h2'), t, 0.03);
      copy.querySelectorAll('.fact').forEach((fact, k) => {
        const at = t + 0.15 + k * 0.18;
        revealChars(tl, fact.querySelector('h3'), at, 0.02);
        tl.fromTo(fact.querySelector('p'), { opacity: 0, y: RM ? 0 : 10 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, at + 0.2);
      });
      tl.addLabel(`v${i}`, t + 0.95);
      t += 1.8;
    });

    // Outro: the scan dims and the ring opens up before the account section.
    tl.to(copies[copies.length - 1], { autoAlpha: 0, y: RM ? 0 : -40, duration: 0.5, ease: 'power2.in' }, t);
    tl.to('.bodies', { opacity: 0.2, duration: 0.8 }, t);
    tl.to('.ring', { x: shift, y: '6vh', scale: RM ? 1 : 1.9, opacity: 0.25, duration: 0.9 }, t);
    t += 0.9;

    tl.eventCallback('onUpdate', () => {
      const time = tl.time();
      let i = -1;
      showAt.forEach((s, k) => { if (time >= s - 0.05) i = k; });
      setView(i);
    });

    ScrollTrigger.create({
      animation: tl,
      trigger: '.stage',
      start: 'top top',
      end: () => `+=${window.innerHeight * t * 0.9}`,
      pin: true,
      scrub: RM ? true : 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    });

    master = tl;
    setView(-1);
    return () => { master = null; };
  });

  function goTo(i) {
    if (!master || !master.scrollTrigger) return;
    scrollToY(master.scrollTrigger.labelToScroll(`v${i}`));
  }
  document.querySelectorAll('[data-goto]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.preventDefault();
      goTo(Number(el.dataset.goto));
    }));
  document.querySelectorAll('a[href="#account"], a[href="#top"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      scrollToY(a.getAttribute('href') === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY);
    }));

  /* ---------- page-load moment ---------- */
  const ringCircle = document.querySelector('.ring circle');
  const circumference = 2 * Math.PI * 88;
  if (!RM) {
    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .fromTo(ringCircle, { strokeDasharray: circumference, strokeDashoffset: circumference },
        { strokeDashoffset: 0, duration: 1.8, ease: 'power3.inOut' }, 0)
      .fromTo('.body.is-front', { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 1.6 }, 0.2)
      .fromTo(heroCharsForIntro(), HIDDEN_BELOW, { ...SHOWN, duration: 0.8, stagger: 0.03 }, 0.5)
      .fromTo('.hero-sub, .rail, .statbar', { opacity: 0 }, { opacity: 1, duration: 1, stagger: 0.1 }, 1.1);
  }
  function heroCharsForIntro() {
    return charsOf.get(document.querySelector('.hero-title'));
  }

  /* ---------- vitals ---------- */
  if (!RM) {
    const pulse = document.querySelector('.ecg path');
    const base = pulse.cloneNode();
    base.classList.add('ecg-base');
    pulse.before(base);
    gsap.set(pulse, { strokeDasharray: '70 190' });
    gsap.fromTo(pulse, { strokeDashoffset: 260 }, { strokeDashoffset: 0, duration: 1.4, repeat: -1, ease: 'none' });
    gsap.to('.bodies-inner', { y: -12, duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }
  const hr = document.querySelector('.statbar .hr');
  setInterval(() => { hr.textContent = String(71 + Math.round(Math.random() * 2)); }, 2400);

  /* ---------- account form ---------- */
  const form = document.querySelector('.account-form');
  const status = form.querySelector('.form-status');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.elements.name;
    const email = form.elements.email;
    const nameOk = name.value.trim().length > 0;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    name.setAttribute('aria-invalid', String(!nameOk));
    email.setAttribute('aria-invalid', String(!emailOk));
    status.classList.toggle('is-error', !(nameOk && emailOk));
    if (!nameOk || !emailOk) {
      status.textContent = !nameOk ? 'Enter your name to create an account.' : 'Enter an email address like name@example.com.';
      (!nameOk ? name : email).focus();
      return;
    }
    status.textContent = `Account created for ${email.value.trim()}.`;
    form.querySelector('button').disabled = true;
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
