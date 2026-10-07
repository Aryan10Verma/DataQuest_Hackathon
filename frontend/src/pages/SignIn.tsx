import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { homeFor, useSession } from '@/auth/session';
import { errorMessage } from '@/lib/errors';
import { AuthLayout } from './AuthLayout';

export default function SignIn() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const state = useLocation().state as { from?: string; email?: string; password?: string } | null;
  const from = state?.from;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const user = await signIn(String(f.get('email')).trim(), String(f.get('password')));
      // Only ever return to a page inside the app: no other sites, no // or backslash tricks.
      navigate(from && /^\/app(\/[\w\-/]*)?$/.test(from) ? from : homeFor(user.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      intro="Pick up where you left off: your results, your family's plan and the next deadline."
      footer={<>New to PRISM? <Link className="text-accent hover:underline" to="/register">Create an account</Link></>}
    >
      {import.meta.env.VITE_DATA_MODE === 'fixtures' && (
        <p className="mb-6 note text-sm">
          Offline demo with sample data. Sign in with any email and password. An email containing “parent”, “educator” or “admin” opens that view; anything else opens the student view.
        </p>
      )}
      <form className="grid gap-5" onSubmit={submit} noValidate>
        <label className="field">
          Email
          <input className="input" name="email" type="email" autoComplete="email" required autoFocus defaultValue={state?.email ?? (import.meta.env.VITE_DATA_MODE === 'fixtures' ? 'demo.parent@prism.example' : undefined)} key={state?.email} />
        </label>
        <label className="field">
          Password
          <input className="input" name="password" type="password" autoComplete="current-password" required defaultValue={state?.password ?? (import.meta.env.VITE_DATA_MODE === 'fixtures' ? 'demo' : undefined)} key={state?.password} />
        </label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button className="btn-primary mt-1 justify-self-start" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthLayout>
  );
}
