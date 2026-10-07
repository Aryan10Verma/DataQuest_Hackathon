import * as Slider from '@radix-ui/react-slider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '@/api/client';
import { useCareers, useFinance, usePreferences, useRegions } from '@/api/hooks';
import type { FamilyFinanceIn, FamilyFinanceOut, IncomeBand, ParentPreferencesIn, PrestigeStability, RankedPreference } from '@/api/types';
import { useStudentContext } from '@/auth/session';
import { ErrorState, PageHeader, PageSkeleton } from '@/components/ui';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { formatINR, SECTOR_LABEL } from '@/lib/format';

const BANDS: { value: IncomeBand; label: string; mid: number }[] = [
  { value: 'below_3l', label: 'Below ₹3 L', mid: 200_000 },
  { value: '3l_6l', label: '₹3 L to ₹6 L', mid: 450_000 },
  { value: '6l_10l', label: '₹6 L to ₹10 L', mid: 800_000 },
  { value: '10l_20l', label: '₹10 L to ₹20 L', mid: 1_500_000 },
  { value: '20l_50l', label: '₹20 L to ₹50 L', mid: 3_000_000 },
  { value: 'above_50l', label: 'Above ₹50 L', mid: 6_000_000 },
];

const EMPTY: FamilyFinanceIn = {
  income_band: '6l_10l', annual_income: null, income_growth_rate: 0.05, allocatable_savings: 0, existing_debt_emi: 0, dependents: 1,
  max_affordable_emi: 0, loan_tolerance: 0.4, risk_appetite: 0.5, relocation_willingness: 0.5, abroad_willingness: 0.2,
  time_to_earn_years: 5, prestige_vs_stability: 'balanced', preferred_regions: [],
};

export default function FamilyInputs() {
  const ctx = useStudentContext();
  const finance = useFinance(ctx.familyId);
  const prefs = usePreferences(ctx.familyId);
  const notFound = (e: unknown) => e instanceof ApiError && e.status === 404;

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader title="Family inputs" intro="Your budget and hopes for your child. The analysis uses them to cost every path and to find careers you can both back." />
      <div className="mb-10 flex items-start gap-3 rounded-panel border border-scan/40 p-4 text-sm">
        <Lock size={16} className="mt-0.5 shrink-0 text-scan" aria-hidden />
        <p>Only parents see these figures. Your child sees a budget level and yes or no answers, never rupee amounts, unless you choose to share them.</p>
      </div>
      {!ctx.familyId ? (
        <p className="text-muted">Create or join a family on the <Link className="text-scan" to="/app/home">home screen</Link> first.</p>
      ) : finance.isLoading || prefs.isLoading ? (
        <PageSkeleton />
      ) : finance.isError && !notFound(finance.error) ? (
        <ErrorState error={finance.error} retry={() => finance.refetch()} />
      ) : (
        <div className="grid gap-16">
          <FinanceForm familyId={ctx.familyId} initial={finance.data && 'allocatable_savings' in finance.data ? (finance.data as FamilyFinanceOut) : null} />
          <PreferencesForm familyId={ctx.familyId} initial={prefs.data?.preferences ?? []} />
        </div>
      )}
    </div>
  );
}

function FinanceForm({ familyId, initial }: { familyId: string; initial: FamilyFinanceOut | null }) {
  const qc = useQueryClient();
  const [f, setF] = useState<FamilyFinanceIn>(() => (initial ? strip(initial) : EMPTY));
  useEffect(() => {
    if (initial) setF(strip(initial));
  }, [initial]);
  const save = useMutation({
    mutationFn: (body: FamilyFinanceIn) => api<FamilyFinanceOut>(`/api/v1/families/${familyId}/finance`, { method: 'PUT', body }),
    onSuccess: (data) => {
      qc.setQueryData(['finance', familyId], data);
      qc.invalidateQueries({ queryKey: ['runs'] });
    },
  });
  const errs = fieldErrors(save.error);
  const set = <K extends keyof FamilyFinanceIn>(k: K, v: FamilyFinanceIn[K]) => setF((p) => ({ ...p, [k]: v }));
  const regions = useRegions();

  const income = f.annual_income || BANDS.find((b) => b.value === f.income_band)!.mid;
  const preview = {
    comfort: income < 500_000 ? 'Modest' : income < 1_500_000 ? 'Moderate' : 'Comfortable',
    loans: f.loan_tolerance >= 0.4,
    move: f.relocation_willingness >= 0.5,
    abroad: f.abroad_willingness >= 0.5,
  };

  return (
    <form className="grid gap-10" noValidate onSubmit={(e) => { e.preventDefault(); save.mutate(f); }}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-10">
          <Group title="Income">
            <label className="field">
              Yearly family income
              <select className="input" value={f.income_band} onChange={(e) => set('income_band', e.target.value as IncomeBand)}>
                {BANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </label>
            <Money label="Exact yearly income (optional)" value={f.annual_income ?? null} onChange={(v) => set('annual_income', v)} error={errs.annual_income} help="Leave empty to use the middle of the range." />
            <label className="field">
              Expected yearly income growth, %
              <input className="input" type="number" min={0} max={30} step={0.5} value={Math.round(f.income_growth_rate * 1000) / 10}
                onChange={(e) => set('income_growth_rate', Number(e.target.value) / 100)} />
            </label>
            <label className="field">
              Children and others who depend on this income
              <input className="input" type="number" min={0} max={12} value={f.dependents} onChange={(e) => set('dependents', Number(e.target.value))} />
            </label>
          </Group>
          <Group title="Savings and loans">
            <Money label="Savings set aside for this child's education" value={f.allocatable_savings} onChange={(v) => set('allocatable_savings', v ?? 0)} error={errs.allocatable_savings} />
            <Money label="Loan payments you already make, per month" value={f.existing_debt_emi} onChange={(v) => set('existing_debt_emi', v ?? 0)} error={errs.existing_debt_emi} />
            <Money label="Most you could pay for an education loan, per month" value={f.max_affordable_emi} onChange={(v) => set('max_affordable_emi', v ?? 0)} error={errs.max_affordable_emi} />
            <Scale label="How open are you to an education loan?" value={f.loan_tolerance} onChange={(v) => set('loan_tolerance', v)} />
          </Group>
          <Group title="Hopes">
            <Scale label="How comfortable are you with a riskier path?" value={f.risk_appetite} onChange={(v) => set('risk_appetite', v)} />
            <Scale label="Would you support moving to another city to study?" value={f.relocation_willingness} onChange={(v) => set('relocation_willingness', v)} />
            <Scale label="Would you support studying abroad?" value={f.abroad_willingness} onChange={(v) => set('abroad_willingness', v)} />
            <label className="field">
              Years until you expect your child to start earning
              <input className="input" type="number" min={1} max={12} value={f.time_to_earn_years} onChange={(e) => set('time_to_earn_years', Number(e.target.value))} />
            </label>
            <fieldset className="grid gap-2">
              <legend className="mb-1.5 text-sm text-muted">What matters more in a career?</legend>
              <div className="grid grid-cols-3 gap-2">
                {(['stability', 'balanced', 'prestige'] as PrestigeStability[]).map((v) => (
                  <label key={v} className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border text-sm ${f.prestige_vs_stability === v ? 'border-scan bg-scan/10' : 'border-line hover:border-scan/60'}`}>
                    <input type="radio" className="sr-only" checked={f.prestige_vs_stability === v} onChange={() => set('prestige_vs_stability', v)} />
                    {v === 'stability' ? 'Stability' : v === 'balanced' ? 'Both' : 'Ambition'}
                  </label>
                ))}
              </div>
            </fieldset>
            {regions.data && (
              <fieldset className="grid gap-2">
                <legend className="mb-1.5 text-sm text-muted">Places you would prefer</legend>
                <div className="flex flex-wrap gap-2">
                  {regions.data.filter((r) => r.type !== 'international').slice(0, 24).map((r) => {
                    const on = f.preferred_regions?.includes(r.code);
                    return (
                      <button type="button" key={r.code} aria-pressed={on}
                        onClick={() => set('preferred_regions', on ? f.preferred_regions!.filter((c) => c !== r.code) : [...(f.preferred_regions ?? []), r.code])}
                        className={`min-h-[36px] rounded-full border px-3 text-xs ${on ? 'border-scan bg-scan/10 text-ink' : 'border-line text-muted hover:text-ink'}`}>
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </Group>
        </div>
        <aside className="grid content-start gap-4 lg:sticky lg:top-[96px]">
          <section className="panel grid gap-3 p-5" aria-labelledby="child-sees">
            <h2 id="child-sees" className="text-sm font-semibold">What your child sees</h2>
            <dl className="grid gap-2 text-sm">
              <Row k="Budget" v={preview.comfort} />
              <Row k="Open to a loan" v={preview.loans ? 'Yes' : 'No'} />
              <Row k="Open to moving" v={preview.move ? 'Yes' : 'No'} />
              <Row k="Open to abroad" v={preview.abroad ? 'Yes' : 'No'} />
            </dl>
            <p className="text-xs text-muted">No amounts. Savings of {formatINR(f.allocatable_savings)} stay private.</p>
          </section>
          <button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save budget'}</button>
          {save.isSuccess && <p role="status" className="text-sm text-scan">Budget saved. Run the analysis again to use it.</p>}
          {save.isError && !Object.keys(errs).length && <p role="alert" className="text-sm text-danger">{errorMessage(save.error)}</p>}
        </aside>
      </div>
    </form>
  );
}

const strip = (o: FamilyFinanceOut): FamilyFinanceIn => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { family_id, updated_by, updated_at, ...rest } = o;
  return rest;
};

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-5">
      <legend className="mb-4 w-full border-b border-line pb-2 text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between border-b border-line pb-1.5"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>;
}

function Money({ label, value, onChange, error, help }: { label: string; value: number | null; onChange: (v: number | null) => void; error?: string; help?: string }) {
  return (
    <label className="field">
      {label}
      <span className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">₹</span>
        <input className="input pl-8 tabular-nums" inputMode="numeric" value={value === null ? '' : value.toLocaleString('en-IN')} aria-invalid={!!error}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^0-9]/g, '');
            onChange(digits ? Number(digits) : null);
          }} />
      </span>
      {error ? <span className="text-xs text-danger">{error}</span> : help ? <span className="text-xs">{help}</span> : null}
    </label>
  );
}

const WORDS = ['Not at all', 'A little', 'Somewhat', 'Quite', 'Fully'];
function Scale({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid gap-2 text-sm">
      <div className="flex justify-between gap-3"><span className="text-muted">{label}</span><span>{WORDS[Math.min(4, Math.round(value * 4))]}</span></div>
      <Slider.Root className="relative flex h-6 touch-none select-none items-center" value={[value]} min={0} max={1} step={0.05} onValueChange={([v]) => onChange(v)} aria-label={label}>
        <Slider.Track className="relative h-1 grow rounded-full bg-white/[0.08]"><Slider.Range className="absolute h-full rounded-full bg-scan" /></Slider.Track>
        <Slider.Thumb className="block h-5 w-5 rounded-full border-2 border-void bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scan" />
      </Slider.Root>
    </div>
  );
}

function PreferencesForm({ familyId, initial }: { familyId: string; initial: RankedPreference[] }) {
  const qc = useQueryClient();
  const careers = useCareers({});
  const [list, setList] = useState<RankedPreference[]>(initial);
  useEffect(() => setList(initial), [initial]);
  const save = useMutation({
    mutationFn: (body: ParentPreferencesIn) => api(`/api/v1/families/${familyId}/preferences`, { method: 'PUT', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preferences', familyId] }),
  });
  const options = [
    ...(careers.data?.items ?? []).map((c) => ({ value: `career:${c.id}`, label: c.name })),
    ...Object.entries(SECTOR_LABEL).map(([k, v]) => ({ value: `domain:${k}`, label: `Any job in ${v.toLowerCase()}` })),
  ];
  const valueOf = (p: RankedPreference) => (p.career_id ? `career:${p.career_id}` : p.domain ? `domain:${p.domain}` : '');
  const update = (i: number, patch: Partial<RankedPreference>) => setList((l) => l.map((p, k) => (k === i ? { ...p, ...patch } : p)));

  return (
    <form className="grid gap-5" onSubmit={(e) => { e.preventDefault(); save.mutate({ preferences: list.map((p, i) => ({ ...p, rank: i + 1 })) }); }}>
      <div className="border-b border-line pb-2">
        <h2 className="text-lg font-semibold">Careers you hope for</h2>
        <p className="text-sm text-muted">In order of preference. These shape family agreement, never your child's fit.</p>
      </div>
      <ol className="grid gap-3">
        {list.map((p, i) => (
          <li key={i} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-3 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <span className="figure pt-2 text-xl text-muted">{i + 1}</span>
            <select className="input" aria-label={`Preference ${i + 1}`} value={valueOf(p)}
              onChange={(e) => {
                const [kind, id] = e.target.value.split(':');
                update(i, kind === 'career' ? { career_id: id, domain: null } : { domain: id, career_id: null });
              }}>
              <option value="" disabled>Choose a career or field</option>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input className="input col-start-2 sm:col-start-3" placeholder="Why (optional)" value={p.note ?? ''} onChange={(e) => update(i, { note: e.target.value || null })} aria-label={`Note for preference ${i + 1}`} />
            <button type="button" className="row-start-1 grid h-11 w-11 place-items-center rounded-full text-muted hover:text-ink sm:col-start-4" aria-label={`Remove preference ${i + 1}`}
              onClick={() => setList((l) => l.filter((_, k) => k !== i))}>
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {list.length < 5 && (
          <button type="button" className="btn-quiet" onClick={() => setList((l) => [...l, { rank: l.length + 1, career_id: null, domain: null, note: null }])}>
            <Plus size={15} aria-hidden /> Add a career
          </button>
        )}
        <button className="btn-primary" disabled={save.isPending || list.some((p) => !p.career_id && !p.domain)}>{save.isPending ? 'Saving…' : 'Save hopes'}</button>
      </div>
      {save.isSuccess && <p role="status" className="text-sm text-scan">Hopes saved. Run the analysis again to use them.</p>}
      {save.isError && <p role="alert" className="text-sm text-danger">{errorMessage(save.error)}</p>}
    </form>
  );
}
