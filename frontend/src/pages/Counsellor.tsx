import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEducatorDashboard, useRun } from '@/api/hooks';
import type { DashboardRow, FlagSeverity } from '@/api/types';
import { EmptyState, ErrorState, PageHeader, PageSkeleton, Ring, Section } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { CareerDrawer } from './CareerDrawer';
import { Row } from './Results';

const RANK: Record<FlagSeverity, number> = { urgent: 0, warn: 1, info: 2 };
const SEVERITY_LABEL: Record<FlagSeverity, string> = { urgent: 'Urgent', warn: 'Check', info: 'Note' };

export default function Counsellor() {
  const { runId } = useParams();
  return runId ? <StudentRun runId={runId} /> : <Dashboard />;
}

function Dashboard() {
  const dash = useEducatorDashboard();
  const navigate = useNavigate();
  const rows = useMemo(() => {
    const worst = (r: DashboardRow) => Math.min(3, ...r.flags.map((f) => RANK[f.severity]));
    return [...(dash.data?.students ?? [])].sort((a, b) => worst(a) - worst(b) || a.display_name.localeCompare(b.display_name));
  }, [dash.data]);
  if (dash.isLoading) return <PageSkeleton />;
  if (dash.isError) return <ErrorState error={dash.error} retry={() => dash.refetch()} />;
  const counts = dash.data!.flag_counts as Record<string, number>;
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Your students" intro={`Most urgent first. As of ${formatDate(dash.data!.as_of)}.`} />
      <div className="mb-10 flex flex-wrap gap-x-10 gap-y-4 border-y border-line py-5">
        <Count value={rows.length} label="students" />
        {(['urgent', 'warn', 'info'] as FlagSeverity[]).map((s) => <Count key={s} value={counts[s] ?? rows.reduce((n, r) => n + r.flags.filter((f) => f.severity === s).length, 0)} label={`${SEVERITY_LABEL[s].toLowerCase()} flags`} />)}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No students assigned yet" body="Students appear here once a school administrator links them to you." />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-normal">Student</th>
                <th className="py-2 pr-4 font-normal">Grade</th>
                <th className="py-2 pr-4 font-normal">Best match</th>
                <th className="py-2 pr-4 font-normal">Family difference</th>
                <th className="py-2 pr-4 font-normal">Flags</th>
                <th className="py-2 font-normal">Last run</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student_id} className={`border-b border-line align-top ${r.latest_run_id ? 'cursor-pointer hover:bg-white/[0.02]' : ''}`}
                  onClick={() => r.latest_run_id && navigate(`/app/counsellor/${r.latest_run_id}`)}>
                  <td className="py-3.5 pr-4">
                    {r.latest_run_id ? <Link to={`/app/counsellor/${r.latest_run_id}`} className="font-semibold hover:text-accent" onClick={(e) => e.stopPropagation()}>{r.display_name}</Link> : <span className="font-semibold">{r.display_name}</span>}
                  </td>
                  <td className="py-3.5 pr-4 tabular-nums">{r.grade ?? '–'}</td>
                  <td className="py-3.5 pr-4">{r.top_career ?? <span className="text-muted">No run yet</span>}</td>
                  <td className="py-3.5 pr-4 capitalize">{r.conflict_band ?? '–'}</td>
                  <td className="py-3.5 pr-4">
                    <span className="flex flex-wrap gap-1.5">
                      {r.flags.length ? r.flags.map((f) => <Flag key={f.code} severity={f.severity} message={f.message} />) : <span className="text-muted">None</span>}
                    </span>
                  </td>
                  <td className="py-3.5 text-muted">{formatDate(r.latest_run_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return <p className="grid"><span className="figure text-3xl">{value}</span><span className="text-xs text-muted">{label}</span></p>;
}

function Flag({ severity, message }: { severity: FlagSeverity; message: string }) {
  const cls = severity === 'urgent' ? 'border-danger/70 text-danger' : severity === 'warn' ? 'border-ink/50 text-ink' : 'border-line text-muted';
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${cls}`} title={message}>{SEVERITY_LABEL[severity]}: {message}</span>;
}

function StudentRun({ runId }: { runId: string }) {
  const run = useRun(runId);
  const { careerId } = useParams();
  const navigate = useNavigate();
  if (run.isLoading) return <PageSkeleton />;
  if (run.isError) return <ErrorState error={run.error} retry={() => run.refetch()} />;
  const r = run.data!;
  const top = r.recommendations[0];
  const selected = r.recommendations.find((x) => x.career.id === careerId) ?? null;
  return (
    <div className="mx-auto grid max-w-[1100px] gap-12">
      <Link to="/app/counsellor" className="btn-text min-h-0 justify-self-start">All students</Link>
      {top && (
        <div className="flex flex-wrap items-center gap-8">
          <Ring size={150} progress={top.final_score}><span className="figure text-3xl">{Math.round(top.final_score * 100)}</span></Ring>
          <div className="grid gap-1">
            <p className="text-sm text-muted">Best match, run on {formatDate(r.created_at)}</p>
            <h1 className="display text-2xl">{top.career.name}</h1>
            <p className="max-w-measure text-sm text-muted">{r.conflict.summary}</p>
          </div>
        </div>
      )}
      {r.data_quality.warnings.length > 0 && (
        <Section title="Answer quality">
          <ul className="grid gap-1 text-sm text-muted">{r.data_quality.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </Section>
      )}
      <Section title="Matches">
        <ol>{r.recommendations.map((rec) => <Row key={rec.career.id} rec={rec} onOpen={(id) => navigate(`/app/counsellor/${runId}/career/${id}`)} />)}</ol>
      </Section>
      <CareerDrawer rec={selected} run={r} onClose={() => navigate(`/app/counsellor/${runId}`)} />
    </div>
  );
}
