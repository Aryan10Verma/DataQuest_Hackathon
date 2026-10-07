// The PRISM logo: a lit prism splitting light into three rays, resting on an open book,
// with the wordmark whose I is topped by a small prism. The navy of the printed logo
// becomes ivory (currentColor) on the dark theme; the prism keeps its colours.
import { useId } from 'react';
import { Link } from 'react-router-dom';

export function PrismMark({ className = 'h-8 w-auto' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 72 58" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#3f6fdc" />
          <stop offset="1" stopColor="#62a6f2" />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7a447" />
          <stop offset="0.5" stopColor="#ec5f8c" />
          <stop offset="1" stopColor="#8a5ae6" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#cfdcff" />
          <stop offset="1" stopColor="#f8d4e4" />
        </linearGradient>
      </defs>
      {/* Rays leave the right face and fan out. */}
      <g strokeLinecap="round" strokeWidth="2.6">
        <path d="M38 19 L70 9" stroke="#f5c84a" />
        <path d="M40 24 L70 23" stroke="#ec5f8c" />
        <path d="M42 29 L70 37" stroke="#6c68e6" />
      </g>
      {/* Three faces of the prism: left, right and the lighter inner face below. */}
      <path d="M26 3 L5 39 L29 31 Z" fill={`url(#${id}l)`} />
      <path d="M26 3 L29 31 L47 39 Z" fill={`url(#${id}r)`} />
      <path d="M5 39 L29 31 L47 39 Z" fill={`url(#${id}b)`} />
      {/* The open book. */}
      <path d="M26 48.5 C20 44.5 12 44 4 45.6 L4 51.6 C12 50 20 50.6 26 55 Z" fill="currentColor" />
      <path d="M26 48.5 C32 44.5 40 44 48 45.6 L48 51.6 C40 50 32 50.6 26 55 Z" fill="currentColor" opacity="0.78" />
    </svg>
  );
}

/** The wordmark: a small prism stands in for the dot of the I. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-semibold tracking-[0.08em] ${className}`} aria-label="PRISM">
      <span aria-hidden>PR</span>
      <span aria-hidden className="relative mx-[0.08em] inline-block h-[0.47em] w-[0.135em] rounded-[0.02em] bg-current">
        <svg viewBox="0 0 10 9" className="absolute bottom-[calc(100%+0.05em)] left-1/2 w-[0.22em] -translate-x-1/2">
          <path d="M5 0 L10 9 L0 9 Z" fill="url(#prism-dot)" />
          <defs>
            <linearGradient id="prism-dot" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4f7fe0" />
              <stop offset="1" stopColor="#8a5ae6" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      <span aria-hidden>SM</span>
    </span>
  );
}

export const TAGLINE = 'Your Future. Our Guidance.';

export function Logo({ tagline = false }: { tagline?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-ink" aria-label="PRISM home">
      <PrismMark className={tagline ? 'h-10 w-auto' : 'h-7 w-auto'} />
      <span className="grid leading-none">
        <Wordmark className="text-[1.2rem]" />
        {tagline && <span className="mt-1.5 text-[0.7rem] tracking-[0.02em] text-muted">{TAGLINE}</span>}
      </span>
    </Link>
  );
}
