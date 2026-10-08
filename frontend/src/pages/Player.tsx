import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/api/client';
import { useInstruments, useQuestions } from '@/api/hooks';
import type { SubmitResult } from '@/api/types';
import { useSession } from '@/auth/session';
import { ErrorState, PageSkeleton } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { clearDraft, flagMessage, loadDraft, newDraft, ORDER, PLAIN_NAME, saveDraft, type Draft } from './questionnaireStore';

export default function Player() {
  const { code = '' } = useParams();
  const { user } = useSession();
  const instruments = useInstruments();
  const questions = useQuestions(code);
  const instrument = instruments.data?.find((i) => i.code === code);

  if (questions.isLoading || instruments.isLoading) return <div className="p-10"><PageSkeleton /></div>;
  if (questions.isError) return <div className="p-10"><ErrorState error={questions.error} retry={() => questions.refetch()} /></div>;
  if (!user || !questions.data?.length) return null;
  return (
    <Run
      key={code}
      userId={user.id}
      code={code}
      title={PLAIN_NAME[code] ?? instrument?.name ?? 'Questionnaire'}
      limitSec={instrument?.time_limit_sec ?? null}
      questions={questions.data}
    />
  );
}

type Q = NonNullable<ReturnType<typeof useQuestions>['data']>[number];

function Run({ userId, code, title, limitSec, questions }: { userId: string; code: string; title: string; limitSec: number | null; questions: Q[] }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState<Draft>(() => loadDraft(userId, code) ?? newDraft());
  const [review, setReview] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const shownAt = useRef(performance.now());
  const sorted = useMemo(() => [...questions].sort((a, b) => a.order - b.order), [questions]);
  const index = Math.min(draft.index, sorted.length - 1);
  const q = sorted[index];
  const answeredCount = Object.keys(draft.answers).length;

  useEffect(() => saveDraft(userId, code, draft), [userId, code, draft]);
  useEffect(() => {
    shownAt.current = performance.now();
  }, [index]);

  // Timed sections count down from when the section was first opened.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!limitSec || result) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [limitSec, result]);
  const remaining = limitSec ? Math.max(0, limitSec - Math.floor((now - draft.startedAt) / 1000)) : null;
  useEffect(() => {
    if (remaining === 0 && !review && !result) setReview(true);
  }, [remaining, review, result]);

  const choose = useCallback(
    (value: string) => {
      const response_ms = Math.round(performance.now() - shownAt.current);
      setDraft((d) => ({ ...d, answers: { ...d.answers, [q.id]: { value, response_ms } } }));
      // Move on after a beat, so the choice is seen to register.
      window.setTimeout(() => {
        setDraft((d) => (d.index < sorted.length - 1 ? { ...d, index: d.index + 1 } : d));
        if (index === sorted.length - 1) setReview(true);
      }, reduce ? 0 : 260);
    },
    [q, sorted.length, index, reduce],
  );

  // Number keys (1-5) or letters (a-d) answer the current question.
  useEffect(() => {
    if (review || result) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).tagName === 'INPUT') return;
      const opt = q.options.find((o) => o.key.toLowerCase() === e.key.toLowerCase());
      if (opt) choose(opt.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, choose, review, result]);

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api<SubmitResult>(`/api/v1/assessments/${code}/submit`, {
        method: 'POST',
        body: {
          client_submission_id: draft.submissionId,
          answers: Object.entries(draft.answers).map(([question_id, a]) => ({ question_id, value: a.value, response_ms: a.response_ms })),
        },
      });
      clearDraft(userId, code);
      setResult(res);
      qc.invalidateQueries({ queryKey: ['traits'] });
    } catch (e) {
      setSubmitError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  const next = ORDER[ORDER.indexOf(code) + 1];
  const progress = result ? 1 : answeredCount / sorted.length;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="h-px bg-white/[0.06]" role="progressbar" aria-label="Progress" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="h-full bg-accent shadow-[0_0_10px_var(--glow)]" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.4 }} />
      </div>
      <header className="flex items-center gap-4 px-4 py-4 sm:px-8">
        <span className="text-sm text-muted">{title}</span>
        {remaining !== null && !result && (
          <span className={`rounded-full border px-3 py-1 text-xs tabular-nums ${remaining < 120 ? 'border-danger/60 text-danger' : 'border-line text-muted'}`} aria-live="off">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')} left
          </span>
        )}
        <Link to="/app/questionnaire" className="btn-quiet ml-auto min-h-[40px]">
          <X size={15} aria-hidden /> {result ? 'Close' : 'Save and exit'}
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-[860px] flex-1 content-center px-4 pb-16 sm:px-8">
        {result ? (
          <Complete result={result} next={next} onNext={() => navigate(next ? `/app/questionnaire/${next}` : '/app/questionnaire')} />
        ) : review ? (
          <div className="grid gap-6">
            <h1 className="display text-xl sm:text-2xl">{remaining === 0 ? 'Time is up' : 'Ready to submit?'}</h1>
            <p className="text-muted">
              You answered {answeredCount} of {sorted.length} questions.
              {answeredCount < sorted.length && remaining !== 0 ? ' You can go back to the ones you skipped, or submit now.' : ''}
            </p>
            {submitError && <p role="alert" className="text-sm text-danger">{submitError}</p>}
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={submit} disabled={submitting || answeredCount === 0}>{submitting ? 'Submitting…' : 'Submit answers'}</button>
              {remaining !== 0 && (
                <button className="btn-quiet" onClick={() => { setReview(false); setDraft((d) => ({ ...d, index: sorted.findIndex((s) => !d.answers[s.id]) >= 0 ? sorted.findIndex((s) => !d.answers[s.id]) : d.index })); }}>
                  Review answers
                </button>
              )}
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.section
              key={q.id}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="grid gap-8"
              aria-labelledby="prompt"
            >
              <p className="text-sm text-muted">Question {index + 1} of {sorted.length}</p>
              <h1 id="prompt" className="text-xl font-medium leading-snug sm:text-2xl">
                {q.type === 'likert5' && code === 'riasec_v1' ? <span className="mb-2 block text-base text-muted">How much would you enjoy this?</span> : null}
                {q.prompt}
              </h1>
              <Options q={q} value={draft.answers[q.id]?.value} onChoose={choose} />
              <div className="flex items-center justify-between">
                <button className="btn-text min-h-[44px] text-muted disabled:opacity-40" disabled={index === 0}
                  onClick={() => setDraft((d) => ({ ...d, index: Math.max(0, d.index - 1) }))}>
                  <ArrowLeft size={15} aria-hidden /> Back
                </button>
                <button className="btn-text min-h-[44px]" onClick={() => (index < sorted.length - 1 ? setDraft((d) => ({ ...d, index: d.index + 1 })) : setReview(true))}>
                  {draft.answers[q.id] ? 'Next' : 'Skip'}
                </button>
              </div>
            </motion.section>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

function Options({ q, value, onChoose }: { q: Q; value?: string; onChoose: (v: string) => void }) {
  const likert = q.type === 'likert5';
  return (
    <div role="radiogroup" aria-labelledby="prompt" className={likert ? 'grid gap-2 sm:grid-cols-5' : 'grid gap-2'}>
      {q.options.map((o) => {
        const on = value === o.key;
        return (
          <button key={o.key} role="radio" aria-checked={on} onClick={() => onChoose(o.key)}
            className={`flex min-h-[56px] items-center gap-3 rounded-panel border px-4 text-left transition-colors ${on ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/60'} ${likert ? 'sm:min-h-[96px] sm:flex-col sm:justify-center sm:text-center' : ''}`}>
            <span className={`figure grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm ${on ? 'border-accent text-accent' : 'border-line text-muted'}`} aria-hidden>
              {o.key.toUpperCase()}
            </span>
            <span className="text-sm">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Complete({ result, next, onNext }: { result: SubmitResult; next?: string; onNext: () => void }) {
  return (
    <div className="grid justify-items-start gap-6">
      <h1 className="display text-2xl">{PLAIN_NAME[result.instrument_code] ?? 'Section'} complete</h1>
      <p className="text-muted">{result.answered} of {result.total_items} questions answered and saved.</p>
      {(result.flags ?? []).length > 0 && (
        <ul className="grid max-w-measure gap-2 border-l border-line pl-4 text-sm text-muted">
          {[...new Set((result.flags ?? []).map(flagMessage))].map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={onNext}>{next ? `Next: ${PLAIN_NAME[next]}` : 'Back to the questionnaire'}</button>
        {next && <Link to="/app/questionnaire" className="btn-quiet">Take a break</Link>}
      </div>
    </div>
  );
}
