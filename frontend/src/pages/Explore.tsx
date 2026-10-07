import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useCareer, useCareers, useLocalOpportunities, useMarketTrends, useMentors, useRegions, useStudentProfile } from '@/api/hooks';
import type { MarketSignal } from '@/api/types';
import { useSession } from '@/auth/session';
import { EmptyState, ErrorState, PageHeader, ProvenanceBadge, Section, Skeleton } from '@/components/ui';
import { pct, SECTOR_LABEL, sectorLabel } from '@/lib/format';

const TABS = [
  { key: 'careers', label: 'Careers' },
  { key: 'market', label: 'Job market' },
  { key: 'local', label: 'Near you' },
  { key: 'mentors', label: 'Mentors' },
];

export default function Explore() {
  const [tab, setTab] = useState('careers');
  const { user } = useSession();
  const profile = useStudentProfile(user?.role === 'student');
  const pincode = profile.data?.pincode;
  const region = profile.data?.region_code ?? undefined;
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Explore" intro="Browse every career in the catalogue, see where jobs are growing, and find real problems to work on near you." />
      <Tabs.Root value={tab} onValueChange={setTab} className="min-w-0">
        <Tabs.List className="-mx-1 mb-8 flex gap-1 overflow-x-auto border-b border-line pb-px" aria-label="Explore">
          {TABS.map((t) => (
            <Tabs.Trigger key={t.key} value={t.key} className="relative min-h-[44px] shrink-0 px-3 text-sm text-muted data-[state=active]:text-ink hover:text-ink">
              {t.label}
              {tab === t.key && <motion.span layoutId="explore-tab" className="absolute inset-x-3 -bottom-px h-px bg-scan shadow-[0_0_8px_var(--glow)]" />}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="careers"><Careers /></Tabs.Content>
        <Tabs.Content value="market"><Market initialRegion={region} /></Tabs.Content>
        <Tabs.Content value="local"><Local initialPincode={pincode} /></Tabs.Content>
        <Tabs.Content value="mentors"><Mentors initialPincode={pincode} /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function Careers() {
  const [q, setQ] = useState('');
  const [sector, setSector] = useState('');
  const careers = useCareers({ q: q || undefined, sector: sector || undefined });
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px]">
        <label className="field"><span className="sr-only">Search careers</span>
          <input className="input" type="search" placeholder="Search, for example ‘drone’ or ‘doctor’" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="field"><span className="sr-only">Field</span>
          <select className="input" value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">All fields</option>
            {Object.entries(SECTOR_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      {careers.isLoading ? <Skeleton className="h-80" /> : careers.isError ? <ErrorState error={careers.error} retry={() => careers.refetch()} /> : (
        careers.data!.items.length === 0 ? <EmptyState title="No careers match" body="Try a broader word, or choose All fields." /> : (
          <ul className="grid gap-px overflow-hidden rounded-panel border border-line bg-line md:grid-cols-2">
            {careers.data!.items.map((c) => (
              <li key={c.id} className="bg-void">
                <button className="grid h-full w-full content-start gap-2 p-5 text-left transition-colors hover:bg-white/[0.02]" onClick={() => setOpen(c.slug)}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="display text-lg">{c.name}</span>
                    <span className="shrink-0 text-xs text-muted">{c.steam_tags?.join(' ')}</span>
                  </span>
                  <span className="text-xs text-muted">{sectorLabel(c.sector)}</span>
                  <span className="text-sm text-muted">{c.short_description}</span>
                  <span className="text-xs text-muted">
                    {c.national_demand_index != null && <>Demand {pct(c.national_demand_index)}, </>}automation risk {pct(c.automation_risk)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
      <CareerModal slug={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function CareerModal({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const c = useCareer(slug ?? undefined);
  return (
    <Dialog.Root open={!!slug} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 right-0 z-50 w-full max-w-[600px] overflow-y-auto border-l border-line bg-deep p-6 data-[state=open]:animate-[drawer-in_0.45s_var(--ease)] sm:p-10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <Dialog.Title className="display text-3xl">{c.data?.name ?? 'Career'}</Dialog.Title>
            <Dialog.Close className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-ink" aria-label="Close"><X size={18} /></Dialog.Close>
          </div>
          {c.isLoading ? <Skeleton className="h-64" /> : c.isError ? <ErrorState error={c.error} /> : c.data && (
            <div className="grid gap-8 text-sm">
              <p className="text-base text-muted">{c.data.long_description}</p>
              <p><span className="text-muted">Usual way in: </span>{c.data.typical_entry_education}</p>
              {(c.data.day_in_life?.length ?? 0) > 0 && (
                <Section title="A typical day"><ul className="grid gap-1.5 text-muted">{c.data.day_in_life!.map((d) => <li key={d}>{d}</li>)}</ul></Section>
              )}
              <Section title="Skills it needs">
                <ul className="grid gap-2">
                  {[...c.data.skills].sort((a, b) => b.importance - a.importance).slice(0, 8).map((s) => (
                    <li key={s.skill} className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3">
                      <span>{s.skill}</span>
                      <span className="h-1.5 rounded-full bg-white/[0.06]"><span className="block h-full rounded-full bg-scan" style={{ width: pct(s.importance) }} /></span>
                    </li>
                  ))}
                </ul>
              </Section>
              {c.data.related_exam_codes.length > 0 && <p><span className="text-muted">Entrance exams: </span>{c.data.related_exam_codes.join(', ')}</p>}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Market({ initialRegion }: { initialRegion?: string }) {
  const regions = useRegions();
  const [region, setRegion] = useState<string | undefined>(initialRegion);
  const m = useMarketTrends(region);
  const sectors = Object.entries((m.data?.sector_summary ?? {}) as Record<string, number>).sort((a, b) => b[1] - a[1]);
  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="field min-w-[260px]">Region
          <select className="input" value={region ?? ''} onChange={(e) => setRegion(e.target.value || undefined)}>
            <option value="">All of India</option>
            {regions.data?.map((r) => <option key={r.code} value={r.code}>{r.name}{r.state ? `, ${r.state}` : ''}</option>)}
          </select>
        </label>
        {m.data && (
          <p className="text-sm text-muted">
            {m.data.is_live ? 'Includes live job postings' : 'Snapshot'} for {m.data.period}, {m.data.region.name}. Not real-time.
          </p>
        )}
      </div>
      {m.isLoading ? <Skeleton className="h-72" /> : m.isError ? <ErrorState error={m.error} retry={() => m.refetch()} /> : m.data && (
        <>
          <Section title="Demand by field" aside={<span className="text-xs text-muted">0 to 100</span>}>
            <ul className="grid gap-3">
              {sectors.map(([k, v]) => (
                <li key={k} className="grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                  <span>{sectorLabel(k)}</span>
                  <span className="h-1.5 rounded-full bg-white/[0.06]"><span className="block h-full rounded-full bg-scan" style={{ width: pct(v) }} /></span>
                  <span className="text-right tabular-nums text-muted">{Math.round(v * 100)}</span>
                </li>
              ))}
            </ul>
          </Section>
          <div className="grid gap-10 md:grid-cols-2">
            <Signals title="Growing fastest" items={m.data.top_rising} />
            <Signals title="Most exposed to automation" items={m.data.most_disrupted} risk />
          </div>
        </>
      )}
    </div>
  );
}

function Signals({ title, items, risk = false }: { title: string; items: MarketSignal[]; risk?: boolean }) {
  return (
    <Section title={title}>
      <ul>
        {items.slice(0, 6).map((s) => (
          <li key={s.career.id + s.region_code} className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm">
            <span>{s.career.name}<span className="block text-xs text-muted">{risk ? `Automation risk ${pct(s.disruption_risk)}` : `Demand ${pct(s.demand_index)}, hiring ${s.job_velocity >= 0 ? '+' : ''}${pct(s.job_velocity)}`}</span></span>
            <ProvenanceBadge p={s.provenance} compact />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function PincodeForm({ value, onSubmit, label }: { value?: string; onSubmit: (v: string) => void; label: string }) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(String(new FormData(e.currentTarget).get('pin')).trim());
  };
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={submit}>
      <label className="field">{label}
        <input className="input w-[180px]" name="pin" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} defaultValue={value} placeholder="641004" required />
      </label>
      <button className="btn-quiet">Show</button>
    </form>
  );
}

function Local({ initialPincode }: { initialPincode?: string }) {
  const [pin, setPin] = useState<string | undefined>(initialPincode ?? '642001');
  const local = useLocalOpportunities(pin);
  return (
    <div className="grid gap-8">
      <p className="max-w-measure text-muted">Problems from your own district that need science, technology, engineering, art or maths. Each comes with a starter project you could begin this term.</p>
      <PincodeForm value={pin} onSubmit={setPin} label="Pincode" />
      {local.isLoading ? <Skeleton className="h-64" /> : local.isError ? <ErrorState error={local.error} retry={() => local.refetch()} /> : (
        local.data!.length === 0 ? <EmptyState title="Nothing listed for this pincode yet" body="Partner schools add local problems over time. Try a nearby pincode." /> : (
          <ul className="grid gap-4 md:grid-cols-2">
            {local.data!.map((o) => (
              <li key={o.id} className="panel grid content-start gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="display text-xl leading-snug">{o.title}</h3>
                  <ProvenanceBadge p={o.provenance} compact />
                </div>
                <p className="text-xs text-muted">{o.district}, {o.steam_tags.join(' ')}</p>
                <p className="text-sm text-muted">{o.problem_statement}</p>
                <p className="flex gap-2 rounded-lg border border-scan/30 p-3 text-sm">
                  <Lightbulb size={16} className="mt-0.5 shrink-0 text-scan" aria-hidden />
                  <span><span className="text-scan">Starter project: </span>{o.starter_project}</span>
                </p>
                <p className="text-xs text-muted">Careers it leads to: {o.linked_careers.map((c) => c.name).join(', ')}</p>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

function Mentors({ initialPincode }: { initialPincode?: string }) {
  const [pin, setPin] = useState<string | undefined>(initialPincode);
  const m = useMentors({ pincode: pin });
  return (
    <div className="grid gap-8">
      <p className="max-w-measure text-muted">People working in these careers who have agreed to talk to students. You reach them through your school counsellor, never directly.</p>
      <PincodeForm value={pin} onSubmit={setPin} label="Pincode" />
      {m.isLoading ? <Skeleton className="h-40" /> : m.isError ? <ErrorState error={m.error} retry={() => m.refetch()} /> : (
        m.data!.items.length === 0 ? <EmptyState title="No mentors listed here yet" body={m.data!.notice} /> : (
          <ul className="grid gap-4 md:grid-cols-2">
            {m.data!.items.map((x) => (
              <li key={x.id} className="panel grid gap-2 p-5 text-sm">
                <h3 className="display text-xl">{x.display_name}</h3>
                <p className="text-muted">{x.career.name}{x.organisation ? `, ${x.organisation}` : ''}. {x.district}</p>
                <p>{x.bio}</p>
                <p className="text-xs text-muted">Speaks {x.languages.join(', ')}. {x.contact}</p>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
