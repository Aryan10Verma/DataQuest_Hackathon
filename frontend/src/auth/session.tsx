import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, config, getMockRole, hasTokens, setMockRole, setTokens, type Role } from '@/api/client';
import { useFamily, useRuns, type Lang } from '@/api/hooks';
import type { AuthResult, RegisterRequest, UserOut } from '@/api/types';

const ROLE_KEY = 'prism.role';
const LANG_KEY = 'prism.lang';

interface Session {
  user: UserOut | null;
  status: 'loading' | 'signed-in' | 'signed-out';
  signIn: (email: string, password: string) => Promise<UserOut>;
  register: (body: RegisterRequest) => Promise<UserOut>;
  signOut: () => void;
  /** Re-read the signed-in user, e.g. after joining a family. */
  refreshUser: () => Promise<UserOut>;
  /** Developer tools only (mock auth): switch the viewing role. */
  switchRole: (role: Role) => Promise<void>;
  lang: Lang;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<Session | null>(null);

/** Without a server sign-in (mock auth or offline fixtures), the role decides which data is shown. */
const roleDriven = config.authMode === 'mock' || config.dataMode === 'fixtures';

function readRole(): Role | null {
  try {
    return (sessionStorage.getItem(ROLE_KEY) as Role | null) ?? null;
  } catch {
    return null;
  }
}
function storeRole(role: Role | null) {
  try {
    if (role) sessionStorage.setItem(ROLE_KEY, role);
    else sessionStorage.removeItem(ROLE_KEY);
  } catch {
    /* ignore */
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<UserOut | null>(null);
  const [status, setStatus] = useState<Session['status']>('loading');
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return (localStorage.getItem(LANG_KEY) as Lang) || 'en';
    } catch {
      return 'en';
    }
  });

  const loadMe = useCallback(async () => {
    const me = await api<UserOut>('/api/v1/auth/me');
    setUser(me);
    setStatus('signed-in');
    return me;
  }, []);

  useEffect(() => {
    const role = readRole();
    if (role) setMockRole(role);
    const resume = roleDriven ? role !== null : hasTokens();
    if (!resume) {
      setStatus('signed-out');
      return;
    }
    loadMe().catch(() => {
      setTokens(null);
      setStatus('signed-out');
    });
  }, [loadMe]);

  useEffect(() => {
    const out = () => {
      setUser(null);
      setStatus('signed-out');
      qc.clear();
    };
    window.addEventListener('prism:signed-out', out);
    return () => window.removeEventListener('prism:signed-out', out);
  }, [qc]);

  const accept = useCallback(
    async (res: AuthResult) => {
      qc.clear();
      if (roleDriven) {
        setMockRole(res.user.role);
        storeRole(res.user.role);
      }
      setTokens({ access_token: res.tokens.access_token, refresh_token: res.tokens.refresh_token });
      if (roleDriven) {
        setUser(res.user);
        setStatus('signed-in');
        return res.user;
      }
      return loadMe();
    },
    [loadMe, qc],
  );

  const value = useMemo<Session>(
    () => ({
      user,
      status,
      signIn: async (email, password) =>
        accept(await api<AuthResult>('/api/v1/auth/login', { method: 'POST', body: { email, password }, anonymous: true })),
      register: async (body) =>
        accept(await api<AuthResult>('/api/v1/auth/register', { method: 'POST', body, anonymous: true })),
      signOut: () => {
        setTokens(null);
        storeRole(null);
        setUser(null);
        setStatus('signed-out');
        qc.clear();
      },
      refreshUser: loadMe,
      switchRole: async (role) => {
        setMockRole(role);
        storeRole(role);
        qc.clear();
        await loadMe();
      },
      lang,
      setLang: (l) => {
        setLangState(l);
        try {
          localStorage.setItem(LANG_KEY, l);
        } catch {
          /* ignore */
        }
      },
    }),
    [user, status, accept, loadMe, qc, lang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}

export const currentRole = (user: UserOut | null): Role => user?.role ?? getMockRole();

/** Where each role lands after signing in. */
export function homeFor(role: Role) {
  if (role === 'educator') return '/app/counsellor';
  if (role === 'admin') return '/app/admin';
  return '/app/results';
}

/**
 * The student this session is about, and their latest analysis run.
 * Students are their own student; parents follow the student in their family.
 */
export function useStudentContext() {
  const { user } = useSession();
  const isFamily = user?.role === 'student' || user?.role === 'parent';
  const family = useFamily(isFamily && !!user?.family_id);
  const runs = useRuns(isFamily);
  const studentMember = family.data?.members.find((m) => m.role === 'student');
  const studentId = user?.role === 'student' ? user.id : studentMember?.user_id ?? runs.data?.items[0]?.student_id ?? null;
  const latest = runs.data?.items[0] ?? null;
  return {
    user,
    role: user?.role,
    family: family.data ?? null,
    familyId: user?.family_id ?? family.data?.id ?? null,
    studentId,
    studentName: user?.role === 'student' ? user.full_name : studentMember?.full_name ?? null,
    latestRunId: latest?.run_id ?? null,
    runs,
    loading: runs.isLoading || family.isLoading,
  };
}
