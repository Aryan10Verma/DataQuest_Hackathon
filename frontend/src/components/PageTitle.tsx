// Names the browser tab after the page, so tabs, history and bookmarks say where you are.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const HOME = 'PRISM – See every path';

// Longest prefix wins, so "/app/questionnaire/place" beats "/app/questionnaire".
const TITLES: [string, string][] = [
  ['/signin', 'Sign in'],
  ['/register', 'Create account'],
  ['/how-we-know', 'How we know'],
  ['/app/home', 'Home'],
  ['/app/results/career', 'Career'],
  ['/app/results', 'Results'],
  ['/app/family/inputs', 'Family inputs'],
  ['/app/family', 'Family'],
  ['/app/what-if', 'What if?'],
  ['/app/questionnaire/place', 'Where you live'],
  ['/app/questionnaire', 'Questionnaire'],
  ['/app/profile', 'Profile'],
  ['/app/plan', 'Plan'],
  ['/app/loans', 'Loans'],
  ['/app/compare', 'Compare'],
  ['/app/scholarships', 'Scholarships'],
  ['/app/exams', 'Exam calendar'],
  ['/app/outcomes', 'What I chose'],
  ['/app/explore', 'Explore'],
  ['/app/trust', 'How we know'],
  ['/app/counsellor', 'Students'],
  ['/app/admin', 'Analytics'],
];

export function titleFor(path: string): string {
  if (path === '/') return HOME;
  const hit = TITLES.filter(([p]) => path === p || path.startsWith(`${p}/`)).sort((a, b) => b[0].length - a[0].length)[0];
  return `${hit ? hit[1] : 'Page not found'} – PRISM`;
}

export function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = titleFor(pathname);
  }, [pathname]);
  return null;
}
