import * as Dialog from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@/api/client';
import type { Lang } from '@/api/hooks';
import { useSession } from '@/auth/session';
import { Logo } from './Brand';
import { Tour, startTour } from './Tour';

export { Logo };

interface Item {
  to: string;
  label: string;
}

// A null entry draws a divider: the main path first, then the tools.
const TOOLS: Item[] = [
  { to: '/app/what-if', label: 'What if?' },
  { to: '/app/compare', label: 'Compare' },
  { to: '/app/scholarships', label: 'Scholarships' },
  { to: '/app/loans', label: 'Loans' },
  { to: '/app/exams', label: 'Exam calendar' },
  { to: '/app/outcomes', label: 'What I chose' },
];

const NAV: Record<Role, (Item | null)[]> = {
  student: [
    { to: '/app/home', label: 'Home' },
    { to: '/app/questionnaire', label: 'Questionnaire' },
    { to: '/app/results', label: 'Results' },
    { to: '/app/plan', label: 'Plan' },
    { to: '/app/family', label: 'Family' },
    { to: '/app/explore', label: 'Explore' },
    { to: '/app/profile', label: 'My profile' },
    null,
    ...TOOLS,
    null,
    { to: '/app/trust', label: 'How we know' },
  ],
  parent: [
    { to: '/app/home', label: 'Home' },
    { to: '/app/results', label: 'Results' },
    { to: '/app/plan', label: 'Plan' },
    { to: '/app/family', label: 'Family' },
    { to: '/app/explore', label: 'Explore' },
    { to: '/app/profile', label: "Child's profile" },
    null,
    ...TOOLS,
    null,
    { to: '/app/trust', label: 'How we know' },
  ],
  educator: [
    { to: '/app/counsellor', label: 'Students' },
    { to: '/app/explore', label: 'Explore' },
    null,
    { to: '/app/scholarships', label: 'Scholarships' },
    { to: '/app/loans', label: 'Loans' },
    { to: '/app/exams', label: 'Exam calendar' },
    null,
    { to: '/app/trust', label: 'How we know' },
  ],
  admin: [
    { to: '/app/admin', label: 'Analytics' },
    { to: '/app/trust', label: 'How we know' },
  ],
};

/** The tour finds each nav link by its last path segment, e.g. /app/exams → exams. */
const tourId = (to: string) => to.split('/').pop();

const ROLE_LABEL: Record<Role, string> = { student: 'Student', parent: 'Parent', educator: 'Counsellor', admin: 'Administrator' };
const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'hi', label: 'हिन्दी' },
];

function Rail({ items }: { items: (Item | null)[] }) {
  const loc = useLocation();
  const listRef = useRef<HTMLUListElement>(null);
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const active = listRef.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
    setMarker(active ? { top: active.offsetTop, height: active.offsetHeight } : null);
  }, [loc.pathname, items]);
  return (
    <nav aria-label="Main" className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[var(--rail)] shrink-0 overflow-y-auto py-10 pl-6 lg:block">
      <ul ref={listRef} className="relative grid gap-1 border-l border-line pl-4">
        {marker && (
          <span
            aria-hidden
            className="absolute -left-px w-px bg-accent shadow-[0_0_8px_var(--glow)] transition-[top,height] duration-500"
            style={{ top: marker.top + 8, height: marker.height - 16, transitionTimingFunction: 'var(--ease)' }}
          />
        )}
        {items.map((it, i) =>
          it === null ? (
            <li key={`divider-${i}`} aria-hidden className="my-3 mr-6 h-px bg-line" />
          ) : (
          <li key={it.to}>
            <NavLink
              to={it.to}
              data-tour={tourId(it.to)}
              className={({ isActive }) =>
                `flex min-h-[40px] items-center text-sm transition-colors ${isActive ? 'text-ink' : 'text-muted hover:text-ink'}`
              }
            >
              {it.label}
            </NavLink>
          </li>
          ),
        )}
      </ul>
    </nav>
  );
}

function BottomNav({ items: all }: { items: (Item | null)[] }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const items = all.filter((i): i is Item => i !== null);
  const main = items.slice(0, 4);
  const more = items.slice(4);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-void/90 backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-xl justify-between px-2">
        {main.map((it) => (
          <li key={it.to} className="flex-1">
            <NavLink
              to={it.to}
              data-tour={tourId(it.to)}
              className={({ isActive }) =>
                `relative flex min-h-[56px] items-center justify-center px-1 text-center text-xs ${isActive ? 'text-ink' : 'text-muted'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span aria-hidden className="absolute top-0 h-px w-8 bg-accent shadow-[0_0_8px_var(--glow)]" />}
                  {it.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
        {more.length > 0 && (
          <li className="flex-1">
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger
                data-tour="more"
                className={`flex min-h-[56px] w-full items-center justify-center gap-1 text-xs ${more.some((m) => loc.pathname.startsWith(m.to)) ? 'text-ink' : 'text-muted'}`}
              >
                <MenuIcon size={15} aria-hidden /> More
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm" />
                <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] border-t border-line bg-deep p-6 pb-10">
                  <div className="mb-4 flex items-center justify-between">
                    <Dialog.Title className="display text-xl">More</Dialog.Title>
                    <Dialog.Close className="grid h-11 w-11 place-items-center rounded-full text-muted hover:text-ink" aria-label="Close">
                      <X size={18} />
                    </Dialog.Close>
                  </div>
                  <ul className="grid gap-1">
                    {more.map((it) => (
                      <li key={it.to}>
                        <NavLink to={it.to} onClick={() => setOpen(false)} className="flex min-h-[48px] items-center border-b border-line text-base">
                          {it.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </li>
        )}
      </ul>
    </nav>
  );
}

function TopBar() {
  const { user, signOut, lang, setLang } = useSession();
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-line bg-void/85 px-4 backdrop-blur sm:px-6">
      <Logo />
      <div className="ml-auto flex items-center gap-2">
        <label className="sr-only" htmlFor="lang">Language for summaries and reports</label>
        <select
          id="lang"
          data-tour="language"
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="min-h-[40px] rounded-full border border-line bg-void px-3 text-sm text-ink focus:border-accent focus:outline-none"
          title="Language for summaries and reports"
        >
          {LANGS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        {user && (
          <Menu.Root>
            <Menu.Trigger data-tour="account" className="flex min-h-[40px] items-center gap-2 rounded-full border border-line px-3 text-sm hover:border-accent">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-xs text-accent" aria-hidden>
                {user.full_name.charAt(0)}
              </span>
              <span className="hidden max-w-[140px] truncate sm:inline">{user.full_name}</span>
              <ChevronDown size={14} aria-hidden />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content align="end" sideOffset={8} className="z-50 min-w-[220px] rounded-panel border border-line bg-deep p-2 text-sm">
                <div className="px-3 py-2">
                  <p className="font-semibold">{user.full_name}</p>
                  <p className="text-xs text-muted">{ROLE_LABEL[user.role]} · {user.email}</p>
                </div>
                <Menu.Separator className="my-1 h-px bg-line" />
                <Menu.Item
                  onSelect={startTour}
                  className="flex min-h-[40px] cursor-pointer items-center rounded-lg px-3 outline-none data-[highlighted]:bg-accent/10"
                >
                  Take the tour
                </Menu.Item>
                <Menu.Item
                  onSelect={signOut}
                  className="flex min-h-[40px] cursor-pointer items-center rounded-lg px-3 outline-none data-[highlighted]:bg-accent/10"
                >
                  Sign out
                </Menu.Item>
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        )}
      </div>
    </header>
  );
}

export function Shell() {
  const { user } = useSession();
  const items = NAV[user?.role ?? 'student'];
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-void">
        Skip to content
      </a>
      <TopBar />
      <div className="flex">
        <Rail items={items} />
        <main id="main" className="min-w-0 flex-1 px-4 pb-32 pt-8 sm:px-8 lg:pb-24 lg:pl-10 lg:pr-12">
          <Outlet />
        </main>
      </div>
      <BottomNav items={items} />
      <Tour />
    </div>
  );
}
