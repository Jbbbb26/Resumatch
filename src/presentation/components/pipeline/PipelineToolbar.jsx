export function PipelineToolbar({ jobs, filters, onFilterChange, isDarkMode }) {
  const inputClass = `rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#ea6036] focus-visible:ring-2 focus-visible:ring-[#ea6036]/30 ${isDarkMode ? 'border-white/10 bg-[#0a121c] text-white' : 'border-slate-300 bg-white text-slate-900'}`;
  return (
    <div className={`mb-5 flex flex-wrap items-end gap-3 rounded-2xl border p-4 ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-white shadow-sm'}`}>
      <label className="flex min-w-[190px] flex-1 flex-col gap-1.5">
        <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Job listing</span>
        <select value={filters.jobId} onChange={(event) => onFilterChange('jobId', event.target.value)} className={inputClass}>
          <option value="all">All jobs</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}{job.hiring_status === 'closed' ? ' (Closed)' : ''}{job.is_archived ? ' (Archived)' : ''}</option>)}
        </select>
      </label>
      <label className="flex min-w-[220px] flex-[2] flex-col gap-1.5">
        <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Candidate search</span>
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onFilterChange('search', event.target.value)}
          placeholder="Name or email"
          className={inputClass}
        />
      </label>
      <label className="flex min-w-[130px] flex-1 flex-col gap-1.5">
        <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Minimum match</span>
        <select value={filters.minMatch} onChange={(event) => onFilterChange('minMatch', Number(event.target.value))} className={inputClass}>
          <option value={0}>Any</option>
          <option value={50}>50%+</option>
          <option value={70}>70%+</option>
          <option value={85}>85%+</option>
        </select>
      </label>
      <label className={`flex items-center gap-2 px-1 py-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
        <input
          type="checkbox"
          checked={filters.showArchived}
          onChange={(event) => onFilterChange('showArchived', event.target.checked)}
          className="h-4 w-4 rounded accent-[#ea6036] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]"
        />
        Show archived
      </label>
    </div>
  );
}
