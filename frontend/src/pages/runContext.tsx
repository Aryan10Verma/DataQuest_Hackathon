import { Link } from 'react-router-dom';
import { apiBlob } from '@/api/client';
import { useCreateRun, useRun } from '@/api/hooks';
import { useSession, useStudentContext } from '@/auth/session';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui';

/** The run the family screens show: the latest one for this student. */
export function useActiveRun() {
  const ctx = useStudentContext();
  const run = useRun(ctx.latestRunId);
  return { ...ctx, run };
}

/** Loading, error and "no run yet" states shared by every screen that needs a run. */
export function RunGate({ ctx, children }: { ctx: ReturnType<typeof useActiveRun>; children: React.ReactNode }) {
  const create = useCreateRun();
  if (ctx.loading || ctx.run.isLoading) return <PageSkeleton />;
  if (ctx.runs.isError) return <ErrorState error={ctx.runs.error} retry={() => ctx.runs.refetch()} />;
  if (ctx.run.isError) return <ErrorState error={ctx.run.error} retry={() => ctx.run.refetch()} />;
  if (!ctx.latestRunId) {
    const isStudent = ctx.role === 'student';
    return (
      <div className="grid gap-4">
        <EmptyState
          title="No results yet"
          body={
            isStudent
              ? 'Answer the questionnaire first. When it is done, run the analysis to see careers ranked for you and your family.'
              : 'Results appear after your child answers the questionnaire. You can add the family budget now, so the analysis can cost each path.'
          }
          action={
            <div className="flex flex-wrap gap-2">
              {isStudent ? (
                <Link to="/app/questionnaire" className="btn-primary">Open the questionnaire</Link>
              ) : (
                <Link to="/app/family/inputs" className="btn-primary">Add family budget</Link>
              )}
              {ctx.studentId && (
                <button className="btn-quiet" disabled={create.isPending} onClick={() => create.mutate(ctx.studentId!)}>
                  {create.isPending ? 'Running analysis…' : 'Run analysis'}
                </button>
              )}
            </div>
          }
        />
        {create.isError && <ErrorState error={create.error} />}
      </div>
    );
  }
  return <>{children}</>;
}

/** Opens the printable family report (HTML) in a new tab; it needs the auth header, so fetch → blob URL. */
export function useOpenReport() {
  const { lang } = useSession();
  return async (runId: string, reportLang?: 'en' | 'ta' | 'hi') => {
    const tab = window.open('', '_blank');
    try {
      const blob = await apiBlob(`/api/v1/analysis/runs/${runId}/report`, { lang: reportLang ?? lang });
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      tab?.close();
      throw e;
    }
  };
}
