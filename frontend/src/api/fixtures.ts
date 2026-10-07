// Fixture mode: answers requests from the backend's frozen example responses (src/fixtures),
// so every core screen works with no server and no network.
import type { Role } from './client';

interface IndexEntry {
  name: string;
  method: string;
  path: string;
  status: number;
  headers: Record<string, string>;
}

const files = import.meta.glob('../fixtures/*.json', { eager: true, import: 'default' }) as Record<
  string,
  unknown
>;
const byName = new Map<string, unknown>();
for (const [file, json] of Object.entries(files)) {
  byName.set(file.split('/').pop()!.replace(/\.json$/, ''), json);
}
const index = (byName.get('_index') ?? []) as IndexEntry[];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Path segments that are ids or slugs in the fixture paths: they match any value.
const isVariable = (seg: string, prev: string) =>
  UUID.test(seg) || (prev === 'careers' && seg !== '') || (prev === 'assessments' && seg.endsWith('_v1'));

function pathMatches(fixturePath: string, path: string) {
  const a = fixturePath.split('/');
  const b = path.split('/');
  if (a.length !== b.length) return false;
  return a.every((seg, i) => seg === b[i] || (isVariable(seg, a[i - 1] ?? '') && b[i] !== 'me'));
}

function find(method: string, url: string, role: Role): IndexEntry | undefined {
  const [path, qs = ''] = url.split('?');
  const lang = new URLSearchParams(qs).get('lang');
  let candidates = index.filter((e) => e.method === method && pathMatches(e.path.split('?')[0], path));
  if (lang) candidates = candidates.filter((e) => !e.path.includes('lang=') || e.path.includes(`lang=${lang}`));
  const roleOf = (e: IndexEntry) => e.headers['X-Mock-Role'] ?? '';
  const preferred = role === 'student' ? '' : role;
  return (
    candidates.find((e) => roleOf(e) === preferred) ??
    candidates.find((e) => roleOf(e) === '') ??
    candidates.find((e) => roleOf(e) === 'parent') ??
    candidates[0]
  );
}

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const roleFromEmail = (email: string): Role =>
  (['parent', 'educator', 'admin', 'counsellor'].find((r) => email.toLowerCase().includes(r))?.replace(
    'counsellor',
    'educator',
  ) as Role | undefined) ?? 'student';

const NAMES: Record<Role, string> = { student: 'Ananya R.', parent: 'R. Raman', educator: 'S. Lakshmi', admin: 'Admin' };

export function fixtureResponse(method: string, url: string, body: unknown, role: Role): Response {
  const path = url.split('?')[0];

  // Sign-in and register accept anything and pick the role from the e-mail address.
  if (path === '/api/v1/auth/login' || path === '/api/v1/auth/register') {
    const email = String((body as { email?: string })?.email ?? 'student@prism.example');
    const login = structuredClone(byName.get('auth_login')) as { data: { user: Record<string, unknown> } };
    const r = roleFromEmail(email);
    Object.assign(login.data.user, { role: r, email, full_name: NAMES[r], is_minor: r === 'student' });
    return respond(200, login);
  }
  if (path === '/api/v1/auth/me') {
    const me = structuredClone(byName.get('auth_me')) as { data: Record<string, unknown> };
    Object.assign(me.data, { role, full_name: NAMES[role], is_minor: role === 'student' });
    return respond(200, me);
  }

  let entry = find(method, url, role);
  // Writes without their own fixture echo the matching read (saving finance returns the finance view).
  if (!entry && method === 'PUT') entry = find('GET', url, 'parent');
  if (!entry && method === 'POST' && path.includes('/assessments/')) entry = find('POST', '/api/v1/assessments/riasec_v1/submit', role);
  if (!entry) {
    return respond(404, {
      success: false,
      data: null,
      error: { code: 'NOT_FOUND', message: 'This needs the PRISM server; it is not part of the offline data.' },
      meta: { request_id: 'fixture', version: 'v1', mock: true },
    });
  }
  return respond(entry.status, byName.get(entry.name));
}
