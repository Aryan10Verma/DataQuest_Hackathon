import { Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCreateRun, useInstruments, useTraits } from '@/api/hooks';
import { useSession, useStudentContext } from '@/auth/session';
import { ErrorState, PageHeader, PageSkeleton } from '@/components/ui';
import { loadDraft, ORDER, PLAIN_NAME } from './questionnaireStore';

export default function Questionnaire() {
  const { user } = useSession();
  const ctx = useStudentContext();
  const instruments = useInstruments();
  const traits = useTraits(ctx.studentId);
  const create = useCreateRun();
  const navigate = useNavigate();

  if (instruments.isLoading) return <PageSkeleton />;
  if (instruments.isError) return <ErrorState error={instruments.error} retry={() => instruments.refetch()} />;

  const done = new Set(traits.data?.instruments_completed ?? []);
  const list = [...instruments.data!].sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code));
  const total = list.reduce((s, i) => s + i.est_minutes, 0);
  const allDone = list.every((i) => done.has(i.code));

  return (
    <div className="mx-auto max-w-[920px]">
      <PageHeader
        title="Questionnaire"
        intro={`Five short sections, about ${total} minutes in all. There are no right or wrong answers, except in aptitude. Your answers are saved as you go, so you can stop and come back.`}
      />
      {allDone && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-scan/40 p-5">
          <p className="max-w-measure">All five sections are done. Run the analysis to see careers ranked for you.</p>
          <button
            className="btn-primary"
            disabled={create.isPending || !ctx.studentId}
            onClick={() => create.mutate(ctx.studentId!, { onSuccess: () => navigate('/app/results') })}
          >
            {create.isPending ? 'Running analysis…' : 'Run analysis'}
          </button>
          {create.isError && <ErrorState error={create.error} />}
        </div>
      )}
      <ol className="grid">
        {list.map((ins, i) => {
          const draft = user ? loadDraft(user.id, ins.code) : null;
          const answered = draft ? Object.keys(draft.answers).length : 0;
          const finished = done.has(ins.code);
          const status = finished ? 'Done' : answered ? `${answered} of ${ins.question_count} answered` : 'Not started';
          return (
            <li key={ins.code} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-line py-6 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center">
              <span className={`figure grid h-9 w-9 place-items-center rounded-full border text-base ${finished ? 'border-scan text-scan' : 'border-line text-muted'}`}>
                {finished ? <Check size={16} aria-label="Done" /> : i + 1}
              </span>
              <div className="grid gap-1">
                <h2 className="display text-xl">{PLAIN_NAME[ins.code] ?? ins.name}</h2>
                <p className="max-w-measure text-sm text-muted">{ins.description}</p>
                <p className="text-xs text-muted">
                  {ins.question_count} questions, about {ins.est_minutes} minutes{ins.time_limit_sec ? `, ${Math.round(ins.time_limit_sec / 60)}-minute limit` : ''}. {status}.
                </p>
              </div>
              <Link to={`/app/questionnaire/${ins.code}`} className={`col-start-2 justify-self-start sm:col-start-3 ${finished ? 'btn-quiet' : 'btn-primary'}`}>
                {finished ? 'Retake' : answered ? 'Continue' : 'Start'}
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-xs text-muted">We never ask about gender, caste, religion or community. If you are under 18, a parent approves before your answers are used.</p>
    </div>
  );
}
