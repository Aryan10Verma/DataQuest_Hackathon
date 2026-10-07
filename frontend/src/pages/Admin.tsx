import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAdminAnalytics, useOutcomeSummary } from '@/api/hooks';
import type { CountRow, RefreshResult } from '@/api/types';
import { ErrorState, fundingLabel, PageHeader, PageSkeleton, Section } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { formatDate, humanize, pct } from '@/lib/format';

export default function Admin() {
  const a = useAdminAnalytics();
  const o = useOutcomeSummary();
  const refresh = useMutation({
    mutationFn: (dry_run: boolean) => api<RefreshResult>('/api/v1/admin/data/refresh', { method: 'POST', body: { source: 'adapter', dry_run } }),
  });
  if (a.isLoading) return <PageSkeleton />;
  if (a.isError) return <ErrorState error={a.error} retry={() => a.refetch()} />;
  const d = a.data!;
  return (
    <div className="mx-auto grid max-w-[1100px] gap-14">
      <PageHeader
        title="Analytics"
        intro={`Counts only. Any group smaller than ${d.k_anonymity_threshold} is hidden so no family can be identified. Generated ${formatDate(d.generated_at)}.`}
      />
      <div className="flex flex-wrap gap-x-12 gap-y-4 border-y border-line py-5">
        <Big value={d.students_total} label="students" />
        <Big value={d.families_linked} label="families linked" />
        <Big value={d.runs_total} label="analysis runs" />
        <Big value={`${Math.round(d.median_run_ms)} ms`} label="median run time" />
        <Big value={d.suppressed_groups} label="groups hidden for privacy" />
      </div>
      <div className="grid gap-12 md:grid-cols-2">
        <Bars title="Most recommended careers" rows={d.top_recommended_careers} />
        <Bars title="How affordable the top paths are" rows={d.affordability_class_distribution} label={(k) => fundingLabel(k as never) ?? humanize(k)} />
        <Bars title="Family difference" rows={d.conflict_band_distribution} label={humanize} />
        <Bars title="Holland codes" rows={d.riasec_code_distribution} />
        <Bars title="Regions" rows={d.region_distribution} />
      </div>
      <Section title="What families did next">
        {o.isLoading ? null : o.isError ? <ErrorState error={o.error} /> : o.data && (
          <div className="grid gap-3 text-sm">
            <p className="text-muted">{o.data.notice}</p>
            {o.data.suppressed ? (
              <p>{o.data.responses} {o.data.responses === 1 ? 'response' : 'responses'} so far. Shares appear at {d.k_anonymity_threshold} or more.</p>
            ) : (
              <div className="flex flex-wrap gap-x-10 gap-y-3">
                <Big value={pct(o.data.followed_top3_share)} label="chose a top-3 match" />
                <Big value={pct(o.data.followed_top10_share)} label="chose a top-10 match" />
                <Big value={o.data.mean_satisfaction?.toFixed(1) ?? '—'} label="satisfaction out of 5" />
                <Big value={pct(o.data.scholarship_received_share)} label="received a scholarship" />
              </div>
            )}
          </div>
        )}
      </Section>
      <Section title="Data refresh">
        <p className="max-w-measure text-sm text-muted">Pull new job postings from the live feed. A dry run checks the data without publishing it. Each refresh creates a new dataset version; older results stay reproducible.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-quiet" onClick={() => refresh.mutate(true)} disabled={refresh.isPending}>Dry run</button>
          <button className="btn-primary" onClick={() => refresh.mutate(false)} disabled={refresh.isPending}>{refresh.isPending ? 'Refreshing…' : 'Refresh now'}</button>
        </div>
        {refresh.isError && <p role="alert" className="text-sm text-danger">{errorMessage(refresh.error)}</p>}
        {refresh.data && (
          <div className="text-sm">
            <p>{humanize(refresh.data.status)} from {refresh.data.source}, finished {formatDate(refresh.data.finished_at)}.</p>
            {refresh.data.warnings.map((w) => <p key={w} className="text-muted">{w}</p>)}
          </div>
        )}
      </Section>
    </div>
  );
}

function Big({ value, label }: { value: number | string; label: string }) {
  return <p className="grid"><span className="figure text-3xl">{value}</span><span className="text-xs text-muted">{label}</span></p>;
}

function Bars({ title, rows, label = (k) => k }: { title: string; rows: CountRow[]; label?: (k: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Section title={title}>
      {rows.length === 0 ? <p className="text-sm text-muted">Hidden: every group is below the privacy threshold.</p> : (
        <ul className="grid gap-2.5">
          {rows.slice(0, 8).map((r) => (
            <li key={r.key} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
              <span className="truncate">{label(r.key)}</span>
              <span className="h-1.5 rounded-full bg-white/[0.06]"><span className="block h-full rounded-full bg-scan" style={{ width: pct(r.count / max) }} /></span>
              <span className="text-right tabular-nums text-muted">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
