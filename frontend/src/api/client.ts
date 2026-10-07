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

/* ---------- sign-in state ----------
 * The short-lived access token lives only in memory. The refresh token is an HttpOnly cookie the
 * server sets (page scripts can't read it), so a reload or a new tab signs back in through
 * /auth/refresh. A plain flag in localStorage only says "try that"; it holds nothing secret. */
const SESSION_FLAG = 'prism.session';
let accessToken: string | null = null;
let mockRole: Role = 'student';
let lastMeta: Meta | null = null;

try {
  sessionStorage.removeItem('prism.tokens'); // tokens stored by earlier versions
} catch {
  /* storage blocked */
}

function flag(on: boolean) {
  try {
    if (on) localStorage.setItem(SESSION_FLAG, '1');
    else localStorage.removeItem(SESSION_FLAG);
  } catch {
    /* storage blocked: the session lasts until the tab reloads */
  }
}

/** Store the access token after sign-in, or forget it (null) after sign-out. */
export function setAccessToken(token: string | null) {
  accessToken = token;
  flag(token !== null);
}

/** Whether a cookie session may exist, so resuming is worth a request. */
export function mayHaveSession() {
  if (accessToken) return true;
  try {
    return localStorage.getItem(SESSION_FLAG) === '1';
  } catch {
    return false;
  }
}

/** Revoke the refresh cookie on the server. */
export async function signOutOnServer() {
  accessToken = null;
  flag(false);
  if (import.meta.env.VITE_DATA_MODE === 'fixtures' || config.authMode === 'mock') return;
  try {
    await fetch(`${config.apiUrl}/api/v1/auth/logout`, { method: 'POST', credentials, headers: { Accept: 'application/json' } });
  } catch {
    /* offline: the cookie expires on its own */
  }
}

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

// Same-origin by default; a separate API origin (VITE_API_URL) needs the cookie sent cross-site.
const credentials: RequestCredentials = config.apiUrl ? 'include' : 'same-origin';

function headers(anonymous: boolean, json: boolean): HeadersInit {
  // X-Session-Mode: cookie asks the server to keep the refresh token out of response bodies.
  const h: Record<string, string> = { Accept: 'application/json', 'X-Session-Mode': 'cookie' };
  if (json) h['Content-Type'] = 'application/json';
  if (!anonymous) {
    // The literal env comparison lets the build drop mock auth entirely unless VITE_AUTH_MODE=mock.
    if (import.meta.env.VITE_AUTH_MODE === 'mock') h['X-Mock-Role'] = mockRole;
    else if (accessToken) h.Authorization = `Bearer ${accessToken}`;
  }
  return h;
}

let refreshing: Promise<boolean> | null = null;
/** Swap the refresh cookie for a new access token; one request at a time however many calls hit 401. */
export async function refreshOnce(): Promise<boolean> {
  if (!mayHaveSession()) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials,
        headers: headers(true, false),
      });
      const env = (await res.json()) as Envelope<{ access_token: string }>;
      if (!env.success) throw new Error();
      setAccessToken(env.data.access_token);
      return true;
    } catch {
      const had = accessToken !== null;
      setAccessToken(null);
      if (had) window.dispatchEvent(new Event('prism:signed-out'));
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
      credentials,
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
  const send = () => fetch(`${config.apiUrl}${url}`, { credentials, headers: headers(false, false) });
  let res = await send();
  if (res.status === 401 && config.authMode === 'live' && (await refreshOnce())) res = await send();
  if (!res.ok) await unwrap(res); // throws the API's own error message
  return res.blob();
}
