// Developer and judging tools. Compiled in only when VITE_DEV_TOOLS=true (see App.tsx);
// nothing else in the app imports from this folder.
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Wrench, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError, config, getLastMeta, type Role } from '@/api/client';
import type { DemoPersona, DemoWalkthrough } from '@/api/types';
import { useSession } from '@/auth/session';

const PRESENTER_KEY = 'prism.presenter';

export default function DevTools() {
  const [open, setOpen] = useState(false);
  const presenter = usePresenterStep();
  return (
    <>
      {presenter.step !== null && <PresenterRail {...presenter} />}
      <div className="fixed bottom-[72px] right-4 z-[60] lg:bottom-4">
        {open ? <Panel onClose={() => setOpen(false)} /> : (
          <button className="flex h-11 items-center gap-2 rounded-full border border-line bg-deep px-4 text-xs text-muted hover:text-ink" onClick={() => setOpen(true)}>
            <Wrench size={14} aria-hidden /> Dev
          </button>
        )}
      </div>
    </>
  );
}

function Panel({ onClose }: { onClose: () => void }) {
  const { user, switchRole } = useSession();
  const navigate = useNavigate();
  const personas = useQuery({
    queryKey: ['dev-personas'],
    queryFn: () => api<DemoPersona[]>('/api/v1/demo/personas', { anonymous: true }),
    retry: false,
  });
  const meta = getLastMeta();
  const source = config.dataMode === 'fixtures' ? 'fixtures' : meta?.mock ? 'mock' : 'live';
  const demoOff = personas.error instanceof ApiError && personas.error.status === 404;

  const fill = (email: string, password: string) => {
    onClose();
    navigate('/signin', { state: { email, password } });
  };

  return (
    <div className="grid w-[320px] max-w-[calc(100vw-32px)] gap-4 rounded-panel border border-line bg-deep p-4 text-sm shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Developer tools</p>
        <button className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-ink" onClick={onClose} aria-label="Close developer tools"><X size={16} /></button>
      </div>
      <p className="text-xs text-muted">
        Data source: <span className="rounded-full border border-line px-2 py-0.5 text-ink">{source}</span> Auth: {config.authMode}
      </p>
      {config.authMode === 'mock' && (
        <label className="field">View as
          <select className="input" value={user?.role ?? 'student'} onChange={(e) => switchRole(e.target.value as Role)}>
            {(['student', 'parent', 'educator', 'admin'] as Role[]).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      )}
      {!demoOff && (
        <div className="grid gap-2">
          <p className="text-xs text-muted">Sign in as a demo family</p>
          {personas.isLoading && <p className="text-xs text-muted">Loading…</p>}
          <ul className="grid max-h-[260px] gap-2 overflow-y-auto">
            {personas.data?.map((p) => (
              <li key={p.key} className="rounded-lg border border-line p-2.5">
                <p className="font-semibold">{p.student_name}, {p.location}</p>
                <p className="text-xs text-muted">{p.scenario}</p>
                <div className="mt-1.5 flex gap-3 text-xs">
                  <button className="text-scan hover:underline" onClick={() => fill(p.student_email, p.demo_password)}>Student</button>
                  <button className="text-scan hover:underline" onClick={() => fill(p.parent_email, p.demo_password)}>Parent</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-3 text-xs">
            <button className="text-scan hover:underline" onClick={() => fill('counsellor@prism.example', 'Prism@Demo2026')}>Counsellor</button>
            <button className="text-scan hover:underline" onClick={() => fill('admin@prism.example', 'Prism@Demo2026')}>Admin</button>
          </div>
        </div>
      )}
      <Link to="/presenter" className="btn-quiet min-h-[40px]" onClick={onClose}>Presenter mode</Link>
    </div>
  );
}

/* ---------- presenter mode ---------- */

/** Which screen shows each scripted demo step. */
function routeFor(path: string, method: string): string {
  if (path.includes('/system/methodology') || path.includes('/system/data-status') || path.includes('/system/fairness')) return '/app/trust';
  if (path.includes('/traits')) return '/app/profile';
  if (path.includes('/finance') || path.includes('/preferences')) return '/app/family/inputs';
  if (path.includes('/conflict')) return '/app/family';
  if (path.includes('/what-if')) return '/app/what-if';
  if (path.includes('/roadmap') || path.includes('/deadlines')) return '/app/plan';
  if (path.includes('/local-opportunities')) return '/app/explore';
  if (path.includes('/analysis/runs') && method === 'POST') return '/app/results';
  return '/app/results';
}

function readStep(): number | null {
  try {
    const v = sessionStorage.getItem(PRESENTER_KEY);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

function usePresenterStep() {
  const [step, setStepState] = useState<number | null>(readStep);
  const setStep = (s: number | null) => {
    try {
      if (s === null) sessionStorage.removeItem(PRESENTER_KEY);
      else sessionStorage.setItem(PRESENTER_KEY, String(s));
    } catch {
      /* ignore */
    }
    setStepState(s);
  };
  useEffect(() => {
    const sync = () => setStepState(readStep());
    window.addEventListener('prism:presenter', sync);
    return () => window.removeEventListener('prism:presenter', sync);
  }, []);
  return { step, setStep };
}

function PresenterRail({ step, setStep }: { step: number | null; setStep: (s: number | null) => void }) {
  const navigate = useNavigate();
  const loc = useLocation();
  const walk = useQuery({ queryKey: ['dev-walkthrough'], queryFn: () => api<DemoWalkthrough>('/api/v1/demo/walkthrough', { anonymous: true }), retry: false });
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const steps = walk.data?.steps ?? [];
  const s = step !== null ? steps[step] : undefined;
  const go = (i: number) => {
    const target = steps[i];
    if (!target) return;
    setStep(i);
    const to = routeFor(target.call.path, target.call.method);
    if (loc.pathname !== to) navigate(to);
  };
  const elapsed = Math.floor((now - started) / 1000);
  if (walk.isError) return null;
  return (
    <aside className="fixed left-1/2 top-[80px] z-[60] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 rounded-panel border border-scan/40 bg-deep/95 p-4 text-sm shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur" aria-label="Presenter notes">
      <div className="flex items-center gap-3">
        <span className="figure text-lg text-scan">{(step ?? 0) + 1}/{steps.length || '…'}</span>
        <p className="flex-1 font-semibold">{s?.title ?? 'Loading the walkthrough…'}</p>
        <span className="tabular-nums text-xs text-muted">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')} of {Math.round((walk.data?.total_seconds ?? 0) / 60)} min</span>
        <button className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-ink" onClick={() => go((step ?? 0) - 1)} disabled={!step} aria-label="Previous step"><ChevronLeft size={16} /></button>
        <button className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-ink" onClick={() => go((step ?? 0) + 1)} disabled={step === steps.length - 1} aria-label="Next step"><ChevronRight size={16} /></button>
        <button className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-ink" onClick={() => setStep(null)} aria-label="Leave presenter mode"><X size={16} /></button>
      </div>
      {s && <p className="mt-2 text-muted">“{s.say}”</p>}
    </aside>
  );
}
