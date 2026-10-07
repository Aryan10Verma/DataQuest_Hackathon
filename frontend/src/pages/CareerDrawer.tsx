import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAlternatives } from '@/api/hooks';
import type { AnalysisRun, FinancialAssessment, Recommendation } from '@/api/types';
import { PART, PARTS } from '@/components/parts';
import { FundingMeter, PrivateValue, ProvenanceBadge, Skeleton } from '@/components/ui';
import { formatDate, formatINR, formatINRShort, pct, sectorLabel } from '@/lib/format';

export function CareerDrawer({ rec, run, onClose }: { rec: Recommendation | null; run: AnalysisRun; onClose: () => void }) {
  return (
    <Dialog.Root open={!!rec} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-[680px] overflow-y-auto border-l border-line bg-deep focus:outline-none data-[state=open]:animate-[drawer-in_0.45s_var(--ease)]"
        >
          {rec && <Detail rec={rec} run={run} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Detail({ rec, run }: { rec: Recommendation; run: AnalysisRun }) {
  const f = rec.financial;
  return (
    <div className="grid gap-10 px-5 pb-16 pt-6 sm:px-10">
      <header className="flex items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-sm text-muted">Rank {rec.rank} of {run.recommendations.length}, {sectorLabel(rec.career.sector)}</p>
          <Dialog.Title className="display text-2xl sm:text-3xl">{rec.career.name}</Dialog.Title>
          <p className="flex items-baseline gap-2 text-sm text-muted">
            <span className="figure text-2xl text-ink">{Math.round(rec.final_score * 100)}</span> overall, likely between{' '}
            {Math.round(rec.ci_low * 100)} and {Math.round(rec.ci_high * 100)}
          </p>
        </div>
        <Dialog.Close className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-muted hover:border-accent hover:text-ink" aria-label="Close">
          <X size={18} />
        </Dialog.Close>
      </header>

      <Block title="Why this score">
        <Waterfall rec={rec} />
        <ul className="grid gap-1.5 text-sm text-muted">
          {rec.explanation.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </Block>

      <Block title="Can we afford it" aside={<FundingMeter value={f.affordability_class} />}>
        <Ledger f={f} />
        {f.admission_chance < 0.6 && (
          <p className="text-sm">
            Admission chance on this route is about <span className="figure text-lg">{pct(f.admission_chance)}</span>, so keep a second option ready.
          </p>
        )}
        {(rec.alternative_pathways?.length ?? 0) > 0 && (
          <div className="grid gap-2">
            <h4 className="text-sm font-semibold">Other ways to study for it</h4>
            <ul>
              {rec.alternative_pathways!.map((p) => (
                <li key={p.pathway_id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 text-sm">
                  <span className="min-w-0">
                    {p.pathway_name}
                    <span className="block text-xs text-muted">{p.institution_name}</span>
                  </span>
                  <span className="flex items-center gap-4">
                    <FundingMeter value={p.affordability_class} showLabel={false} />
                    <span className="w-16 text-right text-muted">{formatINRShort(p.total_cost)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(f.loan_required ?? 0) > 0 && (
          <Link to={`/app/loans?amount=${f.loan_required}&years=${f.duration_years}`} className="btn-text min-h-0 justify-self-start">
            See how this loan would work
          </Link>
        )}
      </Block>

      <Block title="How you match">
        <Gaps rec={rec} />
      </Block>

      <Block title="Where these numbers come from" aside={<span className="text-xs text-muted">{pct(rec.data_trust.verified_share)} checked</span>}>
        <ul>
          {rec.data_trust.inputs.map((i) => (
            <li key={i.name} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 text-sm">
              <span>
                {i.name}
                <span className="block text-xs text-muted">{i.source_name}, as of {formatDate(i.as_of)}</span>
              </span>
              <ProvenanceBadge p={i} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{rec.data_trust.note}</p>
      </Block>

      <Block title="Similar paths">
        <Similar slug={rec.career.slug} />
      </Block>

      <div className="flex flex-wrap gap-2">
        <Link to={`/app/plan?career=${rec.career.id}`} className="btn-primary">Plan this path</Link>
        <Link to="/app/what-if" className="btn-quiet">Try a what-if</Link>
      </div>
    </div>
  );
}

function Block({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Each part steps the score up from 0 (automation risk steps it down) to the final score. */
function Waterfall({ rec }: { rec: Recommendation }) {
  const order = PARTS.map((p) => p.key);
  const parts = [...rec.contributions].sort((a, b) => order.indexOf(a.component) - order.indexOf(b.component));
  let running = 0;
  const steps = parts.map((c) => {
    const start = running;
    running += c.contribution;
    return { c, from: Math.min(start, running), size: Math.abs(c.contribution) };
  });
  const max = Math.max(1e-6, ...steps.map((s) => s.from + s.size));
  const scale = (v: number) => `${(v / max) * 100}%`;
  return (
    <div className="grid gap-2" role="table" aria-label="How each part adds to the score">
      {steps.map(({ c, from, size }, i) => {
        const p = PART[c.component];
        return (
          <div key={c.component} role="row" className="grid grid-cols-[8.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm">
            <span role="rowheader" className="text-muted">{p.label}</span>
            <span role="cell" className="relative h-5">
              <motion.span
                className={`absolute inset-y-0 rounded-sm ${c.contribution < 0 ? 'hatch' : ''}`}
                style={{ left: scale(from), width: scale(size), background: c.contribution < 0 ? undefined : p.color }}
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span role="cell" className="text-right tabular-nums">
              {c.contribution >= 0 ? '+' : '−'}
              {Math.abs(c.contribution * 100).toFixed(1)}
            </span>
          </div>
        );
      })}
      <div role="row" className="grid grid-cols-[8.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 border-t border-line pt-2 text-sm">
        <span role="rowheader" className="font-semibold">Final score</span>
        <span role="cell" className="relative h-5">
          <span className="absolute inset-y-0 left-0 rounded-sm bg-ink/80" style={{ width: scale(rec.final_score) }} />
        </span>
        <span role="cell" className="figure text-right text-lg">{(rec.final_score * 100).toFixed(1)}</span>
      </div>
      <p className="text-xs text-muted">Each step is the part's raw value times its weight.</p>
    </div>
  );
}

function Ledger({ f }: { f: FinancialAssessment }) {
  const row = (label: string, value: ReactNode, strong = false) => (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right ${strong ? 'font-semibold' : ''}`}>{value}</dd>
    </div>
  );
  return (
    <div className="grid gap-4">
      <p className="text-sm">
        {f.pathway_name}, {f.institution_name}
        <span className="block text-xs text-muted">
          {f.duration_years} years, {f.quota} quota{f.loan_scheme ? `. Loan scheme: ${f.loan_scheme}` : ''}
        </span>
      </p>
      <dl>
        {row('Total cost of the course', formatINR(f.total_cost), true)}
        {row('Family funds available', <PrivateValue value={f.family_funds}>{formatINR(f.family_funds)}</PrivateValue>)}
        {row('Scholarships expected', formatINR(f.scholarship_expected))}
        {row('Loan needed', <PrivateValue value={f.loan_required}>{formatINR(f.loan_required)}</PrivateValue>)}
        {row('Monthly loan payment', <PrivateValue value={f.monthly_emi}>{formatINR(f.monthly_emi)}</PrivateValue>)}
        {row('Still to find', <PrivateValue value={f.funding_gap}>{formatINR(f.funding_gap)}</PrivateValue>, true)}
        {row('Starting salary, per year', formatINR(f.roi.starting_salary))}
        {row('Pays back the cost in', f.roi.payback_years !== null ? `${f.roi.payback_years.toFixed(1)} years` : 'Not within the horizon')}
      </dl>
      {f.scholarship_plan.length > 0 && (
        <div className="grid gap-1 text-sm">
          <h4 className="font-semibold">Scholarships counted</h4>
          {f.scholarship_plan.map((s) => (
            <p key={s.scholarship_id} className="text-muted">
              {s.name}: {formatINR(s.amount_total)} at a {pct(s.probability)} chance
              {s.deadline ? `, apply by ${formatDate(s.deadline)}` : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Gaps({ rec }: { rec: Recommendation }) {
  const gaps = rec.fit.gaps;
  if (!gaps.length) return <p className="text-sm text-muted">Your profile meets what this career asks for on every measured trait.</p>;
  return (
    <div className="grid gap-3">
      <div className="flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-accent" />You</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-ink" />What the career asks for</span>
      </div>
      {gaps.map((g) => (
        <div key={g.dimension} className="grid gap-1 text-sm">
          <div className="flex justify-between">
            <span>{g.label}</span>
            <span className="text-muted">{pct(g.student)} of {pct(g.required)}</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-white/[0.06]">
            <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: pct(g.student) }} />
            <span className="absolute -top-1 h-3.5 w-px bg-ink" style={{ left: pct(g.required) }} aria-hidden />
          </div>
        </div>
      ))}
      <p className="text-xs text-muted">Strongest matches: {rec.fit.top_matching_dimensions.join(', ')}.</p>
    </div>
  );
}

function Similar({ slug }: { slug: string }) {
  const alt = useAlternatives(slug);
  if (alt.isLoading) return <Skeleton className="h-24" />;
  if (alt.isError || !alt.data?.length) return <p className="text-sm text-muted">No close alternatives in the catalogue yet.</p>;
  return (
    <ul>
      {alt.data.slice(0, 5).map((a) => (
        <li key={a.career.id} className="grid gap-0.5 border-b border-line py-2.5 text-sm">
          <span className="flex justify-between gap-3">
            <span className="font-semibold">{a.career.name}</span>
            <span className="text-muted">{pct(a.skill_overlap)} shared skills</span>
          </span>
          <span className="text-muted">{a.why}</span>
        </li>
      ))}
    </ul>
  );
}
