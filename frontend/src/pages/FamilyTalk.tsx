import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useConflict } from '@/api/hooks';
import type { BridgeCareer, ConflictReport } from '@/api/types';
import { useSession } from '@/auth/session';
import { CountUp, ErrorState, PageHeader, PageSkeleton, Section } from '@/components/ui';
import { pct } from '@/lib/format';
import { RunGate, useActiveRun } from './runContext';

const DIMENSION: Record<string, string> = {
  domain_preference: 'Field of work',
  risk_appetite: 'Appetite for risk',
  geography: 'Where to study and work',
  budget: 'Budget',
  time_to_earn: 'Time until earning',
  prestige_stability: 'Stability or ambition',
};
const dimLabel = (d: string) => DIMENSION[d] ?? d.replace(/_/g, ' ');

const BANDS = [
  { upTo: 20, label: 'Aligned' },
  { upTo: 40, label: 'Mild' },
  { upTo: 60, label: 'Moderate' },
  { upTo: 100, label: 'High' },
];

export default function FamilyTalk() {
  const ctx = useActiveRun();
  const { user } = useSession();
  const conflict = useConflict(ctx.latestRunId ?? undefined);
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Family conversation"
        intro={
          user?.role === 'parent'
            ? 'Where you and your child see things differently, why it matters, and careers you could both back.'
            : 'What to talk about with your family, and careers you could both back.'
        }
        actions={user?.role === 'parent' ? <Link to="/app/family/inputs" className="btn-quiet">Update your inputs</Link> : undefined}
      />
      <RunGate ctx={ctx}>
        {conflict.isLoading ? (
          <PageSkeleton />
        ) : conflict.isError ? (
          <ErrorState error={conflict.error} retry={() => conflict.refetch()} />
        ) : conflict.data ? (
          <Conversation c={conflict.data} />
        ) : null}
      </RunGate>
    </div>
  );
}

function Conversation({ c }: { c: ConflictReport }) {
  const full = c.visibility === 'full';
  return (
    <div className="grid gap-12">
      {full ? (
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <Gauge value={c.index} band={c.band} />
          <p className="display max-w-[30ch] text-xl leading-snug">{c.summary}</p>
        </div>
      ) : (
        <p className="display max-w-[36ch] text-2xl leading-snug">{c.summary}</p>
      )}

      {full && c.dimensions && c.dimensions.length > 0 && (
        <Section title="Where you differ" aside={<span className="text-xs text-muted">0 means you agree</span>}>
          <ul className="grid gap-5">
            {[...c.dimensions].sort((a, b) => b.contribution - a.contribution).map((d) => (
              <li key={d.dimension} className="grid gap-2 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-6">
                <div>
                  <p className="font-semibold">{dimLabel(d.dimension)}</p>
                  <p className="text-xs text-muted">Weight {pct(d.weight)}</p>
                </div>
                <div className="grid gap-2">
                  <div className="h-1.5 rounded-full bg-white/[0.06]">
                    <motion.div className="h-full rounded-full bg-scan" initial={{ width: 0 }} animate={{ width: pct(d.gap) }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                  <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <p><span className="text-muted">Student: </span>{d.student_position}</p>
                    <p><span className="text-muted">Parents: </span>{d.parent_position}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={`${c.top_drivers.length} things to talk about`}>
        <ol className="grid gap-4 md:grid-cols-3">
          {c.top_drivers.map((d, i) => (
            <li key={d.dimension} className="panel grid content-start gap-3 p-5">
              <p className="text-sm text-muted">
                <span className="figure mr-2 text-lg text-scan">{i + 1}</span>
                {dimLabel(d.dimension)}
              </p>
              <p className="display text-lg leading-snug">“{d.conversation_prompt}”</p>
              <p className="text-sm text-muted">{d.explanation}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Careers you could both back" aside={<Legend />}>
        <ul className="grid gap-4 md:grid-cols-3">
          {c.bridge_careers.map((b) => (
            <Bridge key={b.career.id} b={b} />
          ))}
        </ul>
      </Section>
    </div>
  );
}

/** The ring, cut in half: 0 (aligned) on the left to 100 (high) on the right. */
function Gauge({ value, band }: { value: number; band: string }) {
  const reduce = useReducedMotion();
  const r = 90;
  const len = Math.PI * r;
  const point = (v: number) => {
    const a = Math.PI * (1 - v / 100);
    return [100 + r * Math.cos(a), 100 - r * Math.sin(a)];
  };
  return (
    <figure className="grid gap-2">
      <svg viewBox="0 -6 200 118" className="w-full overflow-visible" role="img" aria-label={`Family difference ${Math.round(value)} out of 100, ${band}`}>
        <path d={`M10 100 A${r} ${r} 0 0 1 190 100`} fill="none" stroke="rgba(143,208,255,0.12)" strokeWidth="2" />
        <motion.path
          d={`M10 100 A${r} ${r} 0 0 1 190 100`} fill="none" stroke="#f4f9ff" strokeWidth="2.2" strokeLinecap="round"
          strokeDasharray={len}
          initial={{ strokeDashoffset: reduce ? len * (1 - value / 100) : len }}
          animate={{ strokeDashoffset: len * (1 - value / 100) }}
          transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
          style={{ filter: 'drop-shadow(0 0 3px #fff) drop-shadow(0 0 12px rgba(110,180,255,0.55))' }}
        />
        {BANDS.slice(0, 3).map((b) => {
          const [x1, y1] = point(b.upTo);
          const [x2, y2] = [100 + (x1 - 100) * 1.1, 100 + (y1 - 100) * 1.1];
          return <line key={b.upTo} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(143,208,255,0.4)" strokeWidth="1" />;
        })}
        {BANDS.map((b, i) => {
          const mid = ((i ? BANDS[i - 1].upTo : 0) + b.upTo) / 2;
          const [x, y] = point(mid);
          return (
            <text key={b.label} x={100 + (x - 100) * 1.2} y={100 + (y - 100) * 1.2} textAnchor="middle" fontSize="6.5" fill="#8592ab">
              {b.label}
            </text>
          );
        })}
      </svg>
      <figcaption className="-mt-16 text-center">
        <span className="figure block text-4xl"><CountUp value={value} /></span>
        <span className="text-sm text-muted">of 100, {band} difference</span>
      </figcaption>
    </figure>
  );
}

function Legend() {
  return (
    <span className="flex gap-4 text-xs text-muted">
      <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-scan" />Fits the student</span>
      <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-ink/70" />Parents' hopes</span>
    </span>
  );
}

function Bridge({ b }: { b: BridgeCareer }) {
  const bar = (v: number, cls: string, label: string) => (
    <div className="grid grid-cols-[minmax(0,1fr)_2.8rem] items-center gap-3">
      <div className="h-1.5 rounded-full bg-white/[0.06]" aria-label={`${label} ${pct(v)}`}>
        <div className={`h-full rounded-full ${cls}`} style={{ width: pct(v) }} />
      </div>
      <span className="text-right text-xs text-muted">{pct(v)}</span>
    </div>
  );
  return (
    <li className="panel grid content-start gap-3 p-5">
      <p className="display text-lg">{b.career.name}</p>
      {bar(b.student_fit, 'bg-scan', 'Fits the student')}
      {bar(b.parent_acceptance, 'bg-ink/70', "Parents' hopes")}
      <p className="text-sm text-muted">{b.why}</p>
    </li>
  );
}
