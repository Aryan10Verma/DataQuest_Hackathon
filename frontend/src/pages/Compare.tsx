import { X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AnalysisRun, Recommendation } from '@/api/types';
import { PART, PARTS } from '@/components/parts';
import { FundingMeter, PageHeader, PrivateValue } from '@/components/ui';
import { formatINRShort, pct, sectorLabel } from '@/lib/format';
import { RunGate, useActiveRun } from './runContext';

export default function Compare() {
  const ctx = useActiveRun();
  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader title="Compare careers" intro="Pick up to three careers from your results and see them side by side. The best value in each row is marked." />
      <RunGate ctx={ctx}>{ctx.run.data && <Table run={ctx.run.data} />}</RunGate>
    </div>
  );
}

interface Row {
  label: string;
  help?: string;
  value: (r: Recommendation) => number | null;
  show: (r: Recommendation) => ReactNode;
  /** Which way is better; omit for rows that aren't ranked. */
  better?: 'high' | 'low';
  bar?: string;
}

const money = (v: number | null | undefined) => (v === null || v === undefined ? null : v);

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Overall',
    rows: [
      { label: 'Score', value: (r) => r.final_score, show: (r) => <span className="figure text-3xl">{Math.round(r.final_score * 100)}</span>, better: 'high' },
      { label: 'Likely range', value: () => null, show: (r) => `${Math.round(r.ci_low * 100)} to ${Math.round(r.ci_high * 100)}` },
    ],
  },
  {
    title: 'The six parts',
    rows: PARTS.map((p) => ({
      label: p.label,
      help: p.help,
      value: (r: Recommendation) => r.contributions.find((c) => c.component === p.key)?.raw_value ?? null,
      show: (r: Recommendation) => pct(r.contributions.find((c) => c.component === p.key)?.raw_value),
      better: p.key === 'disruption' ? ('low' as const) : ('high' as const),
      bar: PART[p.key].color,
    })),
  },
  {
    title: 'Money',
    rows: [
      { label: 'Total course cost', value: (r) => r.financial.total_cost, show: (r) => formatINRShort(r.financial.total_cost), better: 'low' },
      { label: 'Funding', value: () => null, show: (r) => <FundingMeter value={r.financial.affordability_class} /> },
      { label: 'Scholarships expected', value: (r) => r.financial.scholarship_expected, show: (r) => formatINRShort(r.financial.scholarship_expected), better: 'high' },
      {
        label: 'Loan needed', value: (r) => money(r.financial.loan_required), better: 'low',
        show: (r) => <PrivateValue value={r.financial.loan_required}>{formatINRShort(r.financial.loan_required)}</PrivateValue>,
      },
      {
        label: 'Monthly loan payment', value: (r) => money(r.financial.monthly_emi), better: 'low',
        show: (r) => <PrivateValue value={r.financial.monthly_emi}>{formatINRShort(r.financial.monthly_emi)}</PrivateValue>,
      },
      { label: 'Starting salary, per year', value: (r) => r.financial.roi.starting_salary, show: (r) => formatINRShort(r.financial.roi.starting_salary), better: 'high' },
      {
        label: 'Pays back in', value: (r) => r.financial.roi.payback_years, better: 'low',
        show: (r) => (r.financial.roi.payback_years !== null ? `${r.financial.roi.payback_years.toFixed(1)} years` : 'Beyond the horizon'),
      },
    ],
  },
  {
    title: 'Getting in and the job',
    rows: [
      { label: 'Course', value: () => null, show: (r) => <span className="text-sm">{r.financial.pathway_name}<span className="block text-xs text-muted">{r.financial.institution_name}</span></span> },
      { label: 'Admission chance', value: (r) => r.financial.admission_chance, show: (r) => pct(r.financial.admission_chance), better: 'high' },
      { label: 'Demand for the job', value: (r) => r.market.demand_index, show: (r) => pct(r.market.demand_index), better: 'high' },
      { label: 'Hiring growth', value: (r) => r.market.job_velocity, show: (r) => `${r.market.job_velocity >= 0 ? '+' : ''}${pct(r.market.job_velocity)}`, better: 'high' },
      { label: "Parents' hopes", value: (r) => r.family.parent_acceptance, show: (r) => pct(r.family.parent_acceptance), better: 'high' },
    ],
  },
];

function Table({ run }: { run: AnalysisRun }) {
  const [picked, setPicked] = useState<string[]>(() => run.recommendations.slice(0, 3).map((r) => r.career.id));
  useEffect(() => setPicked(run.recommendations.slice(0, 3).map((r) => r.career.id)), [run.run_id, run.recommendations]);
  const cols = picked.map((id) => run.recommendations.find((r) => r.career.id === id)!).filter(Boolean);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));

  const best = (row: Row) => {
    if (!row.better || cols.length < 2) return new Set<string>();
    const vals = cols.map((r) => ({ id: r.career.id, v: row.value(r) })).filter((x): x is { id: string; v: number } => x.v !== null);
    if (vals.length < 2) return new Set<string>();
    const target = row.better === 'high' ? Math.max(...vals.map((x) => x.v)) : Math.min(...vals.map((x) => x.v));
    if (vals.every((x) => x.v === target)) return new Set<string>();
    return new Set(vals.filter((x) => x.v === target).map((x) => x.id));
  };

  return (
    <div className="grid gap-12">
      <fieldset className="grid gap-3">
        <legend className="mb-3 text-sm text-muted">Careers to compare ({picked.length} of 3)</legend>
        <div className="flex flex-wrap gap-2">
          {run.recommendations.map((r) => {
            const on = picked.includes(r.career.id);
            return (
              <button key={r.career.id} type="button" aria-pressed={on} onClick={() => toggle(r.career.id)} disabled={!on && picked.length >= 3}
                className={`min-h-[40px] rounded-full border px-4 text-sm transition-colors disabled:opacity-40 ${on ? 'border-accent text-ink' : 'border-line text-muted hover:text-ink'}`}>
                {r.rank}. {r.career.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      {cols.length === 0 ? (
        <p className="text-muted">Pick at least one career above.</p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
            <colgroup><col className="w-[30%]" />{cols.map((c) => <col key={c.career.id} />)}</colgroup>
            <thead>
              <tr>
                <th className="pb-6 align-bottom text-xs font-normal text-muted">Best value marked <span className="text-accent">●</span></th>
                {cols.map((r) => (
                  <th key={r.career.id} scope="col" className="pb-6 pr-6 align-bottom font-normal">
                    <span className="flex items-start justify-between gap-2">
                      <span>
                        <span className="text-xs text-muted">Rank {r.rank}, {sectorLabel(r.career.sector)}</span>
                        <Link to={`/app/results/career/${r.career.id}`} className="display mt-1 block text-2xl leading-tight hover:text-accent">{r.career.name}</Link>
                      </span>
                      <button className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-ink" onClick={() => toggle(r.career.id)} aria-label={`Remove ${r.career.name}`}>
                        <X size={14} />
                      </button>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            {GROUPS.map((g) => (
              <tbody key={g.title}>
                <tr><th colSpan={cols.length + 1} scope="colgroup" className="display border-b border-ink/25 pb-2 pt-8 text-xl font-normal">{g.title}</th></tr>
                {g.rows.map((row) => {
                  const winners = best(row);
                  return (
                    <tr key={row.label} className="border-b border-line align-middle">
                      <th scope="row" className="py-3.5 pr-4 text-sm font-normal text-muted" title={row.help}>{row.label}</th>
                      {cols.map((r) => {
                        const v = row.value(r);
                        return (
                          <td key={r.career.id} className="py-3.5 pr-6 text-sm tabular-nums">
                            <span className="flex items-center gap-2">
                              {row.show(r)}
                              {winners.has(r.career.id) && <span className="text-accent" aria-label="Best">●</span>}
                            </span>
                            {row.bar && v !== null && (
                              <span className="mt-1.5 block h-1 rounded-full bg-white/[0.06]">
                                <span className={`block h-full rounded-full ${row.label === PART.disruption.label ? 'hatch' : ''}`}
                                  style={{ width: pct(v), background: row.label === PART.disruption.label ? undefined : row.bar }} />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </div>
  );
}
