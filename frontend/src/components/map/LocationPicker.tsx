// Where do you live? Tap your city on the map or choose state and city; a pincode is optional.
// Controlled: the parent holds the value and decides when to save it.
import { useMemo } from 'react';
import { usePlaces } from '@/api/hooks';
import { IndiaMap } from './IndiaMap';

export interface Location {
  region_code: string | null;
  pincode: string;
}

export function LocationPicker({
  value,
  onChange,
  idPrefix = 'loc',
  stacked = false,
}: {
  value: Location;
  onChange: (v: Location) => void;
  idPrefix?: string;
  /** Map above the lists, for narrow columns such as the sign-up form. */
  stacked?: boolean;
}) {
  const places = usePlaces();
  const list = useMemo(() => places.data ?? [], [places.data]);
  const picked = list.find((p) => p.region.code === value.region_code);
  const states = useMemo(() => [...new Set(list.map((p) => p.region.state ?? ''))].filter(Boolean).sort(), [list]);
  const state = picked?.region.state ?? '';
  const pick = (code: string | null) => onChange({ ...value, region_code: code });

  return (
    <div className={`grid gap-6 ${stacked ? '' : 'sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-start'}`}>
      <IndiaMap selected={value.region_code} onSelect={pick} label="Live in" className={`mx-auto w-full ${stacked ? 'max-w-[13rem]' : 'max-w-[15rem]'}`} />
      <div className="grid content-start gap-4">
        <label className="field" htmlFor={`${idPrefix}-state`}>State
          <select
            id={`${idPrefix}-state`}
            className="input"
            value={state}
            onChange={(e) => pick(list.find((p) => p.region.state === e.target.value)?.region.code ?? null)}
          >
            <option value="">Choose your state</option>
            {states.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`${idPrefix}-city`}>City, or the nearest one to you
          <select id={`${idPrefix}-city`} className="input" value={value.region_code ?? ''} onChange={(e) => pick(e.target.value || null)}>
            <option value="">Choose a city</option>
            {list
              .filter((p) => !state || p.region.state === state)
              .map((p) => <option key={p.region.code} value={p.region.code}>{p.region.name}</option>)}
          </select>
        </label>
        <label className="field" htmlFor={`${idPrefix}-pin`}>Pincode (optional)
          <input
            id={`${idPrefix}-pin`}
            className="input"
            inputMode="numeric"
            maxLength={6}
            placeholder="For example 641004"
            value={value.pincode}
            onChange={(e) => onChange({ ...value, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
          />
          <span className="text-xs">Shows real problems to work on near you.</span>
        </label>
        {picked && (
          <p className="note text-sm">
            <span className="text-ink">{picked.region.name}</span> is known for {picked.industries.map((i) => i.label.toLowerCase()).join(', ')}.
            {' '}Jobs, colleges and exams in your results start from here.
          </p>
        )}
      </div>
    </div>
  );
}
