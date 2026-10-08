// A short curtain with the logo drawing itself, each time the page changes (0.4 s in all).
// Moving within one section (a career drawer over Results, a questionnaire section) stays quiet.
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PrismMark } from '@/shell/Brand';

const SECTION = (path: string) => path.split('/').slice(0, 3).join('/'); // "/app/results/career/x" -> "/app/results"

export function RouteCurtain() {
  const { pathname } = useLocation();
  const last = useRef(pathname);
  const [play, setPlay] = useState(0);

  useEffect(() => {
    const before = last.current;
    last.current = pathname;
    if (SECTION(before) === SECTION(pathname)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setPlay((n) => n + 1);
    const t = window.setTimeout(() => setPlay(0), 400);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (!play) return null;
  return (
    <div key={play} className="curtain" aria-hidden>
      <PrismMark className="pm-draw h-16 w-auto text-ink" />
    </div>
  );
}
