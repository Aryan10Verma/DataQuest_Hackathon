// In-progress answers live in localStorage until the submit succeeds, so a closed tab or a dropped
// connection loses nothing. The submission id is fixed per attempt, which makes resubmitting safe.

export interface Draft {
  answers: Record<string, { value: string; response_ms: number }>;
  index: number;
  submissionId: string;
  startedAt: number;
}

const key = (userId: string, code: string) => `prism.answers.${userId}.${code}`;

export function loadDraft(userId: string, code: string): Draft | null {
  try {
    const raw = localStorage.getItem(key(userId, code));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(userId: string, code: string, draft: Draft) {
  try {
    localStorage.setItem(key(userId, code), JSON.stringify(draft));
  } catch {
    /* storage full or blocked: answers stay in memory for this visit */
  }
}

export function clearDraft(userId: string, code: string) {
  try {
    localStorage.removeItem(key(userId, code));
  } catch {
    /* ignore */
  }
}

export const newDraft = (): Draft => ({ answers: {}, index: 0, submissionId: crypto.randomUUID(), startedAt: Date.now() });

/** Recommended order: the short reflective sections first, the timed aptitude sprint last. */
export const ORDER = ['riasec_v1', 'cognitive_v1', 'values_v1', 'disposition_v1', 'aptitude_v1'];

export const PLAIN_NAME: Record<string, string> = {
  riasec_v1: 'Interests',
  aptitude_v1: 'Aptitude',
  cognitive_v1: 'Thinking style',
  values_v1: 'Values',
  disposition_v1: 'Grit and risk',
};

/** Quality flags, phrased gently for the student. */
export function flagMessage(flag: string): string {
  if (flag === 'straight_lining') return 'Many answers were the same. If you rushed, retaking this section makes your results more accurate.';
  if (flag === 'speeding') return 'Some answers came very quickly. Take your time on a retake if you want sharper results.';
  if (flag === 'incomplete') return 'Some questions were skipped. Answering them makes your results more reliable.';
  if (flag.startsWith('contradictory_answers')) return 'A few answers pointed in opposite directions. That is normal, but a retake can clear it up.';
  return 'Some answers may be less reliable than others.';
}
