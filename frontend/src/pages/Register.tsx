import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Role } from '@/api/client';
import { homeFor, useSession } from '@/auth/session';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { AuthLayout } from './AuthLayout';

const ROLES: { value: Role; label: string; help: string }[] = [
  { value: 'student', label: 'Student', help: 'Grade 9 to 12' },
  { value: 'parent', label: 'Parent', help: 'Or guardian' },
  { value: 'educator', label: 'Teacher', help: 'Or counsellor' },
];

export default function Register() {
  const { register, lang } = useSession();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('student');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const local: Record<string, string> = {};
    if (!String(f.get('full_name')).trim()) local.full_name = 'Enter your full name.';
    if (String(f.get('password')).length < 8) local.password = 'Use at least 8 characters.';
    if (role === 'student' && !f.get('date_of_birth')) local.date_of_birth = 'Students need a date of birth, so a parent can approve if you are under 18.';
    setErrors(local);
    setError(null);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      const user = await register({
        full_name: String(f.get('full_name')).trim(),
        email: String(f.get('email')).trim(),
        password: String(f.get('password')),
        role,
        date_of_birth: role === 'student' ? String(f.get('date_of_birth')) : null,
        preferred_language: lang,
        website: String(f.get('website') ?? '') || null,
      });
      navigate(user.role === 'student' ? '/app/questionnaire' : homeFor(user.role), { replace: true });
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      if (!Object.keys(fe).length) setError(errorMessage(err));
      setBusy(false);
    }
  }

  const fieldError = (name: string) =>
    errors[name] ? <span id={`${name}-error`} className="text-xs text-danger">{errors[name]}</span> : null;

  return (
    <AuthLayout
      title="Create your account"
      intro="Students take the questionnaire. Parents add the family budget privately. Teachers follow their students."
      footer={<>Already have an account? <Link className="text-accent hover:underline" to="/signin">Sign in</Link></>}
    >
      <form className="grid gap-5" onSubmit={submit} noValidate>
        {/* Bot trap: hidden from people and screen readers; automated sign-ups fill it and are refused. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm text-muted">I am a</legend>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <label key={r.value}
                className={`grid min-h-[64px] cursor-pointer content-center rounded-lg border px-3 py-2 transition-colors ${role === r.value ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/60'}`}>
                <input type="radio" name="role" value={r.value} className="sr-only" checked={role === r.value} onChange={() => setRole(r.value)} />
                <span className="text-sm font-semibold">{r.label}</span>
                <span className="text-xs text-muted">{r.help}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field">
          Full name
          <input className="input" name="full_name" autoComplete="name" aria-invalid={!!errors.full_name} aria-describedby="full_name-error" />
          {fieldError('full_name')}
        </label>
        <label className="field">
          Email
          <input className="input" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby="email-error" />
          {fieldError('email')}
        </label>
        <label className="field">
          Password
          <input className="input" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby="password-error" />
          {fieldError('password') ?? <span className="text-xs">At least 8 characters.</span>}
        </label>
        {role === 'student' && (
          <label className="field">
            Date of birth
            <input className="input" name="date_of_birth" type="date" max={new Date().toISOString().slice(0, 10)} aria-invalid={!!errors.date_of_birth} aria-describedby="date_of_birth-error" />
            {fieldError('date_of_birth') ?? <span className="text-xs">If you are under 18, a parent approves your account before we use your answers.</span>}
          </label>
        )}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button className="btn-primary mt-1 justify-self-start" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthLayout>
  );
}
