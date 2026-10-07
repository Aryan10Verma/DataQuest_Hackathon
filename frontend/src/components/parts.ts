// The six score parts. Their colours are the only colours in the product besides cyan,
// and they appear only inside charts, so a colour always means a score part.
import type { Contribution, ScoreComponent } from '@/api/types';

export const PARTS: { key: ScoreComponent; label: string; short: string; color: string; help: string }[] = [
  { key: 'fit', label: 'Fit', short: 'Fit', color: 'var(--part-fit)', help: 'How well the career matches your interests, aptitude, thinking style and values.' },
  { key: 'market', label: 'Job market', short: 'Market', color: 'var(--part-market)', help: 'Demand for the job and how fast it is hiring, in the regions you would consider.' },
  { key: 'affordability', label: 'Affordability', short: 'Afford', color: 'var(--part-affordability)', help: 'Whether the course cost fits your family budget, after scholarships and loans.' },
  { key: 'roi', label: 'Return on cost', short: 'Return', color: 'var(--part-roi)', help: 'Expected earnings over the cost of the course, and how fast it pays back.' },
  { key: 'family_alignment', label: 'Family agreement', short: 'Family', color: 'var(--part-family)', help: 'How close the career is to what your parents hope for.' },
  { key: 'disruption', label: 'Automation risk', short: 'Risk', color: 'var(--part-disruption)', help: 'The chance the job changes a lot or shrinks because of automation. It lowers the score.' },
];
export const PART = Object.fromEntries(PARTS.map((p) => [p.key, p])) as Record<ScoreComponent, (typeof PARTS)[number]>;

export interface Segment {
  key: ScoreComponent;
  /** Share of the full bar, 0..100. The full bar is a score of 1.0. */
  width: number;
  contribution: number;
  negative: boolean;
}

/**
 * Lay out a score bar. Positive parts sit side by side from the left; the negative part
 * (automation risk) is drawn hatched over the right end of them, so what stays solid equals the final score.
 */
export function scoreSegments(contributions: Contribution[]): { segments: Segment[]; total: number } {
  const order = PARTS.map((p) => p.key);
  const sorted = [...contributions].sort((a, b) => order.indexOf(a.component) - order.indexOf(b.component));
  const segments = sorted
    .filter((c) => Math.abs(c.contribution) > 1e-9)
    .map((c) => ({
      key: c.component,
      width: Math.min(100, Math.abs(c.contribution) * 100),
      contribution: c.contribution,
      negative: c.contribution < 0,
    }));
  const total = sorted.reduce((s, c) => s + c.contribution, 0);
  return { segments, total };
}
