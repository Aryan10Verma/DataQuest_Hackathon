// Number, money and date formatting. Indian grouping throughout (₹6,56,991; ₹6.6 L; ₹1.2 Cr).

const groupIN = (n: number) => Math.round(n).toLocaleString('en-IN');

/** Ledger format: ₹6,56,991. */
export function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${n < 0 ? '−' : ''}₹${groupIN(Math.abs(n))}`;
}

/** Summary format: ₹6.6 L, ₹1.2 Cr, ₹45,000 below a lakh. */
export function formatINRShort(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  const trim = (v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, ''));
  if (a >= 1e7) return `${sign}₹${trim(a / 1e7)} Cr`;
  if (a >= 1e5) return `${sign}₹${trim(a / 1e5)} L`;
  return `${sign}₹${groupIN(a)}`;
}

/** 0..1 → "71%". */
export const pct = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined ? '—' : `${(v * 100).toFixed(digits)}%`;

/** 0..1 → "0.71". */
export const score2 = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toFixed(2));

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', opts);
}

export function daysUntil(iso: string, today = new Date()) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const t = new Date(today.toISOString().slice(0, 10) + 'T00:00:00');
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

/** snake_case → Sentence case, for labels without an explicit map below. */
export const humanize = (s: string) => {
  const t = s.replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const SECTOR_LABEL: Record<string, string> = {
  engineering: 'Engineering',
  computing_ai: 'Computing and AI',
  health_life_sciences: 'Health and life sciences',
  design_arts: 'Design and arts',
  business_finance: 'Business and finance',
  law_policy: 'Law and policy',
  education_research: 'Education and research',
  media_communication: 'Media and communication',
  agri_environment: 'Agriculture and environment',
  energy_manufacturing: 'Energy and manufacturing',
  aerospace_mobility: 'Aerospace and mobility',
  hospitality_services: 'Hospitality and services',
};
export const sectorLabel = (s: string) => SECTOR_LABEL[s] ?? humanize(s);
