// TanStack Query hooks, one per endpoint the screens use.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type * as T from './types';

export interface Page<I> {
  items: I[];
  page: number;
  page_size: number;
  total: number;
}
export type Lang = 'en' | 'ta' | 'hi';

const enabled = (...ids: (string | null | undefined)[]) => ids.every(Boolean);

/* ---------- identity and family ---------- */
export const useMe = (on = true) =>
  useQuery({ queryKey: ['me'], queryFn: () => api<T.UserOut>('/api/v1/auth/me'), enabled: on, retry: false });
export const useFamily = (on = true) =>
  useQuery({ queryKey: ['family'], queryFn: () => api<T.FamilyOut>('/api/v1/families/me'), enabled: on, retry: false });
export const useStudentProfile = (on = true) =>
  useQuery({ queryKey: ['student-profile'], queryFn: () => api<T.StudentProfileOut>('/api/v1/students/me/profile'), enabled: on });
export const useConsents = () => useQuery({ queryKey: ['consents'], queryFn: () => api<T.ConsentOut[]>('/api/v1/consents') });

export const useFinance = (familyId?: string | null) =>
  useQuery({
    queryKey: ['finance', familyId],
    queryFn: () => api<T.FamilyFinanceOut | T.FamilyFinanceSummary>(`/api/v1/families/${familyId}/finance`),
    enabled: enabled(familyId),
    retry: false,
  });
export const usePreferences = (familyId?: string | null, on = true) =>
  useQuery({
    queryKey: ['preferences', familyId],
    queryFn: () => api<T.ParentPreferencesOut>(`/api/v1/families/${familyId}/preferences`),
    enabled: on && enabled(familyId),
    retry: false,
  });

/* ---------- analysis ---------- */
export const useRuns = (on = true) =>
  useQuery({ queryKey: ['runs'], queryFn: () => api<Page<T.AnalysisRunSummary>>('/api/v1/analysis/runs'), enabled: on });
export const useRun = (runId?: string | null) =>
  useQuery({ queryKey: ['run', runId], queryFn: () => api<T.AnalysisRun>(`/api/v1/analysis/runs/${runId}`), enabled: enabled(runId) });
export const useNarrative = (runId: string | undefined, lang: Lang) =>
  useQuery({
    queryKey: ['narrative', runId, lang],
    queryFn: () => api<T.Narrative>(`/api/v1/analysis/runs/${runId}/narrative`, { query: { lang } }),
    enabled: enabled(runId),
    staleTime: Infinity,
  });
export const useConflict = (runId?: string) =>
  useQuery({ queryKey: ['conflict', runId], queryFn: () => api<T.ConflictReport>(`/api/v1/analysis/runs/${runId}/conflict`), enabled: enabled(runId) });
export const useRoadmap = (runId?: string, careerId?: string) =>
  useQuery({
    queryKey: ['roadmap', runId, careerId],
    queryFn: () => api<T.Roadmap>(`/api/v1/analysis/runs/${runId}/roadmap`, { query: { career_id: careerId } }),
    enabled: enabled(runId),
  });
export const useSwot = (runId?: string, careerId?: string) =>
  useQuery({
    queryKey: ['swot', runId, careerId],
    queryFn: () => api<T.SwotReport>(`/api/v1/analysis/runs/${runId}/swot`, { query: { career_id: careerId } }),
    enabled: enabled(runId),
  });

export function useCreateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) =>
      api<T.AnalysisRun>('/api/v1/analysis/runs', { method: 'POST', body: { student_id: studentId, options: { top_k: 10, include_sensitivity: true } } }),
    onSuccess: (run) => {
      qc.setQueryData(['run', run.run_id], run);
      qc.invalidateQueries({ queryKey: ['runs'] });
    },
  });
}
export const useWhatIf = (runId?: string) =>
  useMutation({
    mutationFn: (body: T.WhatIfRequest) => api<T.WhatIfResult>(`/api/v1/analysis/runs/${runId}/what-if`, { method: 'POST', body }),
  });

/* ---------- student data ---------- */
export const useTraits = (studentId?: string | null) =>
  useQuery({
    queryKey: ['traits', studentId],
    queryFn: () => api<T.TraitProfile>(`/api/v1/students/${studentId}/traits`),
    enabled: enabled(studentId),
    retry: false,
  });
export const useDeadlines = (studentId?: string | null) =>
  useQuery({
    queryKey: ['deadlines', studentId],
    queryFn: () => api<T.Deadlines>(`/api/v1/students/${studentId}/deadlines`, { query: { horizon_days: 400 } }),
    enabled: enabled(studentId),
  });
export const useMyReminders = () => useQuery({ queryKey: ['reminders'], queryFn: () => api<T.ReminderOut[]>('/api/v1/me/reminders') });
export const useOutcomes = (studentId?: string | null) =>
  useQuery({
    queryKey: ['outcomes', studentId],
    queryFn: () => api<T.OutcomeOut[]>(`/api/v1/students/${studentId}/outcomes`),
    enabled: enabled(studentId),
    retry: false,
  });

/* ---------- questionnaire ---------- */
export const useInstruments = () =>
  useQuery({ queryKey: ['instruments'], queryFn: () => api<T.Instrument[]>('/api/v1/assessments/instruments') });
export const useQuestions = (code?: string) =>
  useQuery({
    queryKey: ['questions', code],
    queryFn: () => api<T.Question[]>(`/api/v1/assessments/${code}/questions`),
    enabled: enabled(code),
    staleTime: Infinity,
  });

/* ---------- catalogue and public data ---------- */
export const useCareers = (q: { q?: string; sector?: string; steam_tag?: string }) =>
  useQuery({ queryKey: ['careers', q], queryFn: () => api<Page<T.CareerSummary>>('/api/v1/careers', { query: { ...q, page_size: 60 } }) });
export const useCareer = (idOrSlug?: string) =>
  useQuery({ queryKey: ['career', idOrSlug], queryFn: () => api<T.CareerDetail>(`/api/v1/careers/${idOrSlug}`), enabled: enabled(idOrSlug) });
export const useAlternatives = (idOrSlug?: string) =>
  useQuery({
    queryKey: ['alternatives', idOrSlug],
    queryFn: () => api<T.CareerAlternative[]>(`/api/v1/careers/${idOrSlug}/alternatives`),
    enabled: enabled(idOrSlug),
  });
export const useRegions = () => useQuery({ queryKey: ['regions'], queryFn: () => api<T.Region[]>('/api/v1/regions'), staleTime: Infinity });
export const useMarketTrends = (regionCode?: string, sector?: string) =>
  useQuery({
    queryKey: ['market', regionCode, sector],
    queryFn: () => api<T.MarketTrends>('/api/v1/market/trends', { query: { region_code: regionCode, sector } }),
  });
export const useLocalOpportunities = (pincode?: string) =>
  useQuery({
    queryKey: ['local', pincode],
    queryFn: () => api<T.LocalOpportunity[]>('/api/v1/local-opportunities', { query: { pincode } }),
    enabled: enabled(pincode),
  });
export const useMentors = (q: { pincode?: string; career_id?: string; region_code?: string }) =>
  useQuery({ queryKey: ['mentors', q], queryFn: () => api<T.MentorDirectory>('/api/v1/mentors', { query: q }) });
export const useLoanExplain = (q: { amount: number; course_years: number; annual_income?: number; institution_tier?: number; rate?: number }) =>
  useQuery({
    queryKey: ['loan', q],
    queryFn: () => api<T.LoanExplanation>('/api/v1/loans/explain', { query: q }),
    enabled: q.amount > 0,
    placeholderData: (prev) => prev,
  });

/* ---------- trust ---------- */
export const useDataStatus = () => useQuery({ queryKey: ['data-status'], queryFn: () => api<T.DataStatus>('/api/v1/system/data-status') });
export const useMethodology = () => useQuery({ queryKey: ['methodology'], queryFn: () => api<T.Methodology>('/api/v1/system/methodology') });
export const useFairness = () => useQuery({ queryKey: ['fairness'], queryFn: () => api<T.FairnessReport>('/api/v1/system/fairness') });

/* ---------- educator and admin ---------- */
export const useEducatorDashboard = () =>
  useQuery({ queryKey: ['educator'], queryFn: () => api<T.EducatorDashboard>('/api/v1/educator/dashboard') });
export const useAdminAnalytics = () =>
  useQuery({ queryKey: ['admin-analytics'], queryFn: () => api<T.AdminAnalytics>('/api/v1/admin/analytics') });
export const useOutcomeSummary = () =>
  useQuery({ queryKey: ['outcome-summary'], queryFn: () => api<T.OutcomeSummary>('/api/v1/admin/outcomes/summary') });

/* ---------- money help and dates ---------- */
export const useScholarships = (q: { eligible_only?: boolean; career_id?: string } = {}) =>
  useQuery({ queryKey: ['scholarships', q], queryFn: () => api<T.ScholarshipMatch[]>('/api/v1/scholarships', { query: q }) });
export const useExams = (q: { upcoming_only?: boolean; career_id?: string } = {}) =>
  useQuery({ queryKey: ['exams', q], queryFn: () => api<T.Exam[]>('/api/v1/exams', { query: q }) });
