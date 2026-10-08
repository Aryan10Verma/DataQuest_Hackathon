import * as Dialog from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { motion } from 'framer-motion';
import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
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
interface Tool extends Item {
  /** One line under the name in the Tools panel. */
  help: string;
}

const T: Record<string, Tool> = {
  whatIf: { to: '/app/what-if', label: 'What if?', help: 'Change the budget, watch the ranking move' },
  compare: { to: '/app/compare', label: 'Compare', help: 'Three careers side by side' },
  scholarships: { to: '/app/scholarships', label: 'Scholarships', help: 'Money you could get, rule by rule' },
  loans: { to: '/app/loans', label: 'Loans', help: 'What a loan really costs each month' },
  exams: { to: '/app/exams', label: 'Exam calendar', help: 'Entrance exams and deadlines' },
  outcomes: { to: '/app/outcomes', label: 'What I chose', help: 'Tell us what really happened' },
  trust: { to: '/app/trust', label: 'How we know', help: 'Where every number comes from' },
};

/** The main path sits in the bar; everything else lives in the Tools panel. */
const NAV: Record<Role, { main: Item[]; tools: Tool[] }> = {
  student: {
    main: [
      { to: '/app/home', label: 'Home' },
      { to: '/app/questionnaire', label: 'Questionnaire' },
      { to: '/app/results', label: 'Results' },
      { to: '/app/plan', label: 'Plan' },
      { to: '/app/family', label: 'Family' },
      { to: '/app/explore', label: 'Explore' },
    ],
    tools: [T.whatIf, T.compare, T.scholarships, T.loans, T.exams, T.outcomes, T.trust],
  },
  parent: {
    main: [
      { to: '/app/home', label: 'Home' },
      { to: '/app/results', label: 'Results' },
      { to: '/app/plan', label: 'Plan' },
      { to: '/app/family', label: 'Family' },
      { to: '/app/explore', label: 'Explore' },
    ],
    tools: [T.whatIf, T.compare, T.scholarships, T.loans, T.exams, T.outcomes, T.trust],
  },
  educator: {
    main: [
      { to: '/app/counsellor', label: 'Students' },
      { to: '/app/explore', label: 'Explore' },
    ],
    tools: [T.scholarships, T.loans, T.exams, T.trust],
  },
  admin: {
    main: [{ to: '/app/admin', label: 'Analytics' }],
    tools: [T.trust],
  },
};

const PROFILE: Partial<Record<Role, string>> = { student: 'My profile', parent: "Child's profile" };
const ROLE_LABEL: Record<Role, string> = { student: 'Student', parent: 'Parent', educator: 'Counsellor', admin: 'Administrator' };
const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ta', label: 'தமிழ்' },
  { value: 'hi', label: 'हिन्दी' },
];

/** The tour finds each link by its last path segment, e.g. /app/exams → exams. */
const tourId = (to: string) => to.split('/').pop();
const under = (path: string, to: string) => path === to || path.startsWith(`${to}/`);
const UNDERLINE = 'absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-claret shadow-[0_0_12px_rgba(184,67,94,0.9)]';

function MainLinks({ items }: { items: Item[] }) {
  const loc = useLocation();
  return (
    <ul className="flex items-center gap-1">
      {items.map((it) => {
        const active = under(loc.pathname, it.to);
        return (
          <li key={it.to} className="relative">
            <NavLink
              to={it.to}
              data-tour={tourId(it.to)}
              className={`flex h-[72px] items-center px-3 text-sm transition-colors duration-300 ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}
            >
              {it.label}
            </NavLink>
            {active && (
              // One underline that glides between items as the page changes.
              <motion.span layoutId="nav-underline" aria-hidden className={UNDERLINE}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ToolsMenu({ tools }: { tools: Tool[] }) {
  const loc = useLocation();
  const active = tools.some((t) => under(loc.pathname, t.to));
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        data-tour="more"
        className={`group relative flex h-[72px] items-center gap-1.5 px-3 text-sm outline-none transition-colors duration-300 ${active ? 'text-ink' : 'text-muted hover:text-ink data-[state=open]:text-ink'}`}
      >
        Tools
        <ChevronDown size={14} aria-hidden className="transition-transform duration-300 group-data-[state=open]:rotate-180" />
        {active && (
          <motion.span layoutId="nav-underline" aria-hidden className={UNDERLINE}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }} />
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="center"
          sideOffset={6}
          className="tools-panel z-50 grid w-[600px] grid-cols-2 content-start gap-1 rounded-panel border border-line bg-deep/95 p-3 backdrop-blur-xl"
        >
          {tools.map((t) => (
            <Menu.Item key={t.to} asChild>
              <Link
                to={t.to}
                data-tour={tourId(t.to)}
                className={`grid gap-0.5 rounded-xl px-4 py-3 outline-none transition-colors data-[highlighted]:bg-glow/10 ${under(loc.pathname, t.to) ? 'bg-claret/15' : ''}`}
              >
                <span className="text-sm text-ink">{t.label}</span>
                <span className="text-xs text-muted">{t.help}</span>
              </Link>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

function LangSelect({ id }: { id: string }) {
  const { lang, setLang } = useSession();
  return (
    <>
      <label className="sr-only" htmlFor={id}>Language for summaries and reports</label>
      <select
        id={id}
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
    </>
  );
}

function Account() {
  const { user, signOut } = useSession();
  if (!user) return null;
  const profile = PROFILE[user.role];
  const item = 'flex min-h-[40px] cursor-pointer items-center rounded-lg px-3 outline-none data-[highlighted]:bg-glow/10';
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger data-tour="account" className="flex min-h-[40px] items-center gap-2 rounded-full border border-line px-2.5 text-sm transition-colors hover:border-accent xl:px-3">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-claret/25 text-xs text-accent" aria-hidden>
          {user.full_name.charAt(0)}
        </span>
        <span className="hidden max-w-[140px] truncate xl:inline">{user.full_name}</span>
        <ChevronDown size={14} aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={8} className="z-50 min-w-[230px] rounded-panel border border-line bg-deep/95 p-2 text-sm backdrop-blur-xl">
          <div className="px-3 py-2">
            <p className="font-semibold">{user.full_name}</p>
            <p className="text-xs text-muted">{ROLE_LABEL[user.role]}, {user.email}</p>
          </div>
          <Menu.Separator className="my-1 h-px bg-line" />
          {profile && (
            <Menu.Item asChild>
              <Link to="/app/profile" data-tour="profile" className={item}>{profile}</Link>
            </Menu.Item>
          )}
          <Menu.Item onSelect={startTour} className={item}>Take the tour</Menu.Item>
          <Menu.Item onSelect={signOut} className={item}>Sign out</Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** Phones and small tablets: everything in one full-screen sheet. */
function PhoneMenu({ main, tools }: { main: Item[]; tools: Tool[] }) {
  const [open, setOpen] = useState(false);
  const { user } = useSession();
  const profile = user ? PROFILE[user.role] : undefined;
  const all = profile ? [...main, { to: '/app/profile', label: profile }] : main;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger data-tour="more" className="grid h-11 w-11 place-items-center rounded-full border border-line text-ink lg:hidden" aria-label="Open menu">
        <MenuIcon size={18} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-void/80 backdrop-blur-md" />
        <Dialog.Content className="sheet-in fixed inset-0 z-50 overflow-y-auto bg-void/95 px-6 pb-12 pt-5">
          <div className="mb-8 flex items-center justify-between">
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <Logo />
            <Dialog.Close className="grid h-11 w-11 place-items-center rounded-full border border-line text-muted hover:text-ink" aria-label="Close menu">
              <X size={18} />
            </Dialog.Close>
          </div>
          <ul className="grid gap-1">
            {all.map((it) => (
              <li key={it.to}>
                <NavLink to={it.to} onClick={() => setOpen(false)}
                  className={({ isActive }) => `display flex min-h-[52px] items-center text-2xl ${isActive ? 'text-accent' : 'text-ink'}`}>
                  {it.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <p className="mb-3 mt-10 text-xs text-muted">Tools</p>
          <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {tools.map((t) => (
              <li key={t.to}>
                <NavLink to={t.to} onClick={() => setOpen(false)} className="grid min-h-[56px] content-center gap-0.5 border-t border-line py-2">
                  <span className="text-base">{t.label}</span>
                  <span className="text-xs text-muted">{t.help}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-10"><LangSelect id="lang-phone" /></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TopBar({ main, tools }: { main: Item[]; tools: Tool[] }) {
  return (
    <header className="topbar sticky top-0 z-30 border-b border-line bg-void/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-6 px-4 sm:px-8 lg:px-12">
        <Logo />
        <nav aria-label="Main" className="hidden flex-1 justify-center lg:flex">
          <div className="flex items-center">
            <MainLinks items={main} />
            {tools.length > 0 && <ToolsMenu tools={tools} />}
          </div>
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <div className="hidden lg:block"><LangSelect id="lang" /></div>
          <Account />
          <PhoneMenu main={main} tools={tools} />
        </div>
      </div>
    </header>
  );
}

export function Shell() {
  const { user } = useSession();
  const { main, tools } = NAV[user?.role ?? 'student'];
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-void">
        Skip to content
      </a>
      <TopBar main={main} tools={tools} />
      <main id="main" className="mx-auto min-w-0 max-w-[1440px] px-4 pb-24 pt-10 sm:px-8 lg:px-12">
        <Outlet />
      </main>
      <Tour />
    </div>
  );
}
