// One fetch helper for the whole app: unwraps the {success, data, error, meta} envelope,
// attaches auth (bearer tokens, or X-Mock-Role in mock auth), refreshes once on 401,
// and serves src/fixtures instead of the network when VITE_DATA_MODE=fixtures.

export type Role = 'student' | 'parent' | 'educator' | 'admin';

export const config = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '',
  authMode: ((import.meta.env.VITE_AUTH_MODE as string | undefined) || 'live') as 'live' | 'mock',
  dataMode: ((import.meta.env.VITE_DATA_MODE as string | undefined) || 'api') as 'api' | 'fixtures',
};

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
    public details: unknown = null,
  ) {
    super(message);
  }
}

export interface Meta {
  request_id: string;
  version: string;
  mock: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string; details?: unknown } | null;
  meta: Meta;
}

/* ---------- token store: memory first, sessionStorage so a refresh survives a reload ---------- */
const TOKEN_KEY = 'prism.tokens';
interface Tokens {
  access_token: string;
  refresh_token: string;
}
let tokens: Tokens | null = readStored();
let mockRole: Role = 'student';
let lastMeta: Meta | null = null;

function readStored(): Tokens | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function setTokens(next: Tokens | null) {
  tokens = next;
  try {
    if (next) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: memory only */
  }
}
export const hasTokens = () => tokens !== null;
export const setMockRole = (role: Role) => {
  mockRole = role;
};
export const getMockRole = () => mockRole;
export const getLastMeta = () => lastMeta;

/* ---------- requests ---------- */
type Query = Record<string, string | number | boolean | null | undefined>;
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** Skip the auth header and the refresh retry (login, register, refresh). */
  anonymous?: boolean;
}

export function buildPath(path: string, query?: Query) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function headers(anonymous: boolean, json: boolean): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (json) h['Content-Type'] = 'application/json';
  if (!anonymous) {
    // The literal env comparison lets the build drop mock auth entirely unless VITE_AUTH_MODE=mock.
    if (import.meta.env.VITE_AUTH_MODE === 'mock') h['X-Mock-Role'] = mockRole;
    else if (tokens) h.Authorization = `Bearer ${tokens.access_token}`;
  }
  return h;
}

let refreshing: Promise<boolean> | null = null;
async function refreshOnce(): Promise<boolean> {
  if (!tokens) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: headers(true, true),
        body: JSON.stringify({ refresh_token: tokens!.refresh_token }),
      });
      const env = (await res.json()) as Envelope<Tokens>;
      if (!env.success) throw new Error();
      setTokens({ access_token: env.data.access_token, refresh_token: env.data.refresh_token });
      return true;
    } catch {
      setTokens(null);
      window.dispatchEvent(new Event('prism:signed-out'));
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function unwrap<T>(res: Response): Promise<T> {
  let env: Envelope<T>;
  try {
    env = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError('NETWORK', 'The server sent an unreadable response. Try again in a moment.', res.status);
  }
  if (env.meta) lastMeta = env.meta;
  if (!env.success || !res.ok) {
    const e = env.error ?? { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server.' };
    throw new ApiError(e.code, e.message, res.status, e.details ?? null);
  }
  return env.data;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const url = buildPath(path, opts.query);
  // Offline fixtures are only bundled into builds made with VITE_DATA_MODE=fixtures.
  if (import.meta.env.VITE_DATA_MODE === 'fixtures') {
    const { fixtureResponse } = await import('./fixtures');
    return unwrap<T>(fixtureResponse(method, url, opts.body, mockRole));
  }
  const send = () =>
    fetch(`${config.apiUrl}${url}`, {
      method,
      headers: headers(!!opts.anonymous, opts.body !== undefined),
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && !opts.anonymous && config.authMode === 'live' && (await refreshOnce())) {
      res = await send();
    }
  } catch {
    throw new ApiError('NETWORK', 'Cannot reach the PRISM server. Check that it is running, then try again.');
  }
  return unwrap<T>(res);
}

/** For the two non-JSON endpoints (HTML report, .ics calendar): fetch with auth, return a blob. */
export async function apiBlob(path: string, query?: Query): Promise<Blob> {
  const url = buildPath(path, query);
  if (config.dataMode === 'fixtures') {
    throw new ApiError('OFFLINE', 'Reports and calendar files need the PRISM server. They are not available offline.');
  }
  const send = () => fetch(`${config.apiUrl}${url}`, { headers: headers(false, false) });
  let res = await send();
  if (res.status === 401 && config.authMode === 'live' && (await refreshOnce())) res = await send();
  if (!res.ok) await unwrap(res); // throws the API's own error message
  return res.blob();
}
