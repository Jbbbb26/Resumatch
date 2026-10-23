/**
 * @typedef {Object} JobListing
 * @property {string} id
 * @property {string} title
 * @property {string|null} location
 * @property {string|null} work_type
 * @property {string|null} employment_type
 * @property {string} created_at
 * @property {'open'|'closed'} [hiring_status]
 * @property {boolean} [is_archived]
 * @property {string|null} [archived_at]
 * @property {string|null} [closed_at]
 */

const formatPostedDate = (createdAt) => `Posted ${new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

/** @param {{ job: JobListing, applicantCount: number, topMatch: string, isDarkMode: boolean, isPending: boolean, onReview: (job: JobListing) => void, onEdit: (job: JobListing) => void, onArchive: (job: JobListing) => void, onRestore: (job: JobListing) => void, onToggleHiring: (job: JobListing) => void }} props */
export function JobListingItem({
  job,
  applicantCount,
  topMatch,
  isDarkMode,
  isPending,
  onReview,
  onEdit,
  onArchive,
  onRestore,
  onToggleHiring,
}) {
  const isArchived = Boolean(job.is_archived);
  const isOpen = (job.hiring_status || 'open') === 'open';
  const badgeClass = isArchived
    ? (isDarkMode ? 'bg-amber-400/10 text-amber-300' : 'bg-amber-50 text-amber-700')
    : isOpen
      ? (isDarkMode ? 'bg-[#4fa784]/15 text-[#4fa784]' : 'bg-emerald-50 text-emerald-700')
      : (isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500');
  const actionBtn = `rounded-xl border px-4 py-2 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036] ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-[#1a2636]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`;

  return (
    <article className={`flex flex-wrap items-center justify-between gap-5 border-b py-5 last:border-0 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
      <div className="min-w-0">
        <div className={`flex flex-wrap items-center gap-3 text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {job.title}
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${badgeClass}`}>
            {isArchived ? 'ARCHIVED' : isOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
        <div className={`mt-1.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {job.location || 'Location not specified'} - {job.work_type || 'Work type not specified'} - {job.employment_type || 'Employment type not specified'} - {formatPostedDate(job.created_at)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          role="switch"
          aria-label="Hiring"
          aria-checked={isOpen}
          aria-describedby={`hiring-label-${job.id}`}
          disabled={isArchived || isPending}
          onClick={() => onToggleHiring(job)}
          className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036] disabled:cursor-not-allowed disabled:opacity-50 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}
        >
          <span id={`hiring-label-${job.id}`}>Hiring</span>
          <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isOpen ? 'bg-[#4fa784]' : (isDarkMode ? 'bg-slate-600' : 'bg-slate-300')}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isOpen ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </span>
        </button>
        <div className="text-center">
          <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{applicantCount}</div>
          <div className={`text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>applicants</div>
        </div>
        <div className="text-center">
          <div className={`text-xl font-bold ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>{topMatch}</div>
          <div className={`text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>top match</div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onReview(job)} className={actionBtn}>Review</button>
          <button type="button" onClick={() => onEdit(job)} className={actionBtn}>Edit</button>
          {isArchived ? (
            <button type="button" onClick={() => onRestore(job)} disabled={isPending} className={actionBtn} aria-label={`Restore ${job.title}`}>Restore</button>
          ) : (
            <button
              type="button"
              onClick={() => onArchive(job)}
              disabled={isPending}
              aria-label={`Archive ${job.title}`}
              className={`rounded-xl border px-4 py-2 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-wait disabled:opacity-60 ${isDarkMode ? 'border-red-900/50 text-red-400 hover:bg-red-900/20' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
            >
              Archive
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
