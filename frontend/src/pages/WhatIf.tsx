import * as Slider from '@radix-ui/react-slider';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useFinance, useWhatIf } from '@/api/hooks';
import type { AnalysisRun, CareerDelta, FamilyFinanceOut, ScoreComponent, WhatIfOverrides } from '@/api/types';
import { useSession } from '@/auth/session';
import { PARTS } from '@/components/parts';
import { ErrorState, FundingMeter, PageHeader } from '@/components/ui';
import { formatINRShort } from '@/lib/format';
import { RunGate, useActiveRun } from './runContext';

export default function WhatIf() {
  const ctx = useActiveRun();
  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="What if"
        intro="Change the budget, the openness to loans or moving, or how much each part counts. See how the ranking would shift. Nothing is saved."
      />
      <RunGate ctx={ctx}>{ctx.run.data && <Simulator run={ctx.run.data} familyId={ctx.familyId} />}</RunGate>
    </div>
  );
}

interface Controls {
  allocatable_savings: number;
  loan_tolerance: number;
  relocation_willingness: number;
  abroad_willingness: number;
  weights: Record<ScoreComponent, number>;
}

function Simulator({ run, familyId }: { run: AnalysisRun; familyId: string | null }) {
  const { user } = useSession();
  const isParent = user?.role === 'parent';
  const finance = useFinance(isParent ? familyId : null);
  const parentFinance = isParent && finance.data && 'allocatable_savings' in finance.data ? (finance.data as FamilyFinanceOut) : null;

  const base = useMemo<Controls>(
    () => ({
      allocatable_savings: parentFinance?.allocatable_savings ?? 0,
      loan_tolerance: parentFinance?.loan_tolerance ?? 0.5,
      relocation_willingness: parentFinance?.relocation_willingness ?? 0.5,
      abroad_willingness: parentFinance?.abroad_willingness ?? 0.2,
      weights: { ...(run.weights as Record<ScoreComponent, number>) },
    }),
    [parentFinance, run.weights],
  );
  const [c, setC] = useState<Controls>(base);
  useEffect(() => setC(base), [base]);
  const whatIf = useWhatIf(run.run_id);

  const overrides = (): WhatIfOverrides => {
    const o: WhatIfOverrides = {};
    if (isParent && parentFinance) {
      if (c.allocatable_savings !== base.allocatable_savings) o.allocatable_savings = c.allocatable_savings;
      if (c.loan_tolerance !== base.loan_tolerance) o.loan_tolerance = c.loan_tolerance;
    }
    if (c.relocation_willingness !== base.relocation_willingness) o.relocation_willingness = c.relocation_willingness;
    if (c.abroad_willingness !== base.abroad_willingness) o.abroad_willingness = c.abroad_willingness;
    if (PARTS.some((p) => c.weights[p.key] !== base.weights[p.key])) o.weights = c.weights;
    return o;
  };
  const changed = Object.keys(overrides()).length > 0;
  const weightTotal = PARTS.reduce((s, p) => s + c.weights[p.key], 0) || 1;

  return (
    <div className="grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)]">
      <form
        className="grid content-start gap-8"
        onSubmit={(e) => {
          e.preventDefault();
          whatIf.mutate({ overrides: overrides(), label: 'What-if from the results screen' });
        }}
      >
        {isParent && parentFinance && (
          <fieldset className="grid gap-5">
            <legend className="mb-3 text-sm font-semibold">Money</legend>
            <Control label="Savings set aside for education" value={c.allocatable_savings} min={0} max={5_000_000} step={50_000}
              format={formatINRShort} onChange={(v) => setC({ ...c, allocatable_savings: v })} />
            <Control label="Openness to an education loan" value={c.loan_tolerance} min={0} max={1} step={0.05}
              format={(v) => scaleWord(v)} onChange={(v) => setC({ ...c, loan_tolerance: v })} />
          </fieldset>
        )}
        <fieldset className="grid gap-5">
          <legend className="mb-3 text-sm font-semibold">Moving</legend>
          <Control label="Willing to move to another city" value={c.relocation_willingness} min={0} max={1} step={0.05}
            format={scaleWord} onChange={(v) => setC({ ...c, relocation_willingness: v })} />
          <Control label="Willing to study abroad" value={c.abroad_willingness} min={0} max={1} step={0.05}
            format={scaleWord} onChange={(v) => setC({ ...c, abroad_willingness: v })} />
        </fieldset>
        <fieldset className="grid gap-5">
          <legend className="mb-3 text-sm font-semibold">How much each part counts</legend>
          {PARTS.map((p) => (
            <Control key={p.key} label={p.label} color={p.color} value={c.weights[p.key]} min={0} max={0.5} step={0.01}
              format={(v) => `${Math.round((v / weightTotal) * 100)}%`}
              onChange={(v) => setC({ ...c, weights: { ...c.weights, [p.key]: v } })} />
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={!changed || whatIf.isPending}>{whatIf.isPending ? 'Comparing…' : 'Compare'}</button>
          <button type="button" className="btn-quiet" disabled={!changed} onClick={() => { setC(base); whatIf.reset(); }}>Reset</button>
        </div>
        {!isParent && <p className="text-xs text-muted">Budget and loan settings belong to your parents, so they can change those here.</p>}
      </form>

      <Outcome run={run} result={whatIf.data?.comparison} error={whatIf.error} />
    </div>
  );
}

const scaleWord = (v: number) => (v < 0.2 ? 'Not at all' : v < 0.45 ? 'A little' : v < 0.7 ? 'Somewhat' : v < 0.9 ? 'Quite' : 'Fully');

function Control({ label, value, min, max, step, format, onChange, color }: {
  label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void; color?: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex items-center gap-2">
          {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />}
          {label}
        </span>
        <span className="tabular-nums text-muted">{format(value)}</span>
      </div>
      <Slider.Root className="relative flex h-6 touch-none select-none items-center" value={[value]} min={min} max={max} step={step}
        onValueChange={([v]) => onChange(v)} aria-label={label}>
        <Slider.Track className="relative h-1 grow rounded-full bg-white/[0.08]">
          <Slider.Range className="absolute h-full rounded-full" style={{ background: color ?? 'var(--scan)' }} />
        </Slider.Track>
        <Slider.Thumb className="block h-5 w-5 rounded-full border-2 border-void bg-ink shadow-[0_0_0_1px_var(--line)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scan" />
      </Slider.Root>
    </div>
  );
}

type Comparison = NonNullable<ReturnType<typeof useWhatIf>['data']>['comparison'];

function Outcome({ run, result, error }: { run: AnalysisRun; result?: Comparison; error: unknown }) {
  // Before comparing, show today's ranking; afterwards the same rows move to their new places.
  const rows: (CareerDelta & { key: string })[] = result
    ? [...result.deltas].sort((a, b) => (a.new_rank ?? 99) - (b.new_rank ?? 99)).map((d) => ({ ...d, key: d.career_id }))
    : run.recommendations.map((r) => ({
        key: r.career.id, career_id: r.career.id, career_name: r.career.name, base_rank: r.rank, new_rank: r.rank,
        base_score: r.final_score, new_score: r.final_score, score_delta: 0, base_class: r.financial.affordability_class, new_class: r.financial.affordability_class,
      }));
  return (
    <section aria-live="polite" className="grid content-start gap-6">
      {error ? <ErrorState error={error} /> : null}
      {result ? (
        <div className="grid gap-4 border-l border-scan/60 pl-5">
          <p className="flex items-baseline gap-3">
            <span className="figure text-3xl">{result.rank_correlation.toFixed(2)}</span>
            <span className="text-sm text-muted">ranking similarity (1 means nothing moved)</span>
          </p>
          <ul className="grid gap-1 text-sm text-muted">
            {result.summary.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted">Today's ranking. Change a setting and choose Compare.</p>
      )}
      <LayoutGroup>
        <ol className="grid">
          <AnimatePresence initial={false}>
            {rows.map((d) => (
              <motion.li key={d.key} layout transition={{ type: 'spring', stiffness: 260, damping: 32 }}
                className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line py-3.5 sm:grid-cols-[2rem_minmax(0,1fr)_5rem_auto]">
                <span className="figure text-xl text-muted">{d.new_rank ?? '–'}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{d.career_name}</span>
                  {result && <Move d={d} />}
                </span>
                <span className="hidden text-right text-sm tabular-nums sm:block">
                  {d.new_score !== null ? Math.round(d.new_score * 100) : '–'}
                  {result && d.score_delta !== 0 && (
                    <span className="ml-1.5 text-xs text-muted">{d.score_delta > 0 ? '+' : '−'}{Math.abs(d.score_delta * 100).toFixed(1)}</span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {result && d.base_class && d.new_class && d.base_class !== d.new_class && (
                    <><FundingMeter value={d.base_class} showLabel={false} /><span aria-hidden>to</span></>
                  )}
                  {d.new_class && <FundingMeter value={d.new_class} />}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </LayoutGroup>
      {result && (result.entered_top_k.length > 0 || result.left_top_k.length > 0) && (
        <p className="text-sm text-muted">
          {result.entered_top_k.length > 0 && <>New in the top list: {result.entered_top_k.join(', ')}. </>}
          {result.left_top_k.length > 0 && <>Dropped out: {result.left_top_k.join(', ')}.</>}
        </p>
      )}
      <p className="text-xs text-muted">Scores are out of 100. Funding meters run from out of reach (one bar) to comfortable (four).</p>
    </section>
  );
}

function Move({ d }: { d: CareerDelta }) {
  if (d.base_rank === null || d.new_rank === null) return <span className="text-xs text-scan">New in the list</span>;
  const diff = d.base_rank - d.new_rank;
  if (diff === 0) return <span className="flex items-center gap-1 text-xs text-muted"><Minus size={12} aria-hidden />Same place</span>;
  return (
    <span className={`flex items-center gap-1 text-xs ${diff > 0 ? 'text-scan' : 'text-muted'}`}>
      {diff > 0 ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />}
      {diff > 0 ? `Up ${diff}` : `Down ${-diff}`} from {d.base_rank}
    </span>
  );
}
