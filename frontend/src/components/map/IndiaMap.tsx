// The India map with a point for every city PRISM covers. Used to pick where you live and to explore
// job demand. Points can be sized by demand; the selected city is ringed.
import type { RegionDemand } from '@/api/types';
import { CITIES } from './cities';

const src = (p: string) => `${import.meta.env.BASE_URL}${p}`;

export function IndiaMap({
  selected,
  onSelect,
  demand,
  label,
  className = '',
}: {
  selected?: string | null;
  onSelect?: (code: string) => void;
  /** Size and brighten each point by job demand. */
  demand?: Map<string, RegionDemand>;
  /** What choosing a city does, for screen readers ("Live in", "Show jobs in"). */
  label: string;
  className?: string;
}) {
  return (
    <div className={`india-map ${className}`} role="group" aria-label="Map of India">
      <img src={src('map/india-sm.webp')} srcSet={`${src('map/india-sm.webp')} 1200w, ${src('map/india.webp')} 2400w`} sizes="(max-width: 760px) 90vw, 40vw" alt="" decoding="async" />
      {CITIES.map((c) => {
        const d = demand?.get(c.code);
        const size = d ? 7 + d.demand_index * 12 : 9;
        const on = selected === c.code;
        return (
          <button
            key={c.code}
            type="button"
            className={`india-city ${on ? 'is-on' : ''} ${c.side === 'left' ? 'is-left' : ''}`}
            style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, ['--s' as string]: `${size}px` }}
            onClick={() => onSelect?.(c.code)}
            aria-pressed={on}
            aria-label={`${label} ${c.name}${d ? `, job demand ${Math.round(d.demand_index * 100)}%` : ''}`}
            title={c.name}
          >
            <span className="dot" aria-hidden />
            <span className="name" aria-hidden>{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
