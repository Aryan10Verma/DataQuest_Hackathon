// A soft claret light that trails the mouse across every page, a little behind it.
// Mouse and trackpad only: touch screens and reduced-motion settings never see it.
import { useEffect, useRef } from 'react';

const SIZE = 560;
const LAG = 0.085; // share of the remaining distance covered each frame: lower = lazier

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || !fine || calm) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let frame = 0;
    let shown = false;

    const draw = () => {
      x += (tx - x) * LAG;
      y += (ty - y) * LAG;
      el.style.transform = `translate3d(${x - SIZE / 2}px, ${y - SIZE / 2}px, 0)`;
      // Stop the loop once it has caught up; the next mouse move starts it again.
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(draw) : 0;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        // First move: appear where the mouse is instead of sliding in from the middle.
        x = tx;
        y = ty;
        shown = true;
        el.style.opacity = '1';
      }
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const leave = () => {
      shown = false;
      el.style.opacity = '0';
    };

    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, []);

  return <div ref={ref} aria-hidden className="cursor-glow" />;
}
