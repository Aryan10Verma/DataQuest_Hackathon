import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTraits } from '@/api/hooks';
import type { TraitScore } from '@/api/types';
import { useSession, useStudentContext } from '@/auth/session';
import { EmptyState, ErrorState, PageHeader, PageSkeleton, Section, Tip } from '@/components/ui';
import { pct } from '@/lib/format';

const RIASEC = [
  { key: 'riasec_r', letter: 'R', label: 'Realistic', help: 'Hands-on work, building, tools' },
  { key: 'riasec_i', letter: 'I', label: 'Investigative', help: 'Analysing, researching' },
  { key: 'riasec_a', letter: 'A', label: 'Artistic', help: 'Creating, designing, expressing' },
  { key: 'riasec_s', letter: 'S', label: 'Social', help: 'Helping, teaching, caring' },
  { key: 'riasec_e', letter: 'E', label: 'Enterprising', help: 'Leading, persuading, starting things' },
  { key: 'riasec_c', letter: 'C', label: 'Conventional', help: 'Organising, data, procedures' },
];
const GROUPS: { title: string; items: [string, string][] }[] = [
  { title: 'Aptitude', items: [['apt_numerical', 'Numbers'], ['apt_verbal', 'Words'], ['apt_logical', 'Logic'], ['apt_spatial', 'Shapes and space']] },
  { title: 'Thinking style', items: [['cog_analytical', 'Analytical'], ['cog_creative', 'Creative'], ['cog_practical', 'Practical']] },
  { title: 'Values', items: [['val_security', 'Job security'], ['val_autonomy', 'Independence'], ['val_impact', 'Making a difference'], ['val_financial', 'Financial reward']] },
  { title: 'Grit and risk', items: [['grit', 'Grit'], ['risk_tolerance', 'Comfort with risk']] },
];

export default function Profile() {
  const { user } = useSession();
  const ctx = useStudentContext();
  const traits = useTraits(ctx.studentId);
  const isParent = user?.role === 'parent';
  const name = ctx.studentName?.split(' ')[0];

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title={isParent ? `${name ?? 'Your child'}'s profile` : 'My profile'}
        intro="What the questionnaire found: interests, aptitude, thinking style and values. Each score is from 0 to 100."
      />
      {ctx.loading || traits.isLoading ? (
        <PageSkeleton />
      ) : traits.isError ? (
        <ErrorState error={traits.error} retry={() => traits.refetch()} />
      ) : !traits.data || traits.data.instruments_completed.length === 0 ? (
        <EmptyState
          title="No answers yet"
          body={isParent ? 'The profile appears once your child answers the questionnaire.' : 'Answer the questionnaire to see your profile.'}
          action={!isParent ? <Link to="/app/questionnaire" className="btn-primary">Open the questionnaire</Link> : undefined}
        />
      ) : (
        <View traits={traits.data.traits} code={traits.data.top_riasec_code} completeness={traits.data.completeness} />
      )}
    </div>
  );
}

function View({ traits, code, completeness }: { traits: TraitScore[]; code: string; completeness: number }) {
  const by = Object.fromEntries(traits.map((t) => [t.dimension, t]));
  const noPercentiles = traits.every((t) => t.percentile === null || t.percentile === undefined);
  return (
    <div className="grid gap-14">
      <section className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="grid gap-4">
          <p className="text-sm text-muted">Holland code</p>
          <p className="display text-[clamp(5rem,14vw,10rem)] leading-none tracking-[0.12em]" aria-label={`Holland code ${code.split('').join(' ')}`}>{code}</p>
          <ul className="grid gap-1 text-sm">
            {code.split('').map((l) => {
              const r = RIASEC.find((x) => x.letter === l);
              return r ? (
                <li key={l}><span className="text-ink">{r.label}</span><span className="text-muted">: {r.help.toLowerCase()}</span></li>
              ) : null;
            })}
          </ul>
        </div>
        <Hexagon by={by} />
      </section>

      <div className="grid gap-12 md:grid-cols-2">
        {GROUPS.map((g) => (
          <Section key={g.title} title={g.title}>
            <ul className="grid gap-4">
              {g.items.map(([k, label]) => by[k] && <Bar key={k} label={label} t={by[k]} />)}
            </ul>
          </Section>
        ))}
      </div>

      <div className="grid gap-2 text-xs text-muted">
        <p className="flex items-center gap-2"><Dots r={0.9} /> Dots show how consistent your answers were for that trait.</p>
        <p>{pct(completeness)} of the profile is complete.{noPercentiles ? ' Comparisons with other students appear after 200 students in your grade have taken the questionnaire.' : ''}</p>
      </div>
    </div>
  );
}

function Bar({ label, t }: { label: string; t: TraitScore }) {
  return (
    <li className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{label}{t.imputed && <span className="text-muted"> (not enough answers, set to the middle)</span>}</span>
        <span className="flex items-center gap-3">
          <Dots r={t.reliability} />
          <span className="figure w-8 text-right text-lg">{Math.round(t.normalized * 100)}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06]">
        <motion.div className={`h-full rounded-full ${t.imputed ? 'bg-muted/50' : 'bg-accent'}`} initial={{ width: 0 }} animate={{ width: pct(t.normalized) }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </li>
  );
}

function Dots({ r }: { r: number }) {
  const n = r >= 0.8 ? 3 : r >= 0.5 ? 2 : 1;
  return (
    <Tip label={`Answer consistency ${pct(r)}`}>
      <span className="flex gap-1" aria-label={`Consistency ${pct(r)}`}>
        {[0, 1, 2].map((i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < n ? 'bg-accent' : 'border border-muted/60'}`} />)}
      </span>
    </Tip>
  );
}

/** RIASEC interests as a hexagon, in cyan: these are traits, not score parts. */
function Hexagon({ by }: { by: Record<string, TraitScore> }) {
  const R = 80;
  const pt = (i: number, v: number) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return [100 + R * v * Math.cos(a), 100 + R * v * Math.sin(a)];
  };
  const shape = RIASEC.map((r, i) => pt(i, by[r.key]?.normalized ?? 0).join(',')).join(' ');
  return (
    <figure className="grid justify-items-center">
      <svg viewBox="-12 -8 224 216" className="w-full max-w-[340px]" role="img"
        aria-label={RIASEC.map((r) => `${r.label} ${Math.round((by[r.key]?.normalized ?? 0) * 100)}`).join(', ')}>
        {[0.25, 0.5, 0.75, 1].map((k) => (
          <polygon key={k} points={RIASEC.map((_, i) => pt(i, k).join(',')).join(' ')} fill="none" stroke="rgba(201, 176, 126, 0.12)" strokeWidth="0.8" />
        ))}
        {RIASEC.map((_, i) => {
          const [x, y] = pt(i, 1);
          return <line key={i} x1="100" y1="100" x2={x} y2={y} stroke="rgba(201, 176, 126, 0.1)" strokeWidth="0.8" />;
        })}
        <motion.polygon points={shape} fill="rgba(201, 176, 126, 0.14)" stroke="#C9B07E" strokeWidth="1.6" strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: '100px 100px', filter: 'drop-shadow(0 0 8px rgba(201, 176, 126, 0.5))' }} />
        {RIASEC.map((r, i) => {
          const [x, y] = pt(i, 1.17);
          return (
            <text key={r.key} x={x} y={y + 3} textAnchor="middle" fontSize="9" fill="#9A9386">
              {r.label}
            </text>
          );
        })}
      </svg>
    </figure>
  );
}
