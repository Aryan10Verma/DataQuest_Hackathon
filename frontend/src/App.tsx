import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { Role } from '@/api/client';
import { homeFor, useSession } from '@/auth/session';
import { PageSkeleton } from '@/components/ui';
import { Shell } from '@/shell/Shell';

const Landing = lazy(() => import('@/landing/Landing'));
const SignIn = lazy(() => import('@/pages/SignIn'));
const Register = lazy(() => import('@/pages/Register'));
const Home = lazy(() => import('@/pages/Home'));
const Results = lazy(() => import('@/pages/Results'));
const FamilyTalk = lazy(() => import('@/pages/FamilyTalk'));
const FamilyInputs = lazy(() => import('@/pages/FamilyInputs'));
const WhatIf = lazy(() => import('@/pages/WhatIf'));
const Trust = lazy(() => import('@/pages/Trust'));
const Questionnaire = lazy(() => import('@/pages/Questionnaire'));
const Player = lazy(() => import('@/pages/Player'));
const Profile = lazy(() => import('@/pages/Profile'));
const Plan = lazy(() => import('@/pages/Plan'));
const Loans = lazy(() => import('@/pages/Loans'));
const Counsellor = lazy(() => import('@/pages/Counsellor'));
const Explore = lazy(() => import('@/pages/Explore'));
const Admin = lazy(() => import('@/pages/Admin'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const PublicTrust = lazy(() => import('@/pages/Trust').then((m) => ({ default: m.PublicTrust })));

// Developer tools are compiled in only when VITE_DEV_TOOLS=true; otherwise this import is dropped.
const DevTools = import.meta.env.VITE_DEV_TOOLS === 'true' ? lazy(() => import('@/devtools/DevTools')) : null;
const Presenter = import.meta.env.VITE_DEV_TOOLS === 'true' ? lazy(() => import('@/devtools/Presenter')) : null;

function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { status, user } = useSession();
  const loc = useLocation();
  if (status === 'loading') return <div className="p-10"><PageSkeleton /></div>;
  if (status === 'signed-out') return <Navigate to="/signin" replace state={{ from: loc.pathname }} />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

function AppHome() {
  const { user } = useSession();
  return <Navigate to={user ? homeFor(user.role) : '/signin'} replace />;
}

const FAMILY: Role[] = ['student', 'parent'];

export default function App() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-void" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/register" element={<Register />} />
          <Route path="/how-we-know" element={<PublicTrust />} />
          <Route path="/app/questionnaire/:code" element={<RequireAuth roles={['student']}><Player /></RequireAuth>} />
          <Route path="/app" element={<RequireAuth><Shell /></RequireAuth>}>
            <Route index element={<AppHome />} />
            <Route path="home" element={<RequireAuth roles={FAMILY}><Home /></RequireAuth>} />
            <Route path="results" element={<RequireAuth roles={FAMILY}><Results /></RequireAuth>} />
            <Route path="results/career/:careerId" element={<RequireAuth roles={FAMILY}><Results /></RequireAuth>} />
            <Route path="family" element={<RequireAuth roles={FAMILY}><FamilyTalk /></RequireAuth>} />
            <Route path="family/inputs" element={<RequireAuth roles={['parent']}><FamilyInputs /></RequireAuth>} />
            <Route path="what-if" element={<RequireAuth roles={FAMILY}><WhatIf /></RequireAuth>} />
            <Route path="questionnaire" element={<RequireAuth roles={['student']}><Questionnaire /></RequireAuth>} />
            <Route path="profile" element={<RequireAuth roles={FAMILY}><Profile /></RequireAuth>} />
            <Route path="plan" element={<RequireAuth roles={FAMILY}><Plan /></RequireAuth>} />
            <Route path="loans" element={<Loans />} />
            <Route path="explore" element={<Explore />} />
            <Route path="trust" element={<Trust />} />
            <Route path="counsellor" element={<RequireAuth roles={['educator']}><Counsellor /></RequireAuth>} />
            <Route path="counsellor/:runId" element={<RequireAuth roles={['educator']}><Counsellor /></RequireAuth>} />
            <Route path="counsellor/:runId/career/:careerId" element={<RequireAuth roles={['educator']}><Counsellor /></RequireAuth>} />
            <Route path="admin" element={<RequireAuth roles={['admin']}><Admin /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Route>
          {import.meta.env.VITE_DEV_TOOLS === 'true' && Presenter && <Route path="/presenter" element={<Presenter />} />}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {import.meta.env.VITE_DEV_TOOLS === 'true' && DevTools && (
        <Suspense fallback={null}>
          <DevTools />
        </Suspense>
      )}
    </>
  );
}
