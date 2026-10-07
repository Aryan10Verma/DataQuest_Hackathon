import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/shell/Shell';
import { Ring } from '@/components/ui';

/** Sign-in and register: the form on the left, the scanned body in its ring on the right. */
export function AuthLayout({ title, intro, children, footer }: { title: string; intro: ReactNode; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-4 py-6 sm:px-10 lg:px-16">
        <Logo />
        <main className="my-auto w-full max-w-[420px] py-12">
          <h1 className="display mb-3 text-2xl sm:text-3xl">{title}</h1>
          <p className="mb-8 text-muted">{intro}</p>
          {children}
          <div className="mt-8 text-sm text-muted">{footer}</div>
        </main>
        <Link to="/" className="text-xs text-muted hover:text-ink">Back to the PRISM home page</Link>
      </div>
      <div className="relative hidden overflow-hidden border-l border-line lg:block" aria-hidden
        style={{ background: 'radial-gradient(55% 50% at 50% 45%, rgba(40,90,170,0.25), transparent 70%), var(--void)' }}>
        <div className="absolute inset-0 grid place-items-center">
          <Ring size={520} stroke={1.6} className="opacity-90" />
        </div>
        <img src="/scan/front.webp" alt="" className="absolute left-1/2 top-1/2 h-[78vh] -translate-x-1/2 -translate-y-1/2 opacity-80"
          style={{ maskImage: 'linear-gradient(to bottom, transparent, #000 6%, #000 88%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 6%, #000 88%, transparent)' }} />
      </div>
    </div>
  );
}
