import { ApiError } from '@/api/client';

/** Field-level messages from a VALIDATION_ERROR, keyed by the last part of `loc` (e.g. "email"). */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || err.code !== 'VALIDATION_ERROR') return {};
  const list = (err.details as { errors?: { loc: (string | number)[]; msg: string }[] } | null)?.errors ?? [];
  const out: Record<string, string> = {};
  for (const e of list) {
    const key = String(e.loc[e.loc.length - 1]);
    // Pydantic prefixes some messages ("Value error, ..."); show the plain sentence.
    out[key] ??= e.msg.replace(/^Value error, /, '').replace(/^value is not a valid email address: /, '');
  }
  return out;
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : 'Something went wrong. Try again in a moment.';
