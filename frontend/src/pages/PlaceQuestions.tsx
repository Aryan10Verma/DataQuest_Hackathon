// "Where you live": the short local section of the questionnaire. Same core questions for everyone
// elsewhere; these four are about the student's own place, and they change how job demand at home
// and further away counts in the results.
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlaceAnswers, usePlaces, useSavePlace } from '@/api/hooks';
import type { PlaceAnswers } from '@/api/types';
import { useSession } from '@/auth/session';
import { WhereYouLive } from '@/components/map/WhereYouLive';
import { ErrorState, PageHeader, PageSkeleton, Section } from '@/components/ui';
import { errorMessage } from '@/lib/errors';

const MOVES: { value: PlaceAnswers['move_scope']; label: string; help: string }[] = [
  { value: 'home', label: 'Stay in my city', help: 'Study and work close to home' },
  { value: 'state', label: 'Anywhere in my state', help: 'A few hours from home is fine' },
  { value: 'india', label: 'Anywhere in India', help: 'I would move for the right course or job' },
  { value: 'abroad', label: 'Abroad too', help: 'Open to studying or working in another country' },
];
const COMMITMENTS: { value: PlaceAnswers['home_commitment']; label: string; help: string }[] = [
  { value: 'none', label: 'No', help: 'I am free to move' },
  { value: 'some', label: 'Somewhat', help: 'I should be able to visit often' },
  { value: 'strong', label: 'Yes', help: 'A farm, a business or someone to care for' },
];
const COMMON_LANGUAGES = ['English', 'Hindi'];
const LEVELS = [1, 2, 3, 4, 5];

export default function PlaceQuestions() {
  const { user } = useSession();
  const places = usePlaces();
  const saved = usePlaceAnswers();
  const place = places.data?.find((p) => p.region.code === user?.region_code);

  return (
    <div className="mx-auto max-w-[920px]">
      <PageHeader
        title="Where you live"
        intro="Four questions about your own place, about 2 minutes. They decide how much the jobs around you count, compared with jobs further away."
      />
      {places.isLoading || saved.isLoading ? (
        <PageSkeleton />
      ) : places.isError ? (
        <ErrorState error={places.error} retry={() => places.refetch()} />
      ) : !place ? (
        <Section title="First, where do you live?">
          <WhereYouLive cta="Continue" />
        </Section>
      ) : (
        <Questions key={place.region.code} place={place} initial={saved.data ?? null} />
      )}
    </div>
  );
}

function Questions({ place, initial }: { place: NonNullable<ReturnType<typeof usePlaces>['data']>[number]; initial: PlaceAnswers | null }) {
  const save = useSavePlace();
  const navigate = useNavigate();
  const [industries, setIndustries] = useState<Record<string, number>>(initial?.industries ?? {});
  const [move, setMove] = useState<PlaceAnswers['move_scope'] | null>(initial?.move_scope ?? null);
  const [langs, setLangs] = useState<string[]>(initial?.languages ?? []);
  const [home, setHome] = useState<PlaceAnswers['home_commitment'] | null>(initial?.home_commitment ?? null);
  const [tried, setTried] = useState(false);
  useEffect(() => window.scrollTo({ top: 0 }), []);

  const languages = [...new Set([...place.languages, ...COMMON_LANGUAGES])];
  const missing = !move || !home || place.industries.some((i) => !industries[i.key]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (missing) return;
    save.mutate(
      { industries, move_scope: move!, languages: langs, home_commitment: home! },
      { onSuccess: () => navigate('/app/questionnaire') },
    );
  };

  return (
    <form className="grid gap-14" onSubmit={submit} noValidate>
      <p className="lead text-xl">
        {place.region.name}, {place.region.state}.{' '}
        <Link to="/app/profile" className="btn-text inline font-sans text-sm not-italic">Not where you live?</Link>
      </p>

      <fieldset className="grid gap-5">
        <legend className="display mb-2 text-xl">1. How interested are you in the work around {place.region.name}?</legend>
        <p className="-mt-3 text-sm text-muted">1 is not at all, 5 is a lot. Jobs nearby in the fields you like count more in your results.</p>
        <ul className="grid gap-3">
          {place.industries.map((ind) => (
            <li key={ind.key} className="grid gap-2 border-b border-line pb-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <span id={`ind-${ind.key}`} className="text-base">{ind.label}</span>
              <div role="radiogroup" aria-labelledby={`ind-${ind.key}`} className="flex gap-1.5">
                {LEVELS.map((n) => {
                  const on = industries[ind.key] === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={`${n} of 5`}
                      onClick={() => setIndustries((v) => ({ ...v, [ind.key]: n }))}
                      className={`grid h-10 w-10 place-items-center rounded-full border text-sm transition-colors ${on ? 'border-accent bg-claret/30 text-ink' : 'border-line text-muted hover:border-ink/40 hover:text-ink'}`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
        {tried && place.industries.some((i) => !industries[i.key]) && <p className="text-sm text-danger">Rate each one, even if it is a 1.</p>}
      </fieldset>

      <Choice title="2. How far would you move for study or work?" options={MOVES} value={move} onChange={setMove} error={tried && !move} />

      <fieldset className="grid gap-4">
        <legend className="display mb-2 text-xl">3. Which languages could you work in?</legend>
        <p className="-mt-2 text-sm text-muted">Some state jobs and exams need the local language. Choose all that apply.</p>
        <div className="flex flex-wrap gap-2">
          {languages.map((l) => {
            const on = langs.includes(l);
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                onClick={() => setLangs((v) => (on ? v.filter((x) => x !== l) : [...v, l]))}
                className={`min-h-[40px] rounded-full border px-4 text-sm transition-colors ${on ? 'border-accent bg-claret/25 text-ink' : 'border-line text-muted hover:text-ink'}`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Choice title="4. Does your family need you nearby?" options={COMMITMENTS} value={home} onChange={setHome} error={tried && !home} />

      {save.isError && <p role="alert" className="text-sm text-danger">{errorMessage(save.error)}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save my answers'}</button>
        <Link to="/app/questionnaire" className="btn-text">Back to the questionnaire</Link>
      </div>
    </form>
  );
}

function Choice<V extends string>({
  title,
  options,
  value,
  onChange,
  error,
}: {
  title: string;
  options: { value: V; label: string; help: string }[];
  value: V | null;
  onChange: (v: V) => void;
  error: boolean;
}) {
  return (
    <fieldset className="grid gap-4">
      <legend className="display mb-2 text-xl">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.value} className={`grid min-h-[64px] cursor-pointer content-center gap-0.5 rounded-xl border px-4 py-3 transition-colors ${value === o.value ? 'border-accent bg-claret/15' : 'border-line hover:border-ink/40'}`}>
            <input type="radio" className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="text-sm font-medium">{o.label}</span>
            <span className="text-xs text-muted">{o.help}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-danger">Choose one.</p>}
    </fieldset>
  );
}
