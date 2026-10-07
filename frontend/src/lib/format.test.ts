import { describe, expect, it } from 'vitest';
import { formatINR, formatINRShort, pct } from './format';

describe('formatINR', () => {
  it('uses Indian digit grouping', () => {
    expect(formatINR(656991)).toBe('₹6,56,991');
    expect(formatINR(12500000)).toBe('₹1,25,00,000');
    expect(formatINR(0)).toBe('₹0');
  });
  it('marks negatives and missing values', () => {
    expect(formatINR(-45000)).toBe('−₹45,000');
    expect(formatINR(null)).toBe('—');
  });
});

describe('formatINRShort', () => {
  it('uses lakh and crore', () => {
    expect(formatINRShort(656991)).toBe('₹6.6 L');
    expect(formatINRShort(12000000)).toBe('₹1.2 Cr');
    expect(formatINRShort(500000)).toBe('₹5 L');
    expect(formatINRShort(45000)).toBe('₹45,000');
  });
});

describe('pct', () => {
  it('formats a 0..1 share', () => {
    expect(pct(0.714)).toBe('71%');
    expect(pct(undefined)).toBe('—');
  });
});
