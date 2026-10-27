import React, { useEffect, useState } from 'react';
import { DATE_POSTED_OPTIONS, EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, JOB_CATEGORIES, WORK_TYPES } from '../../data/jobOptions';

export const DEFAULT_JOB_FILTERS = Object.freeze({
  workTypes: [],
  employmentTypes: [],
  experienceLevel: '',
  category: '',
  salaryMin: '',
  salaryMax: '',
  datePosted: 'any',
  minMatch: 0,
  hideUnmetRequirements: false,
});

export function countActiveFilters(filters) {
  return [
    filters.workTypes.length > 0,
    filters.employmentTypes.length > 0,
    Boolean(filters.experienceLevel),
    Boolean(filters.category),
    filters.salaryMin !== '' || filters.salaryMax !== '',
    filters.datePosted !== 'any',
    Number(filters.minMatch) > 0,
    filters.hideUnmetRequirements,
  ].filter(Boolean).length;
}

const toNumber = (value) => (value === '' || value === null || value === undefined ? null : Number(String(value).replace(/[,\s₱]/g, '')));

export function jobMatchesFilters(job, filters) {
  if (filters.workTypes.length && !filters.workTypes.includes(job.work_type)) return false;
  if (filters.employmentTypes.length && !filters.employmentTypes.includes(job.employment_type)) return false;
  if (filters.experienceLevel && job.experience_level !== filters.experienceLevel) return false;
  if (filters.category && job.job_category !== filters.category) return false;

  const wantMin = toNumber(filters.salaryMin);
  const wantMax = toNumber(filters.salaryMax);
  if (wantMin !== null || wantMax !== null) {
    const jobMin = toNumber(job.salary_min);
    const jobMax = toNumber(job.salary_max);
    if (jobMin === null && jobMax === null) return false;
    const low = jobMin ?? jobMax;
    const high = jobMax ?? jobMin;
    if (wantMin !== null && high < wantMin) return false;
    if (wantMax !== null && low > wantMax) return false;
  }

  const days = DATE_POSTED_OPTIONS.find((option) => option.value === filters.datePosted)?.days;
  if (days && (!job.created_at || Date.now() - new Date(job.created_at).getTime() > days * 86400000)) return false;

  if (Number(filters.minMatch) > 0) {
    if (job.match === null || job.match === undefined || Number(job.match) < Number(filters.minMatch)) return false;
  }

  if (filters.hideUnmetRequirements && job.matchAnalysis) {
    const unmet = (job.matchAnalysis.requirements || [])
      .some((row) => row.source === 'requirement' && row.status === 'missing');
    if (unmet) return false;
  }
  return true;
}

const Chevron = () => (
  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
    <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
  </div>
);

export const FilterModal = ({ onClose, isDarkMode = true, value = DEFAULT_JOB_FILTERS, onApply }) => {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  const set = (key, next) => setDraft((current) => ({ ...current, [key]: next }));
  const toggleIn = (key, item) => setDraft((current) => ({
    ...current,
    [key]: current[key].includes(item) ? current[key].filter((entry) => entry !== item) : [...current[key], item],
  }));

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const apply = () => {
    const min = toNumber(draft.salaryMin);
    const max = toNumber(draft.salaryMax);
    if ((min !== null && (!Number.isFinite(min) || min < 0)) || (max !== null && (!Number.isFinite(max) || max < 0))) {
      setError('Enter salaries as positive numbers.');
      return;
    }
    if (min !== null && max !== null && max < min) {
      setError('Maximum salary must be at least the minimum.');
      return;
    }
    onApply?.(draft);
    onClose();
  };

  const inputBg = isDarkMode ? 'bg-[#0a121c] border-[#1d2d3e] text-slate-200' : 'bg-white border-slate-300 text-slate-700';
  const labelColor = isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900';
  const fieldLabel = `block text-xs font-medium mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`;
  const checkbox = `w-4 h-4 rounded focus:ring-0 focus:ring-offset-0 ${isDarkMode ? 'bg-[#0a121c] border-[#223547] accent-[#2d6f54]' : 'bg-white border-slate-300 accent-emerald-600'}`;
  const select = `w-full border rounded-lg px-3.5 py-2 text-xs appearance-none focus:outline-none focus:border-[#ea6036] cursor-pointer pr-8 ${inputBg}`;
  const hint = `text-[11px] mt-1.5 leading-snug ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`;

  return (
    <div aria-labelledby="modal-headline" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200" role="dialog">
      <div className={`fixed inset-0 backdrop-blur-sm transition-opacity ${isDarkMode ? 'bg-[#04080e]/75' : 'bg-slate-900/30'}`} onClick={onClose}></div>

      <div className={`relative w-full max-w-4xl border rounded-2xl shadow-2xl overflow-hidden z-10 my-auto transform transition-all duration-200 ${isDarkMode ? 'bg-[#0d1622] border-[#1b2b3b]' : 'bg-white border-slate-200'}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-[#182635]' : 'border-slate-100'}`}>
          <h2 className={`font-sans text-base font-semibold tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`} id="modal-headline">Filters</h2>
          <button onClick={onClose} aria-label="Close filters" className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-[#1a2838]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`} type="button">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className={`text-xs font-semibold tracking-wider mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Standard filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-6">
                <fieldset>
                  <legend className={fieldLabel}>Workplace model</legend>
                  <div className="space-y-2">
                    {WORK_TYPES.map((model) => (
                      <label key={model} className={`flex items-center space-x-2.5 text-xs cursor-pointer select-none ${labelColor}`}>
                        <input type="checkbox" checked={draft.workTypes.includes(model)} onChange={() => toggleIn('workTypes', model)} className={checkbox} />
                        <span>{model}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="filter-experience" className={fieldLabel}>Experience level</label>
                  <div className="relative">
                    <select id="filter-experience" value={draft.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)} className={select}>
                      <option value="">Any level</option>
                      {EXPERIENCE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                    <Chevron />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="filter-category" className={fieldLabel}>Job category</label>
                  <div className="relative">
                    <select id="filter-category" value={draft.category} onChange={(e) => set('category', e.target.value)} className={select}>
                      <option value="">All categories</option>
                      {JOB_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <Chevron />
                  </div>
                </div>
                <div>
                  <span className={fieldLabel}>Salary range (monthly, ₱)</span>
                  <div className="flex items-center space-x-2">
                    <input type="number" min="0" inputMode="numeric" aria-label="Minimum monthly salary" value={draft.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-xs placeholder-slate-500 focus:outline-none focus:border-[#ea6036] ${inputBg}`} placeholder="Min" />
                    <span className="text-slate-500 text-xs">-</span>
                    <input type="number" min="0" inputMode="numeric" aria-label="Maximum monthly salary" value={draft.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-xs placeholder-slate-500 focus:outline-none focus:border-[#ea6036] ${inputBg}`} placeholder="Max" />
                  </div>
                  <p className={hint}>Jobs that don't list a salary are hidden while a salary is set.</p>
                </div>
              </div>

              <div className="space-y-6">
                <fieldset>
                  <legend className={fieldLabel}>Employment type</legend>
                  <div className="space-y-2">
                    {EMPLOYMENT_TYPES.map((type) => (
                      <label key={type} className={`flex items-center space-x-2.5 text-xs cursor-pointer select-none ${labelColor}`}>
                        <input type="checkbox" checked={draft.employmentTypes.includes(type)} onChange={() => toggleIn('employmentTypes', type)} className={checkbox} />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="filter-date" className={fieldLabel}>Date posted</label>
                  <div className="relative">
                    <select id="filter-date" value={draft.datePosted} onChange={(e) => set('datePosted', e.target.value)} className={select}>
                      {DATE_POSTED_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <Chevron />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`p-5 rounded-xl border space-y-4 ${isDarkMode ? 'border-[#1d3d34] bg-[#0c1a1a]/40' : 'border-emerald-200 bg-emerald-50/50'}`}>
            <h4 className="text-xs font-semibold text-[#4fa784] tracking-wide">AI-powered filters — the ResuMatch advantage</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-2">
                <label htmlFor="filter-match" className={`block text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Minimum match score threshold</label>
                <div className="flex items-baseline space-x-1.5">
                  <span className="font-serif text-2xl font-bold text-[#45a377]">{Number(draft.minMatch) > 0 ? `${draft.minMatch}%` : 'Any'}</span>
                  {Number(draft.minMatch) > 0 && <span className="text-xs text-slate-400">and above</span>}
                </div>
                <input id="filter-match" type="range" min="0" max="95" step="5" value={draft.minMatch} onChange={(e) => set('minMatch', Number(e.target.value))} className="w-full accent-[#2a684f] cursor-pointer" />
                <p className={hint}>Jobs without a match score yet are hidden while this is above 0.</p>
              </div>

              <div className="space-y-2">
                <span className={`block text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Missing requirement tolerance</span>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Hide jobs with unmet requirements</p>
                    <p className={`text-[11px] mt-0.5 leading-snug ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Hides jobs where the AI found no evidence on your resume for at least one listed requirement</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.hideUnmetRequirements}
                    aria-label="Hide jobs with unmet requirements"
                    onClick={() => set('hideUnmetRequirements', !draft.hideUnmetRequirements)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${draft.hideUnmetRequirements ? 'bg-[#2a684f]' : (isDarkMode ? 'bg-[#1a2838]' : 'bg-slate-300')}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${draft.hideUnmetRequirements ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {error && <p role="alert" className="text-xs font-medium text-red-500">{error}</p>}
        </div>

        <div className={`flex items-center justify-between px-6 py-4 border-t ${isDarkMode ? 'bg-[#0a121c]/80 border-[#182635]' : 'bg-slate-50 border-slate-200'}`}>
          <button onClick={() => { setDraft(DEFAULT_JOB_FILTERS); setError(''); }} className={`text-xs font-medium transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`} type="button">
            Clear all
          </button>
          <div className="flex items-center space-x-3">
            <button onClick={onClose} className={`px-4 py-2 text-xs font-medium transition-colors ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`} type="button">
              Cancel
            </button>
            <button onClick={apply} className="px-5 py-2 bg-[#ea6036] hover:bg-[#d8552e] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95" type="button">
              Apply filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
