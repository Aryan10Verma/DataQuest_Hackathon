import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDataStatus, useFairness, useMethodology } from '@/api/hooks';
import { PART } from '@/components/parts';
import { ErrorState, PageHeader, Section, Skeleton } from '@/components/ui';
import { Logo } from '@/shell/Brand';
import { formatDate, pct } from '@/lib/format';

const FRESHNESS: Record<string, string> = { fresh: 'Up to date', aging: 'Due soon', stale: 'Overdue' };

export default function Trust() {
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="How we know" intro="Where every figure comes from, how the score is calculated, and the checks that keep it fair." />
      <TrustBody />
    </div>
  );
}

/** The same page for visitors who haven't signed in. */
export function PublicTrust() {
  return (
    <div className="min-h-screen">
      <header className="flex h-[72px] items-center justify-between border-b border-line px-4 sm:px-8">
        <Logo />
        <Link to="/signin" className="btn-quiet min-h-[40px]">Sign in</Link>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-8">
        <PageHeader title="How we know" intro="Where every figure comes from, how the score is calculated, and the checks that keep it fair." />
        <TrustBody />
      </main>
    </div>
  );
}

function TrustBody() {
  return (
    <div className="grid gap-16">
      <DataStatusBlock />
      <MethodologyBlock />
      <FairnessBlock />
    </div>
  );
}

function DataStatusBlock() {
  const s = useDataStatus();
  if (s.isLoading) return <Skeleton className="h-64" />;
  if (s.isError) return <ErrorState error={s.error} retry={() => s.refetch()} />;
  const d = s.data!;
  return (
    <div className="grid gap-10">
      <p className="lead max-w-[46ch] text-xl leading-snug sm:text-2xl">{d.statement}</p>
      <div className="flex flex-wrap gap-x-10 gap-y-4 border-y border-line py-5">
        <Fact value={pct(d.overall_checked_share, d.overall_checked_share < 0.1 ? 1 : 0)} label="of figures checked against a source" />
        <Fact value={d.dataset_version} label="dataset in use" small />
        <Fact value={formatDate(d.today)} label="today, for deadlines" small />
        <Fact value={d.computed_live ? 'Live' : 'Cached'} label="results computed on each request" small />
      </div>

      <Section title="Datasets">
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-normal">Data</th>
                <th className="py-2 pr-4 font-normal">Rows</th>
                <th className="py-2 pr-4 font-normal">As of</th>
                <th className="py-2 pr-4 font-normal">Freshness</th>
                <th className="py-2 pr-4 font-normal">Checked</th>
                <th className="py-2 font-normal">Next refresh</th>
              </tr>
            </thead>
            <tbody>
              {d.datasets.map((x) => (
                <tr key={x.dataset} className="border-b border-line align-top">
                  <td className="py-3 pr-4">
                    {x.label}
                    <span className="block text-xs text-muted">{x.sources.slice(0, 2).join(', ')}{x.sources.length > 2 ? ` and ${x.sources.length - 2} more` : ''}</span>
                  </td>
                  <td className="py-3 pr-4 tabular-nums">{x.rows}</td>
                  <td className="py-3 pr-4">{formatDate(x.newest_as_of)}</td>
                  <td className="py-3 pr-4">{FRESHNESS[x.freshness] ?? x.freshness}</td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2">
                      <span className="h-1 w-14 rounded-full bg-white/[0.08]"><span className="block h-full rounded-full bg-accent" style={{ width: pct(x.checked_share) }} /></span>
                      {pct(x.checked_share)}
                    </span>
                  </td>
                  <td className="py-3">{formatDate(x.next_refresh_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Live feeds">
        <ul className="grid gap-3">
          {d.feeds.map((f) => (
            <li key={f.key} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3 text-sm">
              <span>{f.name}</span>
              <span className={f.enabled ? 'text-accent' : 'text-muted'}>{f.enabled ? 'On' : 'Off'}. {f.detail}</span>
            </li>
          ))}
        </ul>
      </Section>

      {d.issues.length > 0 && (
        <Section title="Open data issues">
          <ul className="grid gap-2 text-sm">
            {d.issues.slice(0, 6).map((i) => (
              <li key={`${i.dataset}-${i.key}-${i.rule}`} className="text-muted">
                <span className="text-ink">{i.dataset}</span>: {i.message}
              </li>
            ))}
            {d.issues.length > 6 && <li className="text-muted">And {d.issues.length - 6} more, listed by the data audit.</li>}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Fact({ value, label, small = false }: { value: string; label: string; small?: boolean }) {
  return (
    <p className="grid gap-0.5">
      <span className={`figure ${small ? 'text-xl' : 'text-3xl'}`}>{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </p>
  );
}

function MethodologyBlock() {
  const m = useMethodology();
  if (m.isLoading) return <Skeleton className="h-64" />;
  if (m.isError) return <ErrorState error={m.error} retry={() => m.refetch()} />;
  const d = m.data!;
  const weights = d.weights as Record<string, number>;
  return (
    <div className="grid gap-10">
      <Section title="How the score is calculated" aside={<span className="text-xs text-muted">{d.scoring_config_version}</span>}>
        <div className="grid gap-2">
          <div className="flex h-3 overflow-hidden rounded-full" aria-hidden>
            {Object.entries(weights).map(([k, w]) => (
              <span key={k} className={k === 'disruption' ? 'hatch' : ''} style={{ width: pct(w), background: k === 'disruption' ? undefined : PART[k as keyof typeof PART]?.color }} />
            ))}
          </div>
          <ul className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
            {Object.entries(weights).map(([k, w]) => (
              <li key={k} className="flex justify-between border-b border-line py-1.5">
                <span>{PART[k as keyof typeof PART]?.label ?? k}</span>
                <span className="tabular-nums text-muted">{k === 'disruption' ? '−' : ''}{pct(w)}</span>
              </li>
            ))}
          </ul>
        </div>
        <dl className="grid gap-6">
          {d.formulas.map((f) => (
            <div key={f.name} className="grid gap-2 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-8">
              <dt className="font-semibold">{f.name}</dt>
              <dd className="grid gap-2">
                <p className="text-muted">{f.explanation}</p>
                <code className="block overflow-x-auto whitespace-pre-wrap rounded-lg border border-line bg-void px-3 py-2 text-xs text-ink/90">{f.expression}</code>
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <div className="grid gap-10 md:grid-cols-3">
        <List title="Fairness safeguards" items={d.fairness_safeguards} />
        <List title="Privacy" items={d.privacy_rules} />
        <List title="Limitations" items={d.limitations} />
      </div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      <ul className="grid gap-2 text-sm text-muted">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </Section>
  );
}

function FairnessBlock() {
  const f = useFairness();
  if (f.isLoading) return <Skeleton className="h-48" />;
  if (f.isError) return <ErrorState error={f.error} retry={() => f.refetch()} />;
  const d = f.data!;
  return (
    <Section title="Fairness checks" aside={<span className="text-xs text-muted">Run on {formatDate(d.generated_at)}</span>}>
      <p className="display text-xl">
        Protected attributes used:{' '}
        <span className="text-accent">{d.protected_attributes_used.length ? d.protected_attributes_used.join(', ') : 'none'}</span>
      </p>
      <ul>
        {d.probes.map((p) => (
          <li key={p.name} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 border-b border-line py-3 text-sm">
            {p.passed ? <Check size={16} className="mt-0.5 text-accent" aria-label="Passed" /> : <X size={16} className="mt-0.5 text-danger" aria-label="Failed" />}
            <span>
              {p.description}
              <span className="block text-xs text-muted">{p.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
