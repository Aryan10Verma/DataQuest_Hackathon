import * as Tooltip from '@radix-ui/react-tooltip';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Lock } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AffordabilityClass, Contribution, DataTrust, DateStatus, Provenance, VerificationStatus } from '@/api/types';
import { ApiError } from '@/api/client';
import { formatDate, score2 } from '@/lib/format';
import { PART, scoreSegments } from './parts';

/* ---------- tooltip ---------- */
export function Tip({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <Tooltip.Root delayDuration={120}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-50 max-w-[260px] rounded-lg border border-line bg-deep px-3 py-2 text-xs text-ink shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/* ---------- score bar ---------- */
export function ScoreBar({ contributions, height = 8, animate = true }: { contributions: Contribution[]; height?: number; animate?: boolean }) {
  const reduce = useReducedMotion();
  const { segments } = scoreSegments(contributions);
  const positives = segments.filter((s) => !s.negative);
  const negative = segments.find((s) => s.negative);
  const posTotal = positives.reduce((a, s) => a + s.width, 0);
  return (
    <div className="relative w-full overflow-hidden rounded-full bg-white/[0.06]" style={{ height }} role="img"
      aria-label={contributions.map((c) => `${PART[c.component].label} ${c.contribution.toFixed(2)}`).join(', ')}>
      <motion.div
        className="absolute inset-y-0 left-0 flex"
        initial={animate && !reduce ? { clipPath: 'inset(0 100% 0 0)' } : false}
        animate={{ clipPath: 'inset(0 0% 0 0)' }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: `${posTotal}%` }}
      >
        {positives.map((s) => (
          <Tip key={s.key} label={<PartTip c={contributions.find((c) => c.component === s.key)!} />}>
            <span className="h-full" style={{ width: `${(s.width / posTotal) * 100}%`, background: PART[s.key].color }} />
          </Tip>
        ))}
      </motion.div>
      {negative && (
        <Tip label={<PartTip c={contributions.find((c) => c.component === negative.key)!} />}>
          <span className="hatch absolute inset-y-0 bg-void/40" style={{ left: `${posTotal - negative.width}%`, width: `${negative.width}%` }} />
        </Tip>
      )}
    </div>
  );
}

function PartTip({ c }: { c: Contribution }) {
  const p = PART[c.component];
  return (
    <span className="grid gap-0.5">
      <span className="font-semibold" style={{ color: p.color }}>{p.label}</span>
      <span className="text-muted">
        {score2(c.raw_value)} × weight {Math.round(c.weight * 100)}% = {c.contribution >= 0 ? '+' : '−'}
        {Math.abs(c.contribution).toFixed(3)}
      </span>
    </span>
  );
}

export function PartLegend({ className = '' }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted ${className}`}>
      {Object.values(PART).map((p) => (
        <li key={p.key} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${p.key === 'disruption' ? 'hatch' : ''}`} style={p.key === 'disruption' ? undefined : { background: p.color }} />
          {p.label}
        </li>
      ))}
    </ul>
  );
}

/* ---------- funding: a meter, not a colour ---------- */
const FUNDING: Record<AffordabilityClass, { steps: number; label: string; help: string }> = {
  comfortable: { steps: 4, label: 'Comfortable', help: 'The family budget covers this course.' },
  stretch: { steps: 3, label: 'Stretch', help: 'Possible with savings, scholarships or a small loan.' },
  loan_dependent: { steps: 2, label: 'Needs a loan', help: 'Depends on an education loan.' },
  infeasible: { steps: 1, label: 'Out of reach', help: 'Not affordable on the current budget, even with a loan.' },
};
export function FundingMeter({ value, showLabel = true }: { value: AffordabilityClass; showLabel?: boolean }) {
  const f = FUNDING[value];
  return (
    <Tip label={f.help}>
      <span className="inline-flex items-center gap-2 text-xs text-ink" aria-label={`Funding: ${f.label}`}>
        <span className="flex gap-[3px]" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-3 w-[5px] rounded-[1px] ${i < f.steps ? 'bg-ink' : 'border border-white/25'}`} />
          ))}
        </span>
        {showLabel && f.label}
      </span>
    </Tip>
  );
}
export const fundingLabel = (v: string) => FUNDING[v as AffordabilityClass]?.label ?? v;

/* ---------- confidence, trust, provenance, dates ---------- */
export function ConfidenceChip({ score, low, high }: { score: number; low: number; high: number }) {
  return (
    <Tip label="The score and the range it would fall in if the uncertain inputs moved. A narrower range means more confidence.">
      <span className="inline-flex items-baseline gap-1.5 text-xs text-muted">
        <span className="text-sm text-ink">{score2(score)}</span>
        <span>
          {score2(low)}–{score2(high)}
        </span>
      </span>
    </Tip>
  );
}

const isChecked = (v: VerificationStatus) => v === 'verified' || v === 'secondary';

export function TrustBadge({ trust }: { trust: DataTrust }) {
  const checked = trust.inputs.filter((i) => isChecked(i.verification) && !i.is_estimate).length;
  return (
    <Tip label={trust.note}>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${checked ? 'bg-scan' : 'border border-muted'}`} />
        {checked} of {trust.inputs.length} inputs checked
      </span>
    </Tip>
  );
}

export function ProvenanceBadge({ p, compact = false }: { p: Pick<Provenance, 'is_estimate' | 'verification' | 'source_name' | 'as_of'> & Partial<Provenance>; compact?: boolean }) {
  const checked = !p.is_estimate && isChecked(p.verification);
  const label = checked ? 'Checked' : 'Estimate';
  return (
    <Tip
      label={
        <span className="grid gap-0.5">
          <span className="font-semibold">{label}</span>
          <span className="text-muted">
            {p.source_name}, as of {formatDate(p.as_of)}
            {p.verified_on ? `. Checked on ${formatDate(p.verified_on)}` : ''}
          </span>
        </span>
      }
    >
      <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${checked ? 'border-scan/50 text-scan' : 'border-line text-muted'}`}>
        {checked ? '●' : '○'} {!compact && label}
      </span>
    </Tip>
  );
}

const DATE_STATUS: Record<DateStatus, string> = { announced: 'Announced', tentative: 'Tentative', estimated: 'Estimated' };
export function DateStatusTag({ status }: { status: DateStatus | null | undefined }) {
  if (!status) return null;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${status === 'announced' ? 'border-scan/50 text-scan' : 'border-line text-muted'}`}>
      {DATE_STATUS[status]}
    </span>
  );
}

/** A family money figure the viewer is not allowed to see. Never shown as ₹0. */
export function PrivateValue({ value, children }: { value: number | null | undefined; children: ReactNode }) {
  if (value !== null && value !== undefined) return <>{children}</>;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      <Lock size={13} aria-hidden /> Shared with parents only
    </span>
  );
}

/* ---------- the glow ring, shared with the landing page ---------- */
export function Ring({ size = 160, progress = 1, stroke = 2.2, draw = true, children, className = '' }: {
  size?: number; progress?: number; stroke?: number; draw?: boolean; children?: ReactNode; className?: string;
}) {
  const reduce = useReducedMotion();
  const r = 88;
  const c = 2 * Math.PI * r;
  return (
    <div className={`relative grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 overflow-visible" aria-hidden>
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(143,208,255,0.12)" strokeWidth={stroke} />
        <motion.circle
          cx="100" cy="100" r={r} fill="none" stroke="#f4f9ff" strokeWidth={stroke} strokeLinecap="round"
          transform="rotate(-90 100 100)" strokeDasharray={c}
          initial={draw && !reduce ? { strokeDashoffset: c } : { strokeDashoffset: c * (1 - progress) }}
          animate={{ strokeDashoffset: c * (1 - progress) }}
          transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
          style={{ filter: 'drop-shadow(0 0 3px #fff) drop-shadow(0 0 12px var(--glow)) drop-shadow(0 0 32px rgba(110,180,255,0.3))' }}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

/** Counts up once on first view. */
export function CountUp({ value, digits = 0, duration = 1.2 }: { value: number; digits?: number; duration?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const done = useRef(false);
  useEffect(() => {
    if (reduce || done.current) {
      setShown(value);
      return;
    }
    done.current = true;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / (duration * 1000));
      setShown(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);
  return <>{shown.toFixed(digits)}</>;
}

/* ---------- states ---------- */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.05] ${className}`} aria-hidden />;
}
export function PageSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-40" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-3 py-10">
      <h2 className="display text-xl">{title}</h2>
      {body && <p className="max-w-measure text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const message = error instanceof ApiError || error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 rounded-panel border border-danger/40 px-4 py-3 text-sm">
      <AlertCircle size={18} className="mt-0.5 text-danger" aria-hidden />
      <p className="max-w-measure flex-1">{message}</p>
      {retry && (
        <button className="btn-text min-h-0" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, intro, actions }: { title: ReactNode; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-2">
        <h1 className="display text-2xl sm:text-3xl">{title}</h1>
        {intro && <p className="max-w-measure text-muted">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** A labelled block inside a page. The heading names the content; no eyebrow labels. */
export function Section({ title, aside, children, className = '' }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`grid gap-4 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
