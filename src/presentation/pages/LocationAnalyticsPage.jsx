import { useRef, useState } from 'react';
import { PIPELINE_STAGES } from '../../data/pipelineStages';
import { useApplicantLocations, useLocationGroups } from '../../hooks/useApplicantLocations';
import { LocationHeatmap } from '../components/LocationHeatmap';

const GROUP_OPTIONS = [
  { value: 'city', label: 'City' },
  { value: 'province', label: 'Province' },
  { value: 'region', label: 'Region' },
];
const DATE_OPTIONS = [
  { value: 0, label: 'All time' },
  { value: 90, label: 'Last 90 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 7, label: 'Last 7 days' },
];

/** Recruiter analytics: where applicants are located, as a heatmap and a ranked list. */
export default function LocationAnalyticsPage({ user, isDarkMode }) {
  const { applicants, jobs, loading, error, refetch } = useApplicantLocations(user?.id);
  const [jobId, setJobId] = useState('all');
  const [stage, setStage] = useState('all');
  const [days, setDays] = useState(0);
  const [groupBy, setGroupBy] = useState('city');
  const [showHeat, setShowHeat] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showUnmapped, setShowUnmapped] = useState(false);
  const mapRef = useRef(null);
  const { groups, unmapped, total, mapped } = useLocationGroups(applicants, { jobId, stage, days, groupBy });

  const card = `rounded-2xl border p-5 ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-white shadow-sm'}`;
  const heading = isDarkMode ? 'text-white' : 'text-slate-900';
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const select = `rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ea6036]/40 ${isDarkMode ? 'border-white/10 bg-[#0e1621] text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`;
  const unmappedCount = total - mapped;
  const top = groups[0];
  const filtersActive = jobId !== 'all' || stage !== 'all' || days !== 0;

  const stats = [
    { label: 'Applicants', value: total, hint: filtersActive ? 'Matching your filters' : 'Across all your jobs' },
    { label: { city: 'Cities', province: 'Provinces', region: 'Regions' }[groupBy], value: groups.length, hint: 'With at least one applicant' },
    { label: 'Top location', value: top ? top.name : '—', hint: top ? `${top.count} applicant${top.count === 1 ? '' : 's'} · ${Math.round(top.share * 100)}%` : 'No applicants yet', small: true },
    { label: 'Not on map', value: unmappedCount, hint: unmappedCount ? 'Location missing or not recognised' : 'Every applicant is mapped' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={`font-serif text-3xl font-bold ${heading}`}>Applicant locations</h1>
          <p className={`mt-1 text-sm ${muted}`}>See where your applicants are based and how they are spread across the Philippines.</p>
        </div>
        <button type="button" onClick={refetch} disabled={loading}
          className={`rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-60 ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      <section className={`${card} flex flex-wrap items-end gap-3`} aria-label="Filters">
        <label className={`flex flex-col gap-1 text-xs font-semibold ${muted}`}>
          Job
          <select value={jobId} onChange={(event) => setJobId(event.target.value)} className={`${select} min-w-[200px]`}>
            <option value="all">All jobs</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}{job.is_archived ? ' (archived)' : ''}</option>)}
          </select>
        </label>
        <label className={`flex flex-col gap-1 text-xs font-semibold ${muted}`}>
          Stage
          <select value={stage} onChange={(event) => setStage(event.target.value)} className={select}>
            <option value="all">All stages</option>
            {PIPELINE_STAGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className={`flex flex-col gap-1 text-xs font-semibold ${muted}`}>
          Applied
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} className={select}>
            {DATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <div className={`flex flex-col gap-1 text-xs font-semibold ${muted}`}>
          Group by
          <div className={`inline-flex rounded-xl border p-0.5 ${isDarkMode ? 'border-white/10 bg-[#0e1621]' : 'border-slate-200 bg-slate-100'}`} role="group" aria-label="Group applicants by">
            {GROUP_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => setGroupBy(option.value)} aria-pressed={groupBy === option.value}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${groupBy === option.value ? 'bg-[#ea6036] text-white' : isDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-white'}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {filtersActive && (
          <button type="button" onClick={() => { setJobId('all'); setStage('all'); setDays(0); }} className="mb-2 text-sm font-semibold text-[#ea6036] hover:underline">
            Clear filters
          </button>
        )}
      </section>

      {error ? (
        <div role="alert" className={`${card} text-sm ${muted}`}>
          <p>Unable to load applicant locations: {error}</p>
          <button type="button" onClick={refetch} className="mt-2 font-bold text-[#ea6036] hover:underline">Try again</button>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Summary">
            {stats.map((stat) => (
              <div key={stat.label} className={card}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>{stat.label}</p>
                <p className={`mt-2 truncate font-bold ${stat.small ? 'text-lg' : 'text-3xl'} ${heading}`} title={String(stat.value)}>{loading ? '…' : stat.value}</p>
                <p className={`mt-1 truncate text-xs ${muted}`}>{loading ? '' : stat.hint}</p>
              </div>
            ))}
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
            <section className={card} aria-label="Applicant heatmap">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h2 className={`text-lg font-bold ${heading}`}>Heatmap</h2>
                <label className={`ml-auto flex items-center gap-1.5 text-xs font-semibold ${muted}`}>
                  <input type="checkbox" checked={showHeat} onChange={(event) => setShowHeat(event.target.checked)} className="accent-[#ea6036]" /> Heat
                </label>
                <label className={`flex items-center gap-1.5 text-xs font-semibold ${muted}`}>
                  <input type="checkbox" checked={showMarkers} onChange={(event) => setShowMarkers(event.target.checked)} className="accent-[#ea6036]" /> Counts
                </label>
              </div>
              <LocationHeatmap ref={mapRef} groups={groups} isDarkMode={isDarkMode} showHeat={showHeat} showMarkers={showMarkers} />
              <p className={`mt-2 text-xs ${muted}`}>Click a bubble for details. Click the map first to zoom with your mouse wheel.</p>
            </section>

            <section className={card} aria-label="Applicants by location">
              <h2 className={`mb-1 text-lg font-bold ${heading}`}>Applicants by {groupBy}</h2>
              <p className={`mb-4 text-xs ${muted}`}>Largest first. "Last 30 days" shows recent applications.</p>
              {loading ? (
                <p className={`text-sm ${muted}`}>Loading…</p>
              ) : groups.length === 0 ? (
                <p className={`rounded-xl p-4 text-sm ${isDarkMode ? 'bg-[#0e1621] text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                  {total === 0 ? 'No applicants match these filters yet.' : 'None of these applicants has a location we can map yet.'}
                </p>
              ) : (
                <ol className="max-h-[440px] space-y-1 overflow-y-auto pr-1">
                  {groups.map((group, index) => (
                    <li key={group.key}>
                      <button type="button" onClick={() => mapRef.current?.focus(group.key)}
                        className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-baseline gap-2">
                          <span className={`w-5 shrink-0 text-xs font-bold ${muted}`}>{index + 1}</span>
                          <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${heading}`}>{group.name}</span>
                          <span className={`text-sm font-bold ${heading}`}>{group.count}</span>
                          <span className={`w-10 text-right text-xs ${muted}`}>{Math.round(group.share * 100)}%</span>
                        </div>
                        <div className="ml-7 mt-1.5 flex items-center gap-2">
                          <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}>
                            <div className="h-full rounded-full bg-[#ea6036]" style={{ width: `${Math.max(4, group.share * 100)}%` }} />
                          </div>
                          <span className={`whitespace-nowrap text-[11px] ${muted}`}>{group.recent} last 30 days</span>
                        </div>
                        <p className={`ml-7 mt-0.5 truncate text-[11px] ${muted}`}>{group.detail}</p>
                      </button>
                    </li>
                  ))}
                </ol>
              )}

              {unmapped.length > 0 && (
                <div className={`mt-4 border-t pt-3 ${isDarkMode ? 'border-white/10' : 'border-slate-100'}`}>
                  <button type="button" onClick={() => setShowUnmapped((value) => !value)} aria-expanded={showUnmapped}
                    className="text-sm font-semibold text-[#ea6036] hover:underline">
                    {showUnmapped ? 'Hide' : 'Show'} {unmappedCount} applicant{unmappedCount === 1 ? '' : 's'} not on the map
                  </button>
                  {showUnmapped && (
                    <>
                      <ul className={`mt-3 space-y-3 text-xs ${muted}`}>
                        {unmapped.map((item) => (
                          <li key={item.label}>
                            <div className="flex justify-between gap-3 font-semibold">
                              <span className="truncate">{item.label}</span><span>{item.count}</span>
                            </div>
                            <ul className="mt-1 space-y-1.5">
                              {item.applicants.map((applicant) => (
                                <li key={applicant.id} className={`rounded-lg px-3 py-2 ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                                  <span className={`block font-semibold ${heading}`}>{applicant.name}</span>
                                  <span className="block truncate">{applicant.jobTitle}{applicant.email ? ` · ${applicant.email}` : ''}</span>
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                      <p className={`mt-3 text-xs italic ${muted}`}>Applicants need a recognised Philippine location to appear on the map.</p>
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
