import { describe, expect, it } from 'vitest';
import { titleFor } from './PageTitle';

describe('titleFor', () => {
  it('names each page', () => {
    expect(titleFor('/')).toBe('PRISM – See every path');
    expect(titleFor('/app/results')).toBe('Results – PRISM');
    expect(titleFor('/app/results/career/abc')).toBe('Career – PRISM');
    expect(titleFor('/app/questionnaire/place')).toBe('Where you live – PRISM');
    expect(titleFor('/app/questionnaire/riasec_v1')).toBe('Questionnaire – PRISM');
  });
  it('does not match on a shared prefix', () => {
    expect(titleFor('/app/plans')).toBe('Page not found – PRISM');
  });
});
