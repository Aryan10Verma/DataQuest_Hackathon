import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, BellRing, Briefcase, CalendarPlus, FileText, GraduationCap, PenLine, Sparkles, Wallet, Wrench, X, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, apiBlob } from '@/api/client';
import { useDeadlines, useRoadmap, useSwot, type Lang } from '@/api/hooks';
import type { AffordabilityClass, AnalysisRun, MilestoneType, ReminderChannel, ReminderPlan, Roadmap, SwotItem } from '@/api/types';
import { useSession } from '@/auth/session';
import { DateStatusTag, ErrorState, FundingMeter, PageHeader, Section, Skeleton } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatINRShort } from '@/lib/format';
import { RunGate, useActiveRun, useOpenReport } from './runContext';

const ICON: Record<MilestoneType, LucideIcon> = {
  academic: GraduationCap, exam: PenLine, application: FileText, scholarship: Award,
  skill: Sparkles, project: Wrench, finance: Wallet, career: Briefcase,
};

export default function Plan() {
  const ctx = useActiveRun();
  return (
    <div className="mx-auto max-w-[1200px]">
      <RunGate ctx={ctx}>{ctx.run.data && ctx.studentId && <PlanView run={ctx.run.data} studentId={ctx.studentId} />}</RunGate>
    </div>
  );
}

function PlanView({ run, studentId }: { run: AnalysisRun; studentId: string }) {
  const [params, setParams] = useSearchParams();
  const careerId = params.get('career') ?? run.recommendations[0]?.career.id;
  const roadmap = useRoadmap(run.run_id, careerId);
  return (
    <div className="grid gap-16">
      <PageHeader
        title={roadmap.data ? `Plan: ${roadmap.data.career.name}` : 'Plan'}
        intro="Five years from now to the first job: exams, applications, scholarships and skills, with real dates where they are announced."
        actions={
          <label className="field min-w-[240px]">
            <span className="sr-only">Career to plan</span>
            <select className="input" value={careerId} onChange={(e) => setParams({ career: e.target.value })}>
              {run.recommendations.map((r) => <option key={r.career.id} value={r.career.id}>{r.rank}. {r.career.name}</option>)}
            </select>
          </label>
        }
      />
      {roadmap.isLoading ? <Skeleton className="h-72" /> : roadmap.isError ? <ErrorState error={roadmap.error} retry={() => roadmap.refetch()} /> : roadmap.data && <Timeline r={roadmap.data} />}
      <div className="grid gap-16 lg:grid-cols-2">
        <Deadlines studentId={studentId} />
        <Swot runId={run.run_id} careerId={careerId} />
      </div>
      {roadmap.data && <Extras r={roadmap.data} />}
      <div className="grid gap-16 lg:grid-cols-2">
        <Report runId={run.run_id} />
        <Section title="What did you decide?">
          <p className="text-sm text-muted">Later on, tell us what happened: the course you joined, and whether PRISM helped. It is counted only anonymously.</p>
          <Link to="/app/outcomes" className="btn-quiet justify-self-start">Tell us what you chose</Link>
        </Section>
      </div>
    </div>
  );
}

function Timeline({ r }: { r: Roadmap }) {
  return (
    <section aria-label="Five-year roadmap" className="grid gap-4">
      {/* On a phone the years run down the page along a line on the left; from tablets up, across it. */}
      <div className="pb-2 md:-mx-4 md:overflow-x-auto md:px-4">
        <ol className="ml-1 grid gap-10 border-l border-line pl-6 md:ml-0 md:min-w-[1000px] md:grid-cols-5 md:gap-px md:border-l-0 md:pl-0">
          {r.phases.map((p) => (
            <li key={p.year_index} className="grid content-start gap-4">
              <div className="relative md:border-t md:border-line md:pt-4">
                <span className="absolute -left-[29px] top-2.5 h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_var(--glow)] md:-top-[5px] md:left-0" aria-hidden />
                <p className="figure text-2xl">Year {p.year_index}</p>
                <p className="pr-4 text-xs text-muted">{p.label.replace(/^Year \d+ - /, '')}</p>
                <p className="text-xs text-muted/70">{formatDate(p.start, { month: 'short', year: 'numeric' })} to {formatDate(p.end, { month: 'short', year: 'numeric' })}</p>
              </div>
              <ul className="grid gap-3 pr-4">
                {p.milestones.map((m, i) => {
                  const Icon = ICON[m.type] ?? Sparkles;
                  return (
                    <li key={i} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2 text-sm">
                      <Icon size={15} className="mt-0.5 text-accent" aria-label={m.type} />
                      <span className="grid gap-0.5">
                        <span>{m.title}</span>
                        {m.detail && <span className="text-xs text-muted">{m.detail}</span>}
                        {m.due && (
                          <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                            {formatDate(m.due)} {m.date_is_estimate && <DateStatusTag status="estimated" />}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Extras({ r }: { r: Roadmap }) {
  return (
    <div className="grid gap-16 lg:grid-cols-3">
      <Section title="Where to study">
        <ul>
          {r.ranked_pathways.map((p) => (
            <li key={p.pathway_id} className="grid gap-1 border-b border-line py-3 text-sm">
              <span className="font-semibold">{p.rank}. {p.name}</span>
              <span className="text-xs text-muted">{p.institution_name}</span>
              <span className="flex items-center gap-3 text-xs text-muted"><FundingMeter value={p.affordability_class as AffordabilityClass} /> {formatINRShort(p.total_cost)}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Skills to build">
        <ul className="grid gap-3 text-sm">
          {r.skill_actions.map((s) => (
            <li key={s.dimension_or_skill} className="grid gap-0.5">
              <span>{s.action}</span>
              <span className="text-xs text-muted">
                {s.weeks} weeks{s.resource_url ? <>, <a className="text-accent hover:underline" href={s.resource_url} target="_blank" rel="noreferrer">{s.resource_name}</a></> : ''}
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="If plans change">
        <p className="text-sm text-muted">Careers close to this one, if the first route doesn't work out:</p>
        <ul className="grid gap-1 text-sm">
          {r.plan_b.map((c) => <li key={c.id}>{c.name}</li>)}
        </ul>
        <Link to="/app/loans" className="btn-text min-h-0">Understand education loans</Link>
      </Section>
    </div>
  );
}

function Deadlines({ studentId }: { studentId: string }) {
  const d = useDeadlines(studentId);
  const [calError, setCalError] = useState<string | null>(null);
  const downloadIcs = async () => {
    setCalError(null);
    try {
      const blob = await apiBlob(`/api/v1/students/${studentId}/deadlines.ics`);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: 'prism-deadlines.ics' });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setCalError(errorMessage(e));
    }
  };
  return (
    <Section title="Deadlines" aside={
      <span className="flex flex-wrap gap-x-6 gap-y-1">
        <button className="btn-text min-h-0" onClick={downloadIcs}><CalendarPlus size={14} aria-hidden /> Add to calendar</button>
        <RemindDialog studentId={studentId} />
      </span>
    }>
      {calError && <p role="alert" className="text-sm text-danger">{calError}</p>}
      {d.isLoading ? <Skeleton className="h-40" /> : d.isError ? <ErrorState error={d.error} retry={() => d.refetch()} /> : (
        <>
          {d.data!.items.length === 0 && <p className="text-sm text-muted">No deadlines in the next year for the current matches.</p>}
          <ul>
            {d.data!.items.slice(0, 10).map((i) => (
              <li key={`${i.ref_id}-${i.kind}-${i.due}`} className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-4 border-b border-line py-3">
                <span className={`figure text-2xl ${i.days_left <= 30 ? 'text-accent' : ''}`}>{i.days_left}<span className="block font-sans text-[11px] leading-none text-muted">days</span></span>
                <span className="grid gap-1">
                  <span className="text-sm">
                    {i.official_url ? <a href={i.official_url} target="_blank" rel="noreferrer" className="hover:text-accent">{i.title}</a> : i.title}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    {formatDate(i.due)} <DateStatusTag status={i.date_status} />
                    {i.for_careers.length > 0 && <span>For {i.for_careers.slice(0, 2).join(', ')}</span>}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{d.data!.notice}</p>
        </>
      )}
    </Section>
  );
}

function RemindDialog({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (body: { channel: ReminderChannel; phone: string | null; lead_days: number[]; horizon_days: number }) =>
      api<ReminderPlan>(`/api/v1/students/${studentId}/reminders`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get('phone')).replace(/\s/g, '');
    create.mutate({ channel: f.get('channel') as ReminderChannel, phone: phone ? (phone.startsWith('+') ? phone : `+91${phone}`) : null, lead_days: [Number(f.get('lead'))], horizon_days: 365 });
  };
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) create.reset(); }}>
      <Dialog.Trigger className="btn-text min-h-0"><BellRing size={14} aria-hidden /> Remind me</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-50 grid w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-panel border border-line bg-deep p-6">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="display text-xl">Deadline reminders</Dialog.Title>
            <Dialog.Close className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink" aria-label="Close"><X size={18} /></Dialog.Close>
          </div>
          {create.isSuccess ? (
            <div className="grid gap-3 text-sm">
              <p>{create.data.created} reminders set{create.data.already_scheduled ? `, ${create.data.already_scheduled} were already set` : ''}.</p>
              <p className="text-muted">{create.data.notice}</p>
              <Dialog.Close className="btn-quiet justify-self-start">Done</Dialog.Close>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={submit}>
              <label className="field">Send by
                <select className="input" name="channel" defaultValue="whatsapp">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
              </label>
              <label className="field">Mobile number
                <input className="input" name="phone" inputMode="tel" placeholder="+91 98765 43210" required />
                <span className="text-xs">Only you see this number.</span>
              </label>
              <label className="field">Remind me
                <select className="input" name="lead" defaultValue="7">
                  <option value="3">3 days before</option>
                  <option value="7">A week before</option>
                  <option value="14">Two weeks before</option>
                </select>
              </label>
              {create.isError && <p role="alert" className="text-sm text-danger">{errorMessage(create.error)}</p>}
              <button className="btn-primary justify-self-start" disabled={create.isPending}>{create.isPending ? 'Setting…' : 'Set reminders'}</button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Swot({ runId, careerId }: { runId: string; careerId?: string }) {
  const s = useSwot(runId, careerId);
  const cell = (title: string, items: SwotItem[]) => (
    <div className="grid content-start gap-2 bg-void p-4">
      <h3 className="display text-xl">{title}</h3>
      <ul className="grid gap-2 text-sm">
        {items.length ? items.map((i) => (
          <li key={i.title}><span>{i.title}</span><span className="block text-xs text-muted">{i.detail}</span></li>
        )) : <li className="text-muted">None found.</li>}
      </ul>
    </div>
  );
  return (
    <Section title="Strengths, weaknesses, opportunities, threats">
      {s.isLoading ? <Skeleton className="h-64" /> : s.isError ? <ErrorState error={s.error} retry={() => s.refetch()} /> : (
        <>
          <p className="text-sm text-muted">{s.data!.headline}</p>
          <div className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2">
            {cell('Strengths', s.data!.strengths)}
            {cell('Weaknesses', s.data!.weaknesses)}
            {cell('Opportunities', s.data!.opportunities)}
            {cell('Threats', s.data!.threats)}
          </div>
        </>
      )}
    </Section>
  );
}

function Report({ runId }: { runId: string }) {
  const { lang } = useSession();
  const [choice, setChoice] = useState<Lang>(lang);
  const open = useOpenReport();
  const [error, setError] = useState<string | null>(null);
  return (
    <Section title="Family report">
      <p className="text-sm text-muted">One printable page with the top matches, costs, the family conversation and the next deadlines. Good for a meeting with a teacher.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="field">Language
          <select className="input" value={choice} onChange={(e) => setChoice(e.target.value as Lang)}>
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
            <option value="hi">हिन्दी</option>
          </select>
        </label>
        <button className="btn-primary" onClick={() => { setError(null); open(runId, choice).catch((e) => setError(errorMessage(e))); }}>
          Download report
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </Section>
  );
}
