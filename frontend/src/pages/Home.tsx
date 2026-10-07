import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useConsents, useDeadlines, useTraits } from '@/api/hooks';
import type { ConsentIn, ConsentOut, ConsentType, FamilyOut, InviteOut } from '@/api/types';
import { useSession, useStudentContext } from '@/auth/session';
import { DateStatusTag, ErrorState, PageHeader, Section, Skeleton } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { errorMessage } from '@/lib/errors';

export default function Home() {
  const { user } = useSession();
  const ctx = useStudentContext();
  const first = user?.full_name.split(' ')[0];
  return (
    <div className="mx-auto grid max-w-[1000px] gap-14">
      <PageHeader title={`Hello, ${first}`} intro={user?.role === 'parent' ? 'Your family’s path, one step at a time.' : 'Your path, one step at a time.'} />
      {user?.consent_status === 'pending' && (
        <p role="status" className="rounded-panel border border-scan/40 p-4 text-sm">
          A parent or guardian needs to approve your account before your answers are used. Ask them to join your family and approve it on their home screen.
        </p>
      )}
      {!user?.family_id ? <FamilySetup /> : <Steps ctx={ctx} />}
      {ctx.studentId && <NextDeadlines studentId={ctx.studentId} />}
      {user?.family_id && ctx.family && <Family family={ctx.family} />}
    </div>
  );
}

function Steps({ ctx }: { ctx: ReturnType<typeof useStudentContext> }) {
  const traits = useTraits(ctx.studentId);
  const isParent = ctx.role === 'parent';
  const answered = traits.data?.instruments_completed.length ?? 0;
  const steps = [
    { title: 'Questionnaire', body: `${answered} of 5 sections done.`, done: answered >= 5, to: isParent ? null : '/app/questionnaire', cta: answered >= 5 ? 'Review' : answered ? 'Continue' : 'Start' },
    { title: 'Family budget', body: ctx.family?.has_finance ? 'Added by a parent.' : 'A parent adds it privately.', done: !!ctx.family?.has_finance, to: isParent ? '/app/family/inputs' : null, cta: ctx.family?.has_finance ? 'Update' : 'Add budget' },
    { title: 'Results', body: ctx.latestRunId ? 'Ready.' : 'After the first two steps.', done: !!ctx.latestRunId, to: '/app/results', cta: 'See results' },
    { title: 'Plan', body: 'Roadmap, deadlines and the family report.', done: false, to: ctx.latestRunId ? '/app/plan' : null, cta: 'Open plan' },
  ];
  return (
    <ol className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.title} className="grid content-between gap-6 bg-void p-5">
          <div className="grid gap-2">
            <span className={`figure grid h-9 w-9 place-items-center rounded-full border text-base ${s.done ? 'border-scan text-scan' : 'border-line text-muted'}`}>
              {s.done ? <Check size={16} aria-label="Done" /> : i + 1}
            </span>
            <h2 className="display text-xl">{s.title}</h2>
            <p className="text-sm text-muted">{s.body}</p>
          </div>
          {s.to && <Link to={s.to} className="btn-text min-h-0 justify-self-start">{s.cta}</Link>}
        </li>
      ))}
    </ol>
  );
}

function NextDeadlines({ studentId }: { studentId: string }) {
  const d = useDeadlines(studentId);
  if (d.isLoading) return <Skeleton className="h-28" />;
  if (d.isError || !d.data?.items.length) return null;
  return (
    <Section title="Coming up" aside={<Link to="/app/plan" className="btn-text min-h-0">All deadlines</Link>}>
      <ul>
        {d.data.items.slice(0, 3).map((i) => (
          <li key={`${i.ref_id}-${i.due}-${i.kind}`} className="grid grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-4 border-b border-line py-3">
            <span className="figure text-2xl">{i.days_left}<span className="block font-sans text-[11px] leading-none text-muted">days</span></span>
            <span className="min-w-0">
              <span className="block truncate">{i.title}</span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted">{formatDate(i.due)} <DateStatusTag status={i.date_status} /></span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function FamilySetup() {
  const qc = useQueryClient();
  const { user, refreshUser } = useSession();
  // Joining or creating a family changes the user's family_id, so re-read the user too.
  const refresh = () => refreshUser().then(() => qc.invalidateQueries());
  const create = useMutation({ mutationFn: () => api<FamilyOut>('/api/v1/families', { method: 'POST' }), onSuccess: refresh });
  const join = useMutation({
    mutationFn: (body: { invite_code: string; relation: string }) => api<FamilyOut>('/api/v1/families/join', { method: 'POST', body }),
    onSuccess: refresh,
  });
  const onJoin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    join.mutate({ invite_code: String(f.get('code')).trim(), relation: String(f.get('relation')) });
  };
  return (
    <Section title="Connect your family">
      <p className="max-w-measure text-muted">PRISM works best when a student and a parent are in the same family. One of you creates it and shares the invite code.</p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="panel grid content-start gap-3 p-5">
          <h3 className="font-semibold">Start a family</h3>
          <p className="text-sm text-muted">You will get a code to share.</p>
          <button className="btn-primary justify-self-start" onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create family'}</button>
          {create.isError && <ErrorState error={create.error} />}
        </div>
        <form className="panel grid content-start gap-3 p-5" onSubmit={onJoin}>
          <h3 className="font-semibold">Join with a code</h3>
          <label className="field">Invite code<input className="input" name="code" required autoComplete="off" /></label>
          <label className="field">
            You are the
            <select className="input" name="relation" defaultValue={user?.role === 'student' ? 'self' : 'mother'}>
              {user?.role === 'student' ? <option value="self">Student</option> : (
                <>
                  <option value="mother">Mother</option>
                  <option value="father">Father</option>
                  <option value="guardian">Guardian</option>
                </>
              )}
            </select>
          </label>
          <button className="btn-quiet justify-self-start" disabled={join.isPending}>{join.isPending ? 'Joining…' : 'Join family'}</button>
          {join.isError && <p role="alert" className="text-sm text-danger">{errorMessage(join.error)}</p>}
        </form>
      </div>
    </Section>
  );
}

const CONSENT_TEXT: Record<ConsentType, string> = {
  minor_data_processing: "Allow PRISM to use {child}'s answers (needed for students under 18)",
  share_raw_answers_with_parent: 'Let my parents see my individual answers',
  share_raw_finance_with_student: 'Show {child} the exact budget figures',
  anonymised_analytics: 'Include us in anonymous counts that improve PRISM',
};

function Family({ family }: { family: FamilyOut }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const consents = useConsents();
  const [invite, setInvite] = useState<InviteOut | null>(null);
  const makeInvite = useMutation({ mutationFn: () => api<InviteOut>('/api/v1/families/invites', { method: 'POST' }), onSuccess: setInvite });
  const consent = useMutation({
    mutationFn: (body: ConsentIn) => api<ConsentOut>('/api/v1/consents', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consents'] }),
  });
  const student = family.members.find((m) => m.role === 'student');
  const child = student?.full_name.split(' ')[0] ?? 'your child';
  const types: { type: ConsentType; subject?: string }[] =
    user?.role === 'parent'
      ? student
        ? [{ type: 'minor_data_processing', subject: student.user_id }, { type: 'share_raw_finance_with_student', subject: student.user_id }]
        : []
      : [{ type: 'share_raw_answers_with_parent', subject: user?.id }];
  const granted = (type: ConsentType, subject?: string) => {
    const rows = (consents.data ?? []).filter((c) => c.consent_type === type && c.subject_user_id === subject && !c.revoked_at);
    rows.sort((a, b) => b.granted_at.localeCompare(a.granted_at));
    return rows[0]?.granted ?? false;
  };

  return (
    <Section title={family.name}>
      <ul className="grid gap-2 text-sm">
        {family.members.map((m) => (
          <li key={m.user_id} className="flex justify-between border-b border-line pb-2">
            <span>{m.full_name}{m.user_id === user?.id ? ' (you)' : ''}</span>
            <span className="text-muted">{m.role === 'student' ? 'Student' : m.relation.charAt(0).toUpperCase() + m.relation.slice(1)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-quiet" onClick={() => makeInvite.mutate()} disabled={makeInvite.isPending}>Invite a family member</button>
        {invite && (
          <p className="text-sm">
            Code <span className="figure ml-1 text-xl tracking-[0.12em] text-scan">{invite.invite_code}</span>
            <span className="ml-2 text-muted">works until {formatDate(invite.expires_at)}</span>
          </p>
        )}
        {makeInvite.isError && <ErrorState error={makeInvite.error} />}
      </div>
      {types.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold">Permissions</legend>
          {types.map(({ type, subject }) => {
            const on = granted(type, subject);
            return (
              <label key={type} className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 border-b border-line text-sm">
                <span>{CONSENT_TEXT[type].replace('{child}', child)}</span>
                <input type="checkbox" className="h-5 w-5 accent-[#8fd0ff]" checked={on} disabled={consent.isPending || !subject}
                  onChange={(e) => subject && consent.mutate({ consent_type: type, subject_user_id: subject, granted: e.target.checked })} />
              </label>
            );
          })}
          {consent.isError && <p role="alert" className="text-sm text-danger">{errorMessage(consent.error)}</p>}
        </fieldset>
      )}
    </Section>
  );
}
