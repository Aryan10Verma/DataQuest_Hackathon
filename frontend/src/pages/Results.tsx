import * as Tabs from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCreateRun, useNarrative } from '@/api/hooks';
import type { AnalysisRun, Bucket, Recommendation } from '@/api/types';
import { useSession } from '@/auth/session';
import { PART } from '@/components/parts';
import {
  ConfidenceChip, CountUp, ErrorState, FundingMeter, PartLegend, Ring, ScoreBar, Skeleton, Tip, TrustBadge,
} from '@/components/ui';
import { formatDate, formatINRShort, pct, sectorLabel } from '@/lib/format';
import { CareerDrawer } from './CareerDrawer';
import { RunGate, useActiveRun, useOpenReport } from './runContext';

const BUCKETS: { key: Bucket; label: (parent: boolean) => string }[] = [
  { key: 'best_overall', label: () => 'Best overall' },
  { key: 'best_for_student', label: (p) => (p ? 'Best for your child' : 'Best for you') },
  { key: 'best_for_family', label: () => 'Best for the family' },
  { key: 'bridge', label: () => 'Bridges' },
  { key: 'hidden_gems', label: () => 'Hidden gems' },
  { key: 'stretch_goals', label: () => 'Stretch goals' },
];

const COMPOSITES: { key: keyof AnalysisRun['composite_scores']; label: string }[] = [
  { key: 'overall_readiness', label: 'Readiness' },
  { key: 'aptitude_index', label: 'Aptitude' },
  { key: 'interest_clarity', label: 'Interest clarity' },
  { key: 'financial_capacity', label: 'Finances' },
  { key: 'family_alignment', label: 'Family agreement' },
  { key: 'market_outlook', label: 'Job market' },
];

export default function Results() {
  const ctx = useActiveRun();
  return (
    <RunGate ctx={ctx}>
      {ctx.run.data && <ResultsView run={ctx.run.data} studentId={ctx.studentId} studentName={ctx.studentName} />}
    </RunGate>
  );
}

function ResultsView({ run, studentId, studentName }: { run: AnalysisRun; studentId: string | null; studentName: string | null }) {
  const { user, lang } = useSession();
  const isParent = user?.role === 'parent';
  const navigate = useNavigate();
  const { careerId } = useParams();
  const top = run.recommendations[0];
  const rerun = useCreateRun();
  const openReport = useOpenReport();
  const [reportError, setReportError] = useState<unknown>(null);
  const firstName = studentName?.split(' ')[0];

  const open = (id: string) => navigate(`/app/results/career/${id}`);
  const selected = run.recommendations.find((r) => r.career.id === careerId) ?? null;

  return (
    <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-10">
      {run.reproducibility.is_outdated && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-scan/40 px-4 py-3 text-sm">
          <span>Newer data is available ({run.reproducibility.latest_dataset_version}). Run the analysis again to use it.</span>
          {studentId && (
            <button className="btn-text min-h-0" onClick={() => rerun.mutate(studentId)} disabled={rerun.isPending}>
              {rerun.isPending ? 'Running…' : 'Run again'}
            </button>
          )}
        </div>
      )}

      {/* Hero: the scan lands on the best match, inside the same ring as the landing page. */}
      {top && (
        <section aria-labelledby="best-match" className="grid gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <Ring size={208} progress={top.final_score}>
            <span className="figure block text-4xl leading-none">
              <CountUp value={top.final_score * 100} />
            </span>
            <span className="text-xs text-muted">of 100</span>
          </Ring>
          <div className="grid gap-4">
            <p className="text-sm text-muted">{firstName ? `Best match for ${firstName}` : 'Best match'}</p>
            <h1 id="best-match" className="display text-3xl sm:text-4xl">{top.career.name}</h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <span>{sectorLabel(top.career.sector)}</span>
              <FundingMeter value={top.financial.affordability_class} />
              <span>{formatINRShort(top.financial.total_cost)} for {top.financial.pathway_name}</span>
            </div>
            <div className="grid max-w-[560px] gap-2">
              <ScoreBar contributions={top.contributions} height={10} />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <ConfidenceChip score={top.final_score} low={top.ci_low} high={top.ci_high} />
                <TrustBadge trust={top.data_trust} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button className="btn-primary" onClick={() => open(top.career.id)}>Why this score</button>
              <Link to="/app/what-if" className="btn-quiet">Try a what-if</Link>
              <Link to="/app/family" className="btn-quiet">Family conversation</Link>
              <Link to="/app/plan" className="btn-quiet">Plan</Link>
              <button
                className="btn-quiet"
                onClick={() => openReport(run.run_id).then(() => setReportError(null), setReportError)}
              >
                Download report
              </button>
            </div>
            {reportError ? <ErrorState error={reportError} /> : null}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 grid-cols-1 gap-10">
          <Summary runId={run.run_id} lang={lang} />
          <Ranked run={run} isParent={isParent} onOpen={open} />
        </div>
        <aside className="grid content-start gap-4">
          <FamilyMini run={run} />
          <Robustness run={run} />
          <RunFacts run={run} studentId={studentId} rerun={() => studentId && rerun.mutate(studentId)} busy={rerun.isPending} />
        </aside>
      </div>

      {/* The six composite scores, in the same bar as the landing page. */}
      <section aria-label="Overall scores" className="z-20 -mx-4 border-t border-line bg-void/90 px-4 backdrop-blur sm:-mx-8 sm:px-8 lg:sticky lg:bottom-0 lg:-ml-10 lg:-mr-12 lg:pl-10 lg:pr-12">
        <dl className="grid grid-cols-3 sm:grid-cols-6">
          {COMPOSITES.map((c, i) => (
            <div key={c.key} className={`flex flex-col justify-center py-3 sm:min-h-[72px] sm:flex-row sm:items-center sm:gap-3 sm:py-0 ${i % 3 ? 'border-l border-line pl-3' : ''} sm:border-l sm:pl-4 sm:first:border-l-0 sm:first:pl-0`}>
              <dd className="figure order-first text-xl sm:text-2xl">{Math.round(run.composite_scores[c.key])}</dd>
              <dt className="text-xs text-muted">{c.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <CareerDrawer rec={selected} run={run} onClose={() => navigate('/app/results')} />
    </div>
  );
}

function Summary({ runId, lang }: { runId: string; lang: 'en' | 'ta' | 'hi' }) {
  const n = useNarrative(runId, lang);
  if (n.isLoading) return <Skeleton className="h-36" />;
  if (n.isError) return <ErrorState error={n.error} retry={() => n.refetch()} />;
  if (!n.data) return null;
  return (
    <section aria-labelledby="summary" lang={n.data.language} className="grid gap-3 border-l border-scan/60 pl-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="summary" className="text-lg font-semibold">{n.data.headline}</h2>
        {n.data.source === 'model' && (
          <Tip label="A language model rephrased this from the facts below. It never changes scores or rankings.">
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">Rephrased by AI</span>
          </Tip>
        )}
      </div>
      <ul className="grid max-w-measure gap-1.5 text-muted">
        {n.data.bullets.map((b) => (
          <li key={b} className="relative pl-4 before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-2 before:bg-muted">{b}</li>
        ))}
      </ul>
      <p className="text-xs text-muted/80">{n.data.notice}</p>
    </section>
  );
}

function Ranked({ run, isParent, onOpen }: { run: AnalysisRun; isParent: boolean; onOpen: (id: string) => void }) {
  const [tab, setTab] = useState<Bucket>('best_overall');
  const buckets = run.buckets as Record<string, { career_id: string; career_name: string; score: number; reason: string }[]>;
  return (
    <section aria-labelledby="ranked" className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="ranked" className="text-lg font-semibold">All matches</h2>
        <PartLegend />
      </div>
      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as Bucket)} className="min-w-0">
        <Tabs.List aria-label="Ways to rank" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line pb-px">
          {BUCKETS.filter((b) => (buckets[b.key]?.length ?? 0) > 0).map((b) => (
            <Tabs.Trigger key={b.key} value={b.key}
              className="relative min-h-[44px] shrink-0 px-3 text-sm text-muted transition-colors data-[state=active]:text-ink hover:text-ink">
              {b.label(isParent)}
              {tab === b.key && <motion.span layoutId="tab-marker" className="absolute inset-x-3 -bottom-px h-px bg-scan shadow-[0_0_8px_var(--glow)]" />}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {BUCKETS.map((b) => (
          <Tabs.Content key={b.key} value={b.key} className="pt-2 focus-visible:outline-none">
            <ol>
              {(buckets[b.key] ?? []).map((item) => {
                const rec = run.recommendations.find((r) => r.career.id === item.career_id);
                return rec ? (
                  <Row key={item.career_id} rec={rec} reason={b.key === 'stretch_goals' ? item.reason : undefined} onOpen={onOpen} />
                ) : (
                  <li key={item.career_id} className="grid gap-1 border-b border-line py-4">
                    <span className="font-semibold">{item.career_name}</span>
                    <span className="text-sm text-muted">{item.reason}</span>
                  </li>
                );
              })}
            </ol>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </section>
  );
}

export function Row({ rec, reason, onOpen }: { rec: Recommendation; reason?: string; onOpen: (id: string) => void }) {
  return (
    <li className="border-b border-line">
      <button onClick={() => onOpen(rec.career.id)}
        className="grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 text-left transition-colors hover:bg-white/[0.02] md:grid-cols-[2rem_minmax(0,1.4fr)_minmax(0,1fr)_3.5rem_8.5rem_4.5rem]">
        <span className="figure text-xl text-muted">{rec.rank}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{rec.career.name}</span>
          <span className="block truncate text-xs text-muted">{sectorLabel(rec.career.sector)}</span>
        </span>
        <span className="col-span-3 col-start-2 row-start-2 md:col-span-1 md:col-start-3 md:row-start-1">
          <ScoreBar contributions={rec.contributions} />
        </span>
        <span className="figure text-right text-lg md:text-left">{Math.round(rec.final_score * 100)}</span>
        <span className="hidden md:block"><FundingMeter value={rec.financial.affordability_class} /></span>
        <span className="hidden text-right text-sm text-muted md:block">{formatINRShort(rec.financial.total_cost)}</span>
        {reason && <span className="col-span-3 col-start-2 text-xs text-muted md:col-span-5">{reason}</span>}
      </button>
    </li>
  );
}

function FamilyMini({ run }: { run: AnalysisRun }) {
  const c = run.conflict;
  const full = c.visibility === 'full';
  return (
    <section className="panel grid gap-3 p-5" aria-labelledby="fam-mini">
      <h2 id="fam-mini" className="text-sm font-semibold">Family conversation</h2>
      {full ? (
        <p className="flex items-baseline gap-2">
          <span className="figure text-3xl">{Math.round(c.index)}</span>
          <span className="text-sm text-muted">of 100, {c.band} difference</span>
        </p>
      ) : (
        <p className="text-sm text-muted">{c.summary}</p>
      )}
      <p className="text-sm text-muted">{c.top_drivers.length} things to talk about, and {c.bridge_careers.length} careers you could both back.</p>
      <Link to="/app/family" className="btn-text min-h-0 justify-self-start">Open the conversation</Link>
    </section>
  );
}

function Robustness({ run }: { run: AnalysisRun }) {
  const s = run.sensitivity;
  if (!s) return null;
  const stability = (s as typeof s & { top1_stability?: number }).top1_stability;
  return (
    <section className="panel grid gap-3 p-5" aria-labelledby="robust">
      <h2 id="robust" className="text-sm font-semibold">How stable is this ranking?</h2>
      {stability !== undefined && (
        <p className="text-sm text-muted">
          <span className="figure mr-1 text-3xl text-ink">{pct(stability)}</span>
          of {s.scenarios} reweighted scenarios keep the same best match.
        </p>
      )}
      <p className="text-sm text-muted">
        Each weight was moved by ±{Math.round(s.perturbation * 100)}%. The ranking is most sensitive to{' '}
        <span className="text-ink">{(PART[s.most_sensitive_weight as keyof typeof PART]?.label ?? s.most_sensitive_weight.replace(/_/g, ' ')).toLowerCase()}</span>.
      </p>
    </section>
  );
}

function RunFacts({ run, studentId, rerun, busy }: { run: AnalysisRun; studentId: string | null; rerun: () => void; busy: boolean }) {
  return (
    <section className="grid gap-2 px-1 text-xs text-muted" aria-label="About this run">
      <p>Run on {formatDate(run.created_at)} with data from {formatDate(run.reproducibility.data_as_of)}, in {run.duration_ms} ms.</p>
      <p>Same inputs always give the same result. Input fingerprint {run.reproducibility.input_hash.slice(0, 10)}.</p>
      {run.data_quality.warnings.map((w) => (
        <p key={w} className="text-ink/80">{w}</p>
      ))}
      {studentId && (
        <button className="btn-text min-h-[36px] justify-self-start" onClick={rerun} disabled={busy}>
          <RefreshCw size={13} aria-hidden /> {busy ? 'Running…' : 'Run the analysis again'}
        </button>
      )}
    </section>
  );
}
