import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/api/client';
import { useOutcomes } from '@/api/hooks';
import type { OutcomeIn, OutcomeOut } from '@/api/types';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { RunGate, useActiveRun } from './runContext';

const STATUS: { value: OutcomeIn['status']; label: string; help: string }[] = [
  { value: 'enrolled', label: 'Joined a course', help: 'Started college, a diploma or training' },
  { value: 'waiting', label: 'Still waiting', help: 'For results or admission' },
  { value: 'working', label: 'Started working', help: 'A job or an apprenticeship' },
  { value: 'dropped', label: 'Stopped studying', help: 'Taking a break for now' },
  { value: 'other', label: 'Something else', help: 'Tell us in the notes' },
];
type Tri = 'unsure' | 'yes' | 'no';
const tri = (t: Tri) => (t === 'unsure' ? null : t === 'yes');

export default function Outcomes() {
  const ctx = useActiveRun();
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="What did you decide?"
        intro="Months after the results, tell us what really happened. It's the honest test of PRISM: did the suggestions help? Answers are only counted in anonymous totals."
      />
      <RunGate ctx={ctx}>{ctx.run.data && ctx.studentId && <Body studentId={ctx.studentId} recs={ctx.run.data.recommendations} runId={ctx.run.data.run_id} />}</RunGate>
    </div>
  );
}

function Body({ studentId, recs, runId }: { studentId: string; recs: { career: { id: string; name: string } }[]; runId: string }) {
  const qc = useQueryClient();
  const list = useOutcomes(studentId);
  const [status, setStatus] = useState<OutcomeIn['status']>('enrolled');
  const [admitted, setAdmitted] = useState<Tri>('unsure');
  const [scholarship, setScholarship] = useState<Tri>('unsure');
  const save = useMutation({
    mutationFn: (body: OutcomeIn) => api<OutcomeOut>(`/api/v1/students/${studentId}/outcomes`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outcomes', studentId] }),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save.mutate({
      status,
      run_id: runId,
      chosen_career_id: (f.get('career') as string) || null,
      chosen_pathway_text: (f.get('pathway') as string) || null,
      admitted: tri(admitted),
      scholarship_received: tri(scholarship),
      satisfaction: Number(f.get('satisfaction')) || null,
      notes: (f.get('notes') as string) || null,
    });
  };

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form className="grid content-start gap-10" onSubmit={submit}>
        <fieldset className="grid gap-3">
          <legend className="display mb-4 text-2xl">Where are things now?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {STATUS.map((s) => (
              <label key={s.value} className={`grid min-h-[64px] cursor-pointer content-center gap-0.5 rounded-xl border px-4 py-3 transition-colors ${status === s.value ? 'border-accent bg-accent/10' : 'border-line hover:border-ink/40'}`}>
                <input type="radio" name="status" className="sr-only" checked={status === s.value} onChange={() => setStatus(s.value)} />
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-xs text-muted">{s.help}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="field">Which career?
            <select className="input" name="career" defaultValue="">
              <option value="">Not decided, or not in my list</option>
              {recs.map((r) => <option key={r.career.id} value={r.career.id}>{r.career.name}</option>)}
            </select>
            <span className="text-xs">Your PRISM matches are listed.</span>
          </label>
          <label className="field">Course and college
            <input className="input" name="pathway" placeholder="For example, B.Sc Agriculture at TNAU" />
          </label>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <TriChoice label="Got admission?" value={admitted} set={setAdmitted} />
          <TriChoice label="Got a scholarship?" value={scholarship} set={setScholarship} />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="field">How happy are you with the choice?
            <select className="input" name="satisfaction" defaultValue="">
              <option value="">Prefer not to say</option>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} of 5</option>)}
            </select>
          </label>
          <label className="field">Notes (optional)
            <input className="input" name="notes" />
          </label>
        </div>
        {save.isError && <p role="alert" className="text-sm text-danger">{errorMessage(save.error)}</p>}
        {save.isSuccess && <p role="status" className="text-sm text-accent">Answer saved. Thank you.</p>}
        <button className="btn-primary justify-self-start" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save my answer'}</button>
      </form>

      <aside className="grid content-start gap-5">
        <h2 className="display text-xl">Your answers so far</h2>
        {list.isLoading ? <Skeleton className="h-32" /> : !list.data?.length ? (
          <EmptyState title="Nothing yet" body="Your first answer will appear here." />
        ) : (
          <ul className="grid gap-6">
            {list.data.map((o) => (
              <li key={o.id} className="leaf grid gap-1 text-sm">
                <span className="text-xs text-muted">{formatDate(o.created_at)}</span>
                <span className="display text-xl">{STATUS.find((s) => s.value === o.status)?.label}</span>
                {o.chosen_career_id && <span>{recs.find((r) => r.career.id === o.chosen_career_id)?.career.name ?? 'A career outside your list'}</span>}
                {o.chosen_pathway_text && <span className="text-muted">{o.chosen_pathway_text}</span>}
                {o.followed_recommendation_rank && <span className="text-accent">Match number {o.followed_recommendation_rank} in your results</span>}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

function TriChoice({ label, value, set }: { label: string; value: Tri; set: (t: Tri) => void }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm text-muted">{label}</legend>
      <div className="flex w-fit rounded-full border border-line p-1">
        {(['unsure', 'yes', 'no'] as Tri[]).map((t) => (
          <label key={t} className={`flex min-h-[36px] cursor-pointer items-center rounded-full px-4 text-sm transition-colors ${value === t ? 'bg-ink text-void' : 'text-muted hover:text-ink'}`}>
            <input type="radio" className="sr-only" checked={value === t} onChange={() => set(t)} />
            {t === 'unsure' ? 'Not sure' : t === 'yes' ? 'Yes' : 'No'}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
