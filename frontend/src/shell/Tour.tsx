// A guided tour: a spotlight and a card that glide from feature to feature, explaining each one.
// It starts on a person's first visit to the app and can be replayed from the account menu.
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { Role } from '@/api/client';
import { useSession } from '@/auth/session';

interface Step {
  /** data-tour value of the element to light up; none = a centred welcome card. */
  target?: string;
  title: string;
  body: string;
}

const COMMON_TOOLS: Step[] = [
  { target: 'what-if', title: 'What if?', body: 'Change the budget, the openness to loans, or what matters most, and watch the ranking shift. Nothing is saved.' },
  { target: 'compare', title: 'Compare', body: 'Put up to three careers side by side: score, cost, salary, admission chance. The best value in each row is marked.' },
  { target: 'scholarships', title: 'Scholarships', body: 'Scholarships you could get, with every rule checked against your profile, and the ones that need more details.' },
  { target: 'loans', title: 'Loans', body: 'What an education loan would really cost each month, and which government schemes may help.' },
  { target: 'exams', title: 'Exam calendar', body: 'Entrance exams and registration deadlines on a calendar, with your scholarship deadlines too.' },
  { target: 'outcomes', title: 'What I chose', body: 'Months later, tell us what you decided. It is how PRISM learns whether its advice helped.' },
  { target: 'trust', title: 'How we know', body: 'Where every number comes from, how the score is calculated, and whether each figure has been checked.' },
  { target: 'language', title: 'Language', body: 'Read the summaries and the family report in English, Tamil or Hindi.' },
  { target: 'account', title: 'Your account', body: 'Sign out here, or take this tour again any time.' },
];

const STEPS: Record<Role, Step[]> = {
  student: [
    { title: 'Welcome to PRISM', body: 'A one-minute tour of what each part does. Use the arrow keys or the buttons; press Esc to skip.' },
    { target: 'questionnaire', title: 'Start here', body: 'Five short sections, about 25 minutes: interests, aptitude, thinking style and values. Your answers save as you go.' },
    { target: 'results', title: 'Results', body: 'Careers ranked for you and your family, with the reason behind every score.' },
    { target: 'plan', title: 'Plan', body: 'A five-year roadmap from now to the first job: exams, applications, scholarships and skills.' },
    { target: 'family', title: 'Family', body: 'Where you and your parents agree and differ, with questions to talk through together.' },
    { target: 'explore', title: 'Explore', body: 'Browse every career, see where jobs are growing, and find real problems to work on near you.' },
    { target: 'account', title: 'My profile', body: 'What the questionnaire found about you: your Holland code, aptitude, thinking style and values. Open it from your account menu here.' },
    ...COMMON_TOOLS,
  ],
  parent: [
    { title: 'Welcome to PRISM', body: 'A one-minute tour of what each part does. Use the arrow keys or the buttons; press Esc to skip.' },
    { target: 'results', title: 'Results', body: "Careers ranked for your child and your family, with the reason behind every score and the cost of each course." },
    { target: 'plan', title: 'Plan', body: 'A five-year roadmap: exams, applications, scholarship deadlines and skills.' },
    { target: 'family', title: 'Family', body: "Add your budget and hopes privately, then see where you and your child differ and careers you could both back." },
    { target: 'explore', title: 'Explore', body: 'Browse every career, where jobs are growing, and real problems in your district.' },
    { target: 'account', title: "Child's profile", body: "What the questionnaire found about your child's interests, aptitude and values. Open it from your account menu here." },
    ...COMMON_TOOLS,
  ],
  educator: [
    { title: 'Welcome to PRISM', body: 'A short tour of your tools. Use the arrow keys or the buttons; press Esc to skip.' },
    { target: 'counsellor', title: 'Your students', body: 'Every student assigned to you, most urgent first, with flags that need a conversation.' },
    { target: 'explore', title: 'Explore', body: 'The full career catalogue, job market trends and local problems.' },
    { target: 'scholarships', title: 'Scholarships', body: 'All common scholarships and their rules, to help students apply.' },
    { target: 'exams', title: 'Exam calendar', body: 'Entrance exams and registration deadlines in one calendar.' },
    { target: 'trust', title: 'How we know', body: 'Where every number comes from and whether it has been checked.' },
    { target: 'account', title: 'Your account', body: 'Sign out here, or take this tour again any time.' },
  ],
  admin: [
    { title: 'Welcome to PRISM', body: 'A short tour. Press Esc to skip.' },
    { target: 'admin', title: 'Analytics', body: 'Counts only: groups smaller than five are hidden so no family can be identified.' },
    { target: 'trust', title: 'How we know', body: 'Data freshness, formulas and fairness checks.' },
    { target: 'account', title: 'Your account', body: 'Sign out here, or take this tour again any time.' },
  ],
};

const seenKey = (userId: string) => `prism.tour.v1.${userId}`;
const PAD = 8;
const CARD_W = 340;

interface Box { top: number; left: number; width: number; height: number }

/** The target's box, or null when it isn't on screen. */
function find(target?: string): Box | null {
  if (!target) return null;
  const els = [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)];
  const el = els.find((e) => e.getClientRects().length > 0 && e.getBoundingClientRect().width > 0);
  if (!el) return null;
  el.scrollIntoView({ block: 'nearest' });
  const r = el.getBoundingClientRect();
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

/** Tools live in the Tools panel (and everything on a phone sits in the menu): light that button up instead. */
function measure(target?: string): { box: Box | null; inMore: boolean } {
  const box = find(target);
  if (box || !target) return { box, inMore: false };
  const more = find('more');
  return { box: more, inMore: !!more };
}

/** Put the card beside the spotlight where it fits: right, then below, then above, else centred. */
function place(box: Box | null, cardH: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(CARD_W, vw - 32);
  if (!box) return { top: Math.max(16, vh / 2 - cardH / 2), left: vw / 2 - w / 2, width: w };
  const clampTop = (t: number) => Math.min(Math.max(16, t), vh - cardH - 16);
  if (box.left + box.width + 16 + w < vw - 16) return { top: clampTop(box.top + box.height / 2 - cardH / 2), left: box.left + box.width + 16, width: w };
  const left = Math.min(Math.max(16, box.left + box.width / 2 - w / 2), vw - w - 16);
  if (box.top + box.height + 16 + cardH < vh - 16) return { top: box.top + box.height + 16, left, width: w };
  if (box.top - 16 - cardH > 16) return { top: box.top - 16 - cardH, left, width: w };
  return { top: vh / 2 - cardH / 2, left: vw / 2 - w / 2, width: w };
}

export function startTour() {
  window.dispatchEvent(new Event('prism:tour'));
}

export function Tour() {
  const { user } = useSession();
  const loc = useLocation();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState<number | null>(null);
  const [{ box, inMore }, setSpot] = useState<{ box: Box | null; inMore: boolean }>({ box: null, inMore: false });
  const [cardH, setCardH] = useState(200);
  const cardRef = useRef<HTMLDivElement>(null);
  const steps = user ? STEPS[user.role] : [];
  const step = index !== null ? steps[index] : undefined;

  const finish = useCallback(() => {
    if (user) {
      try {
        localStorage.setItem(seenKey(user.id), '1');
      } catch {
        /* storage blocked: the tour may show again next visit */
      }
    }
    setIndex(null);
  }, [user]);

  // First visit: start after the page settles. Replays come from the account menu.
  useEffect(() => {
    if (!user) return;
    let seen = false;
    try {
      seen = localStorage.getItem(seenKey(user.id)) === '1';
    } catch {
      seen = true;
    }
    const t = seen ? undefined : window.setTimeout(() => setIndex(0), 900);
    const replay = () => setIndex(0);
    window.addEventListener('prism:tour', replay);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('prism:tour', replay);
    };
  }, [user]);

  // Follow the target as the step, the page or the window changes.
  useLayoutEffect(() => {
    if (index === null) return;
    const update = () => setSpot(measure(step?.target));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [index, step, loc.pathname]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
    cardRef.current?.focus();
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') setIndex((i) => (i !== null && i < steps.length - 1 ? i + 1 : i));
      if (e.key === 'ArrowLeft') setIndex((i) => (i ? i - 1 : i));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, steps.length, finish]);

  if (index === null || !step) return null;
  const pos = place(box, cardH);
  const last = index === steps.length - 1;
  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 170, damping: 26 };

  return (
    <div className="fixed inset-0 z-[90]" aria-live="polite">
      {/* The dimmer with a spotlight hole: a box whose huge shadow darkens everything else. */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed rounded-xl"
        initial={false}
        animate={box ? { ...box } : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 }}
        transition={spring}
        style={{
          boxShadow: '0 0 0 9999px rgba(5, 6, 14, 0.78), 0 0 0 1px rgba(91, 127, 230, 0.9), 0 0 28px rgba(91, 127, 230, 0.45)',
        }}
      />
      {/* Clicks outside the card do nothing, so the tour isn't lost by accident. */}
      <div className="fixed inset-0" onClick={(e) => e.stopPropagation()} />
      <motion.div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        className="fixed grid gap-4 rounded-panel border border-accent/50 bg-deep p-6 shadow-[0_24px_80px_rgba(0,0,0,0.6)] focus:outline-none"
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1, top: pos.top, left: pos.left, width: pos.width }}
        transition={spring}
      >
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{index + 1} of {steps.length}</span>
          <button className="min-h-[32px] hover:text-ink" onClick={finish}>Skip tour</button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={index} className="grid gap-2" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <h2 id="tour-title" className="display text-2xl leading-tight">{step.title}</h2>
            <p id="tour-body" className="text-sm text-muted">{step.body}</p>
            {inMore && <p className="text-xs text-muted">It lives in the menu at the top: open it to find this.</p>}
          </motion.div>
        </AnimatePresence>
        <div className="h-px overflow-hidden bg-line" aria-hidden>
          <motion.div className="h-full bg-accent" animate={{ width: `${((index + 1) / steps.length) * 100}%` }} transition={{ duration: 0.4 }} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <button className="btn-text min-h-[40px] text-muted disabled:opacity-30" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</button>
          <button className="btn-primary min-h-[40px]" onClick={() => (last ? finish() : setIndex(index + 1))}>{last ? 'Start using PRISM' : 'Next'}</button>
        </div>
      </motion.div>
    </div>
  );
}
