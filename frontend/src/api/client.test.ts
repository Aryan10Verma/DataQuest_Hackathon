import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, buildPath } from './client';

const envelope = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

afterEach(() => vi.unstubAllGlobals());

describe('api envelope', () => {
  it('returns data on success', async () => {
    vi.stubGlobal('fetch', envelope({ success: true, data: { status: 'ok' }, error: null, meta: { request_id: 'r', version: 'v1', mock: false } }));
    await expect(api('/api/v1/system/health')).resolves.toEqual({ status: 'ok' });
  });

  it('throws the API error code and friendly message', async () => {
    vi.stubGlobal(
      'fetch',
      envelope({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Analysis run not found' }, meta: { request_id: 'r', version: 'v1', mock: false } }, 404),
    );
    const err = (await api('/api/v1/analysis/runs/x').catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Analysis run not found');
  });

  it('reports an unreachable server plainly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = (await api('/api/v1/system/health').catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('NETWORK');
  });
});

describe('buildPath', () => {
  it('drops empty query values', () => {
    expect(buildPath('/a', { x: 1, y: '', z: undefined, lang: 'ta' })).toBe('/a?x=1&lang=ta');
  });
});
