import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiBlob } from '@/api/client';
import { useDeadlines, useExams, useRun } from '@/api/hooks';
import type { DateStatus, Exam } from '@/api/types';
import { useStudentContext } from '@/auth/session';
import { DateStatusTag, EmptyState, ErrorState, PageHeader, PageSkeleton, ProvenanceBadge } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { formatDate, humanize } from '@/lib/format';

interface Event {
  key: string;
  date: string; // YYYY-MM-DD
  end?: string | null;
  kind: 'registration' | 'exam' | 'scholarship';
  title: string;
  detail: string;
  status: DateStatus;
  exam?: Exam;
  careers: string[];
}

const KIND: Record<Event['kind'], string> = { registration: 'Registration closes', exam: 'Exam', scholarship: 'Scholarship deadline' };
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthKey = (iso: string) => iso.slice(0, 7);

export default function Exams() {
  const ctx = useStudentContext();
  const exams = useExams();
  const deadlines = useDeadlines(ctx.studentId);
  const run = useRun(ctx.latestRunId);
  const [view, setView] = useState<'month' | 'list'>('month');
  const [upcoming, setUpcoming] = useState(true);
  const [mine, setMine] = useState(false);

  // "Today" comes from the server when it is known, so a frozen demo date stays consistent.
  const today = deadlines.data?.as_of?.slice(0, 10) ?? ymd(new Date());
  const careerNames = useMemo(() => new Map(run.data?.recommendations.map((r) => [r.career.id, r.career.name]) ?? []), [run.data]);

  const events = useMemo<Event[]>(() => {
    const out: Event[] = [];
    for (const e of exams.data ?? []) {
      const careers = (e.career_ids ?? []).map((id) => careerNames.get(id)).filter((n): n is string => !!n);
      for (const s of e.sessions ?? []) {
        const label = (e.sessions?.length ?? 0) > 1 ? `${e.name} (session ${s.session_no})` : e.name;
        if (s.registration_close)
          out.push({ key: `${e.code}-${s.cycle_year}-${s.session_no}-r`, date: s.registration_close, kind: 'registration', title: label, detail: `${e.conducting_body}, ${humanize(e.level).toLowerCase()}`, status: s.registration_status, exam: e, careers });
        if (s.exam_start)
          out.push({ key: `${e.code}-${s.cycle_year}-${s.session_no}-e`, date: s.exam_start, end: s.exam_end, kind: 'exam', title: label, detail: `${e.conducting_body}, ${humanize(e.level).toLowerCase()}`, status: s.exam_date_status, exam: e, careers });
      }
    }
    for (const d of deadlines.data?.items ?? []) {
      if (d.kind === 'scholarship')
        out.push({ key: `${d.ref_id}-s`, date: d.due.slice(0, 10), kind: 'scholarship', title: d.title.replace(/^Scholarship deadline: /, ''), detail: d.source_name, status: d.date_status, careers: d.for_careers });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [exams.data, deadlines.data, careerNames]);

  const shown = events.filter((e) => (!upcoming || (e.end ?? e.date) >= today) && (!mine || e.careers.length > 0));
  const next = shown.filter((e) => e.date >= today).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Exam calendar"
        intro="Entrance exams, when registration closes, and your scholarship deadlines. Dates marked Estimated are projected from earlier years; always confirm on the official website."
      />
      {exams.isLoading ? <PageSkeleton /> : exams.isError ? <ErrorState error={exams.error} retry={() => exams.refetch()} /> : (
        <div className="grid gap-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div role="radiogroup" aria-label="View" className="flex rounded-full border border-line p-1">
              {(['month', 'list'] as const).map((v) => (
                <button key={v} role="radio" aria-checked={view === v} onClick={() => setView(v)}
                  className={`min-h-[36px] rounded-full px-5 text-sm transition-colors ${view === v ? 'bg-ink text-void' : 'text-muted hover:text-ink'}`}>
                  {v === 'month' ? 'Month' : 'List'}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <Toggle label="Upcoming only" on={upcoming} set={setUpcoming} />
              {careerNames.size > 0 && <Toggle label="Only for my matches" on={mine} set={setMine} />}
              {ctx.studentId && <IcsButton studentId={ctx.studentId} />}
            </div>
          </div>
          {view === 'month' ? (
            <Month events={shown} today={today} next={next} />
          ) : shown.length === 0 ? (
            <EmptyState title="Nothing to show" body="Turn off a filter to see more dates." />
          ) : (
            <List events={shown} today={today} />
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)}
        className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

function IcsButton({ studentId }: { studentId: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="grid">
      <button className="btn-text min-h-[44px]" onClick={async () => {
        setError(null);
        try {
          const url = URL.createObjectURL(await apiBlob(`/api/v1/students/${studentId}/deadlines.ics`));
          Object.assign(document.createElement('a'), { href: url, download: 'prism-deadlines.ics' }).click();
          setTimeout(() => URL.revokeObjectURL(url), 10_000);
        } catch (e) {
          setError(errorMessage(e));
        }
      }}>
        <CalendarPlus size={15} aria-hidden /> Add to my calendar
      </button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </span>
  );
}

function Month({ events, today, next }: { events: Event[]; today: string; next: Event[] }) {
  const [cursor, setCursor] = useState(() => monthKey(today));
  const [selected, setSelected] = useState(today);
  const [y, m] = cursor.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday first
  const byDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return map;
  }, [events]);
  const inMonth = events.filter((e) => monthKey(e.date) === cursor).length;
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setCursor(ymd(d).slice(0, 7));
  };
  const dayEvents = byDay.get(selected) ?? [];
  const nextAfter = events.find((e) => e.date > selected);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-label="Month" className="grid content-start gap-6">
        <div className="flex items-center justify-between">
          <button className="grid h-11 w-11 place-items-center rounded-full border border-line text-muted hover:border-accent hover:text-ink" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <div className="text-center">
            <h2 className="display text-3xl">{first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
            <p className="text-xs text-muted">{inMonth} {inMonth === 1 ? 'date' : 'dates'} this month</p>
          </div>
          <button className="grid h-11 w-11 place-items-center rounded-full border border-line text-muted hover:border-accent hover:text-ink" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
        <div role="grid" aria-label="Days" className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => <div key={d} role="columnheader" className="pb-2 text-center text-xs text-muted">{d}</div>)}
          {Array.from({ length: lead }, (_, i) => <div key={`lead-${i}`} />)}
          {Array.from({ length: days }, (_, i) => {
            const date = `${cursor}-${String(i + 1).padStart(2, '0')}`;
            const evs = byDay.get(date) ?? [];
            const isToday = date === today;
            const isSel = date === selected;
            return (
              <button key={date} role="gridcell" aria-selected={isSel} onClick={() => setSelected(date)}
                aria-label={`${formatDate(date)}${evs.length ? `, ${evs.length} ${evs.length === 1 ? 'date' : 'dates'}` : ''}`}
                className={`relative grid aspect-square min-h-[44px] place-items-center rounded-xl text-sm transition-colors ${isSel ? 'bg-accent/15 text-ink ring-1 ring-accent' : 'hover:bg-white/[0.04]'} ${isToday && !isSel ? 'text-accent' : ''}`}>
                <span className={evs.length ? 'figure text-lg' : 'text-muted'}>{i + 1}</span>
                {evs.length > 0 && (
                  <span className="absolute bottom-1.5 flex gap-1" aria-hidden>
                    {evs.slice(0, 3).map((e) => <span key={e.key} className={`h-1 w-1 rounded-full ${e.kind === 'exam' ? 'bg-ink' : 'bg-accent'}`} />)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="flex gap-5 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Registration or scholarship deadline</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-ink" />Exam</span>
        </p>
      </section>

      <aside className="grid content-start gap-10">
        <section className="grid gap-4" aria-live="polite">
          <h2 className="display text-2xl">{formatDate(selected)}</h2>
          {dayEvents.length ? (
            <ul className="grid gap-6">{dayEvents.map((e) => <EventItem key={e.key} e={e} today={today} />)}</ul>
          ) : (
            <div className="note grid gap-2 text-sm">
              <p>Nothing due on this day.</p>
              {nextAfter && (
                <button className="btn-text min-h-0 justify-self-start" onClick={() => { setCursor(monthKey(nextAfter.date)); setSelected(nextAfter.date); }}>
                  Next date: {formatDate(nextAfter.date)}
                </button>
              )}
            </div>
          )}
        </section>
        {next.length > 0 && (
          <section className="grid gap-4">
            <h2 className="display text-2xl">Coming up next</h2>
            <ul className="grid gap-6">{next.map((e) => <EventItem key={e.key} e={e} today={today} />)}</ul>
          </section>
        )}
      </aside>
    </div>
  );
}

function List({ events, today }: { events: Event[]; today: string }) {
  const groups = new Map<string, Event[]>();
  for (const e of events) groups.set(monthKey(e.date), [...(groups.get(monthKey(e.date)) ?? []), e]);
  return (
    <div className="grid gap-14">
      {[...groups].map(([key, list]) => (
        <section key={key} className="grid gap-6">
          <h2 className="display border-b border-line pb-3 text-3xl">{new Date(`${key}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
          <ul className="grid gap-8 md:grid-cols-2">{list.map((e) => <EventItem key={e.key} e={e} today={today} />)}</ul>
        </section>
      ))}
    </div>
  );
}

function EventItem({ e, today }: { e: Event; today: string }) {
  const days = Math.round((new Date(`${e.date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000);
  const when = days === 0 ? 'today' : days > 0 ? `in ${days} days` : `${-days} days ago`;
  return (
    <li className="grid gap-1.5 border-l border-accent/70 pl-4">
      <p className="flex items-center justify-between gap-3 text-xs">
        <span className={e.kind === 'exam' ? 'text-ink' : 'text-accent'}>{KIND[e.kind]}</span>
        {e.exam && <ProvenanceBadge p={e.exam.provenance} compact />}
      </p>
      <p className="display text-xl leading-tight">
        {e.exam?.official_url ? <a href={e.exam.official_url} target="_blank" rel="noreferrer" className="hover:text-accent">{e.title}</a> : e.title}
      </p>
      <p className="text-xs text-muted">{e.detail}</p>
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span>{formatDate(e.date)}{e.end && e.end !== e.date ? ` to ${formatDate(e.end)}` : ''}</span>
        <span className="text-muted">{when}</span>
        <DateStatusTag status={e.status} />
      </p>
      {e.careers.length > 0 && <p className="text-xs text-muted">For {e.careers.slice(0, 3).join(', ')}</p>}
    </li>
  );
}
