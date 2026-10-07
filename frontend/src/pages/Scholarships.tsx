import { Check, HelpCircle, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useScholarships } from '@/api/hooks';
import type { ScholarshipMatch } from '@/api/types';
import { useStudentContext } from '@/auth/session';
import { DateStatusTag, EmptyState, ErrorState, PageHeader, PageSkeleton, ProvenanceBadge, Section } from '@/components/ui';
import { daysUntil, formatDate, formatINR, formatINRShort, humanize } from '@/lib/format';

const PROVIDER: Record<string, string> = {
  central_govt: 'Central government',
  state_govt: 'State government',
  private: 'Private foundation',
  institution: 'Institution',
  corporate: 'Company',
  ngo: 'Charity',
};

type Filter = 'all' | 'potential';

export default function Scholarships() {
  const ctx = useStudentContext();
  const all = useScholarships();
  const [filter, setFilter] = useState<Filter>('potential');
  const [q, setQ] = useState('');

  const { potential, unclear, rest } = useMemo(() => {
    const list = [...(all.data ?? [])].sort(byDeadline);
    return {
      potential: list.filter((m) => m.eligible === true),
      unclear: list.filter((m) => m.eligible === null),
      rest: list.filter((m) => m.eligible === false),
    };
  }, [all.data]);

  const match = (m: ScholarshipMatch) =>
    !q || `${m.scholarship.name} ${m.scholarship.provider} ${m.scholarship.eligibility_summary}`.toLowerCase().includes(q.toLowerCase());
  const hasProfile = !!ctx.latestRunId || ctx.role !== 'student';

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Scholarships"
        intro="Money that could pay part of the fees. We check each rule against your profile and say plainly when we can't tell yet. Always confirm on the official portal before applying."
      />
      {all.isLoading ? (
        <PageSkeleton />
      ) : all.isError ? (
        <ErrorState error={all.error} retry={() => all.refetch()} />
      ) : (
        <div className="grid gap-16">
          <div className="flex flex-wrap items-end justify-between gap-6 border-y border-line py-5">
            <div className="flex flex-wrap gap-x-10 gap-y-3">
              <Count n={potential.length} label="you likely qualify for" />
              <Count n={unclear.length} label="need more details" />
              <Count n={(all.data ?? []).length} label="common scholarships in all" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div role="radiogroup" aria-label="Show" className="flex rounded-full border border-line p-1">
                {(['potential', 'all'] as Filter[]).map((f) => (
                  <button key={f} role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}
                    className={`min-h-[36px] rounded-full px-4 text-sm transition-colors ${filter === f ? 'bg-ink text-void' : 'text-muted hover:text-ink'}`}>
                    {f === 'potential' ? 'For me' : 'All'}
                  </button>
                ))}
              </div>
              <label className="field"><span className="sr-only">Search scholarships</span>
                <input className="input min-h-[44px] w-[220px]" type="search" placeholder="Search by name or provider" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
            </div>
          </div>

          {!hasProfile && (
            <p className="note text-sm">
              Finish the questionnaire so we can check each rule against your profile. <Link className="text-accent hover:underline" to="/app/questionnaire">Open the questionnaire</Link>
            </p>
          )}

          {filter === 'potential' ? (
            <>
              <List title="Potential scholarships for you" aside="You meet every rule we can check" items={potential.filter(match)}
                empty="None yet. Add your marks and family details in your profile so we can check more rules." />
              <List title="Worth checking" aside="Some rules need details we don't have" items={unclear.filter(match)} empty="Nothing here." />
            </>
          ) : (
            <List title="Common scholarships" aside="Sorted by deadline" items={[...potential, ...unclear, ...rest].sort(byDeadline).filter(match)} empty="No scholarship matches that search." />
          )}
        </div>
      )}
    </div>
  );
}

const byDeadline = (a: ScholarshipMatch, b: ScholarshipMatch) =>
  (a.scholarship.deadline ?? '9999').localeCompare(b.scholarship.deadline ?? '9999');

function Count({ n, label }: { n: number; label: string }) {
  return <p className="grid"><span className="figure text-3xl">{n}</span><span className="text-xs text-muted">{label}</span></p>;
}

function List({ title, aside, items, empty }: { title: string; aside: string; items: ScholarshipMatch[]; empty: string }) {
  return (
    <Section title={title} aside={<span className="text-xs text-muted">{aside}</span>}>
      {items.length === 0 ? <EmptyState title={empty} /> : (
        <ul className="grid gap-x-12 gap-y-12 md:grid-cols-2">
          {items.map((m) => <Card key={m.scholarship.id} m={m} />)}
        </ul>
      )}
    </Section>
  );
}

function Card({ m }: { m: ScholarshipMatch }) {
  const s = m.scholarship;
  const days = s.deadline ? daysUntil(s.deadline) : null;
  const amount =
    s.amount_type === 'full_tuition'
      ? 'Full tuition'
      : s.amount_type === 'percent_tuition' && s.percent_of_tuition
        ? `${Math.round(s.percent_of_tuition <= 1 ? s.percent_of_tuition * 100 : s.percent_of_tuition)}% of tuition`
        : formatINR(s.amount_per_year);
  return (
    <li className="leaf grid content-start gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <h3 className="display text-2xl leading-tight">{s.name}</h3>
          <p className="text-sm text-muted">{s.provider}, {PROVIDER[s.provider_type]?.toLowerCase() ?? humanize(s.provider_type).toLowerCase()}</p>
        </div>
        <ProvenanceBadge p={s.provenance} />
      </div>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="figure text-3xl">{amount}</span>
        <span className="text-sm text-muted">{s.amount_type === 'fixed' ? 'a year, ' : ''}for up to {s.max_years} {s.max_years === 1 ? 'year' : 'years'}{s.covers.length ? `. Covers ${s.covers.join(', ')}` : ''}</span>
      </p>
      {s.year_amounts && s.year_amounts.length > 1 && (
        <p className="text-xs text-muted">{s.year_amounts.map((a, i) => `Year ${i + 1}: ${formatINRShort(a)}`).join(', ')}</p>
      )}
      <div className="grid gap-2">
        <p className="text-sm">{s.eligibility_summary}</p>
        <ul className="grid gap-1.5 text-sm">
          {m.checks.map((c) => (
            <li key={c.rule} className="flex items-start gap-2 text-muted">
              {c.passed === true ? <Check size={15} className="mt-0.5 shrink-0 text-accent" aria-label="Met" /> : c.passed === false ? <X size={15} className="mt-0.5 shrink-0 text-danger" aria-label="Not met" /> : <HelpCircle size={15} className="mt-0.5 shrink-0" aria-label="Can't tell yet" />}
              <span>{plainRule(c.rule)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {s.deadline ? (
          <>
            <span>Apply by {formatDate(s.deadline)}{days !== null && days >= 0 ? <span className="text-muted">, in {days} days</span> : ''}</span>
            <DateStatusTag status={s.deadline_status} />
          </>
        ) : <span className="text-muted">Deadline not announced</span>}
        {m.expected_value > 0 && <span className="text-muted">Expected value {formatINRShort(m.expected_value)}</span>}
      </p>
    </li>
  );
}

const FIELD: Record<string, string> = {
  annual_income: 'Family income',
  board_percentile: 'Class 12 board percentile',
  entrance_percentile: 'Entrance exam percentile',
  recent_score_pct: 'Latest marks, %',
  course_area: 'Course',
  state: 'Lives in',
};

/** Eligibility rules in plain words: "annual_income <= 450000" → "Family income ₹4,50,000 or below". */
function plainRule(rule: string) {
  if (rule === 'first_graduate == True') return 'First in the family to go to college';
  if (rule.startsWith('admission_route')) return 'Admission through single-window counselling';
  const m = rule.match(/^(\w+)\s*(>=|<=|==|in|<|>)\s*(.+)$/);
  if (!m) return rule;
  const [, field, op, raw] = m;
  const name = FIELD[field] ?? humanize(field);
  const value = raw.replace(/[[\]']/g, '').replace(/_/g, ' ');
  const shown = field === 'annual_income' && /^\d+$/.test(value) ? formatINR(Number(value)) : value;
  if (field === 'state') return `${name} ${shown}`;
  if (op === '>=') return `${name} ${shown} or above`;
  if (op === '<=') return `${name} ${shown} or below`;
  if (op === '<') return `${name} below ${shown}`;
  if (op === '>') return `${name} above ${shown}`;
  if (op === 'in') return `${name}: ${shown}`;
  return `${name}: ${shown}`;
}
