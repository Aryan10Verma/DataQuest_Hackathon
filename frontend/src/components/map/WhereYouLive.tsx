// Change where you live: the picker plus a save button. Saving a new city clears the
// local-industry answers (the industries differ by city), so the questionnaire asks them again.
import { useEffect, useState } from 'react';
import { useSetLocation } from '@/api/hooks';
import { useSession } from '@/auth/session';
import { errorMessage } from '@/lib/errors';
import { LocationPicker, type Location } from './LocationPicker';

export function WhereYouLive({ onSaved, cta = 'Save where I live' }: { onSaved?: () => void; cta?: string }) {
  const { user, refreshUser } = useSession();
  const save = useSetLocation();
  const [where, setWhere] = useState<Location>({ region_code: user?.region_code ?? null, pincode: user?.pincode ?? '' });
  useEffect(() => setWhere({ region_code: user?.region_code ?? null, pincode: user?.pincode ?? '' }), [user?.region_code, user?.pincode]);
  const changed = where.region_code !== (user?.region_code ?? null) || where.pincode !== (user?.pincode ?? '');
  const pinOk = where.pincode === '' || where.pincode.length === 6;

  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!where.region_code) return;
        save.mutate(
          { region_code: where.region_code, pincode: where.pincode || null },
          { onSuccess: async () => { await refreshUser(); onSaved?.(); } },
        );
      }}
    >
      <LocationPicker value={where} onChange={setWhere} idPrefix="home" />
      {save.isError && <p role="alert" className="text-sm text-danger">{errorMessage(save.error)}</p>}
      {save.isSuccess && !changed && <p role="status" className="text-sm text-accent">Saved. Your next analysis starts from here.</p>}
      {!pinOk && <p className="text-sm text-danger">A pincode has 6 digits.</p>}
      <button className="btn-primary justify-self-start" disabled={!where.region_code || !pinOk || save.isPending || (!changed && !!user?.region_code && !onSaved)}>
        {save.isPending ? 'Saving…' : cta}
      </button>
    </form>
  );
}
