import * as Slider from '@radix-ui/react-slider';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLoanExplain } from '@/api/hooks';
import { ErrorState, PageHeader, ProvenanceBadge, Section, Skeleton } from '@/components/ui';
import { formatINR, formatINRShort, pct } from '@/lib/format';

const TIERS = [
  { value: 0, label: 'Not sure' },
  { value: 1, label: 'Top-ranked institute' },
  { value: 2, label: 'Well-ranked' },
  { value: 3, label: 'Other recognised' },
  { value: 4, label: 'Unranked' },
];

/** Debounce slider input so the explainer isn't recomputed on every pixel. */
function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Loans() {
  const [params] = useSearchParams();
  const [amount, setAmount] = useState(Number(params.get('amount')) || 800_000);
  const [years, setYears] = useState(Number(params.get('years')) || 4);
  const [income, setIncome] = useState(600_000);
  const [tier, setTier] = useState(0);
  const q = useDebounced({ amount, course_years: years, annual_income: income, institution_tier: tier || undefined });
  const loan = useLoanExplain(q);
  const d = loan.data;
  const maxEmi = d ? Math.max(...d.options.map((o) => o.monthly_emi)) : 1;

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Education loans, explained" intro="Move the sliders to see what a loan would cost each month, how much interest builds up while studying, and which government schemes may help." />
      <div className="grid gap-12 lg:grid-cols-[340px_minmax(0,1fr)]">
        <form className="grid content-start gap-7" onSubmit={(e) => e.preventDefault()}>
          <Range label="Amount to borrow" value={amount} min={50_000} max={4_000_000} step={25_000} onChange={setAmount} show={formatINRShort} />
          <Range label="Length of the course" value={years} min={1} max={6} step={1} onChange={setYears} show={(v) => `${v} years`} />
          <Range label="Family income per year" value={income} min={100_000} max={5_000_000} step={50_000} onChange={setIncome} show={formatINRShort} />
          <label className="field">Institution
            <select className="input" value={tier} onChange={(e) => setTier(Number(e.target.value))}>
              {TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <p className="text-xs text-muted">These sliders are only for exploring. Nothing here is saved or shared.</p>
        </form>

        <div className="grid content-start gap-12" aria-live="polite">
          {loan.isLoading && !d ? <Skeleton className="h-72" /> : loan.isError ? <ErrorState error={loan.error} retry={() => loan.refetch()} /> : d && (
            <>
              <div className="grid gap-6 sm:grid-cols-3">
                <Big value={formatINR(d.owed_when_repayment_starts)} label="owed when repayment starts" />
                <Big value={formatINR(d.interest_while_studying)} label="interest added while studying" />
                <Big value={`${(d.assumed_rate * 100).toFixed(1)}%`} label="yearly rate assumed" />
              </div>
              <ul className="grid max-w-measure gap-2 border-l border-scan/60 pl-5 text-sm">
                {d.plain_language.map((l) => <li key={l}>{l}</li>)}
              </ul>

              <Section title="Monthly payment by loan length">
                <ul className="grid gap-3">
                  {d.options.map((o) => (
                    <li key={o.tenor_years} className="grid grid-cols-[4.5rem_minmax(0,1fr)_6.5rem] items-center gap-3 text-sm">
                      <span className="text-muted">{o.tenor_years} years</span>
                      <span className="h-2 rounded-full bg-white/[0.06]"><span className="block h-full rounded-full bg-scan" style={{ width: pct(o.monthly_emi / maxEmi) }} /></span>
                      <span className="text-right tabular-nums">{formatINR(o.monthly_emi)}</span>
                      <span />
                      <span className="col-span-2 -mt-2 text-xs text-muted">{formatINR(o.total_interest)} interest, {formatINR(o.total_repaid)} in total</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Government schemes">
                <ul className="grid gap-4 md:grid-cols-2">
                  {d.schemes.map((s) => (
                    <li key={s.key} className="panel grid content-start gap-2 p-5 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold">{s.name}</h3>
                        <ProvenanceBadge p={s.provenance} />
                      </div>
                      <p className={s.applies ? 'text-scan' : 'text-muted'}>
                        {s.applies === true ? 'Likely applies' : s.applies === false ? "Doesn't apply" : 'Not enough information to tell'}. {s.why}
                      </p>
                      <p className="text-muted">{s.benefit}</p>
                      <p className="text-xs text-muted">How to apply: {s.how_to_apply}</p>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Before you sign">
                <ul className="grid gap-2 text-sm text-muted">{d.cautions.map((c) => <li key={c}>{c}</li>)}</ul>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Big({ value, label }: { value: string; label: string }) {
  return (
    <p className="grid gap-1 border-t border-line pt-3">
      <span className="figure text-2xl">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </p>
  );
}

function Range({ label, value, min, max, step, onChange, show }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; show: (v: number) => string }) {
  return (
    <div className="grid gap-2 text-sm">
      <div className="flex justify-between gap-3"><span className="text-muted">{label}</span><span className="tabular-nums">{show(value)}</span></div>
      <Slider.Root className="relative flex h-6 touch-none select-none items-center" value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} aria-label={label}>
        <Slider.Track className="relative h-1 grow rounded-full bg-white/[0.08]"><Slider.Range className="absolute h-full rounded-full bg-scan" /></Slider.Track>
        <Slider.Thumb className="block h-5 w-5 rounded-full border-2 border-void bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scan" />
      </Slider.Root>
    </div>
  );
}
