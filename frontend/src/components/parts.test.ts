import { describe, expect, it } from 'vitest';
import type { Contribution } from '@/api/types';
import { scoreSegments } from './parts';

const contributions: Contribution[] = [
  { component: 'disruption', raw_value: 0.25, weight: 0.05, contribution: -0.0125 },
  { component: 'fit', raw_value: 0.86, weight: 0.3, contribution: 0.258 },
  { component: 'market', raw_value: 0.84, weight: 0.15, contribution: 0.126 },
  { component: 'affordability', raw_value: 1, weight: 0.2, contribution: 0.2 },
  { component: 'roi', raw_value: 0.78, weight: 0.15, contribution: 0.117 },
  { component: 'family_alignment', raw_value: 0.55, weight: 0.15, contribution: 0.0825 },
];

describe('scoreSegments', () => {
  it('orders parts and sizes each by its contribution (a full bar is a score of 1)', () => {
    const { segments, total } = scoreSegments(contributions);
    expect(segments.map((s) => s.key)).toEqual(['fit', 'market', 'affordability', 'roi', 'family_alignment', 'disruption']);
    expect(segments[0].width).toBeCloseTo(25.8);
    expect(total).toBeCloseTo(0.771);
  });
  it('marks automation risk as negative so it is drawn hatched', () => {
    const risk = scoreSegments(contributions).segments.find((s) => s.key === 'disruption')!;
    expect(risk.negative).toBe(true);
    expect(risk.width).toBeCloseTo(1.25);
  });
  it('drops parts that contribute nothing', () => {
    const { segments } = scoreSegments([{ component: 'fit', raw_value: 0, weight: 0.3, contribution: 0 }]);
    expect(segments).toHaveLength(0);
  });
});
