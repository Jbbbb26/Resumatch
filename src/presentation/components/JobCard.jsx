import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useJobAttachments } from '../../hooks/useJobAttachments';
import { useApplyToJob } from '../../hooks/useApplyToJob';
import { useSavedJob } from '../../hooks/useSavedJob';
import { ApplicationFormModal } from './ApplicationFormModal';
import { AttachmentList } from './AttachmentList';
import { JobDescription } from './JobDescription';
import { KeywordChips } from './KeywordChips';

const REAPPLY_COOLDOWN_DAYS = 30;
const formatDay = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function getApplyState(application) {
  if (!application) return { kind: 'new' };
  if (application.status === 'Rejected') {
    const decidedAt = new Date(application.statusUpdatedAt || application.appliedAt);
    const availableAt = new Date(decidedAt.getTime() + REAPPLY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    return Date.now() >= availableAt.getTime() ? { kind: 'reapply' } : { kind: 'cooldown', availableAt };
  }
  return { kind: 'applied', status: application.status || 'Applied' };
}

const appliedLabel = (status) => ({ Interview: 'Applied · Interview stage', Hired: 'Hired' }[status] || 'Applied');

export function JobCard({ job, profile, savedRecord, onSavedChange, isDarkMode, userId, application, onApplied, onApplySuccess }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplicationOpen, setApplicationOpen] = useState(false);
  const [justApplied, setJustApplied] = useState(false);
  const [appliedApplication, setAppliedApplication] = useState(null);
  const { attachments, isLoading: attachmentsLoading, error: attachmentsError, getDownloadUrl } = useJobAttachments(job.id, userId, isExpanded);
  const { isSaved, isLoading: savedLoading, error: savedError, toggle: toggleSaved } = useSavedJob({
    jobId: job.id,
    userId,
    initialSaved: savedRecord,
    onChange: onSavedChange,
  });
  const { apply, isSubmitting: isApplying, error: applyError } = useApplyToJob({
    job,
    userId,
    onSuccess: (data) => {
      setJustApplied(true);
      setAppliedApplication({
        status: 'Applied',
        appliedAt: data?.applied_at || new Date().toISOString(),
        statusUpdatedAt: data?.status_updated_at || new Date().toISOString(),
      });
      setApplicationOpen(false);
      onApplySuccess?.();
      onApplied?.();
    },
  });

  const applyState = justApplied && !appliedApplication ? { kind: 'applied', status: 'Applied' } : getApplyState(appliedApplication || application);
  const isHiringOpen = (job.hiring_status || 'open') === 'open' && !job.is_archived;
  const canApply = isHiringOpen && (applyState.kind === 'new' || applyState.kind === 'reapply');
  const jobUrl = `/candidate-dashboard/jobs/${job.id}`;

  const handleDownload = async (attachment) => {
    const downloadWindow = window.open('about:blank', '_blank');
    const signedUrl = await getDownloadUrl(attachment.file_path);
    if (!signedUrl) {
      downloadWindow?.close();
      return false;
    }
    if (!downloadWindow) return false;
    downloadWindow.opener = null;
    downloadWindow.location = signedUrl;
    return true;
  };

  const toggleExpanded = () => setIsExpanded((expanded) => !expanded);

  return (
    <article className={`overflow-hidden rounded-2xl border transition-all duration-200 ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-white shadow-sm'}`}>
      <div
        onClick={toggleExpanded}
        className={`group flex cursor-pointer items-center justify-between gap-4 p-5 ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
      >
        <div className="min-w-0 flex-1">
          <h3 className={`text-base font-bold transition-colors group-hover:text-[#ea6036] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
          <p className={`mt-1 flex flex-wrap items-center gap-1.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{job.company_name}</span>
            <span>—</span><span>{job.location || 'Location not specified'}</span>
            {job.work_type && <><span>—</span><span className="font-semibold">{job.work_type}</span></>}
          </p>
          {!isExpanded && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {!isHiringOpen && <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Not hiring</span>}
              {applyState.kind !== 'new' && <span className="rounded bg-[#4fa784]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4fa784]">{applyState.kind === 'applied' ? appliedLabel(applyState.status) : applyState.kind === 'reapply' ? 'Can re-apply' : 'Not selected'}</span>}
              {job.employment_type && <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-[#1a2636] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{job.employment_type}</span>}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link to={jobUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} aria-label={`Open details for ${job.title} in a new tab`} className={`rounded-lg p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036] ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </Link>
          <div className={`rounded-xl border px-3 py-1.5 text-center ${isDarkMode ? 'border-[#1b4332] bg-[#0c1a1a]/40' : 'border-emerald-200 bg-emerald-50/50'}`}>
            <span className="block text-base font-bold leading-none text-[#4fa784]">{job.match != null ? `${job.match}%` : '—'}</span>
            <span className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-emerald-700/60'}`}>match score</span>
          </div>
          <button type="button" aria-label={isExpanded ? `Collapse ${job.title}` : `Expand ${job.title}`} aria-expanded={isExpanded} onClick={(event) => { event.stopPropagation(); toggleExpanded(); }} className={`rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <svg className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={`space-y-5 border-t px-5 pb-5 pt-4 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
          <div className={`flex flex-wrap gap-x-5 gap-y-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {job.employment_type && <span>Employment: <strong>{job.employment_type}</strong></span>}
            {job.created_at && <span>Posted {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
            <span className={`font-bold uppercase ${isHiringOpen ? 'text-emerald-600' : 'text-slate-500'}`}>{isHiringOpen ? 'Open' : 'Not hiring'}</span>
          </div>
          <JobDescription text={job.description} isDarkMode={isDarkMode} />
          <JobDescription text={job.requirements} isDarkMode={isDarkMode} label="Requirements" />
          <KeywordChips job={job} profile={profile} isDarkMode={isDarkMode} />
          <AttachmentList attachments={attachments} isLoading={attachmentsLoading} error={attachmentsError} isDarkMode={isDarkMode} onDownload={handleDownload} />

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="button" onClick={() => setApplicationOpen(true)} disabled={isApplying || !canApply} className={`rounded-lg px-4 py-2 text-xs font-bold shadow-sm transition-all disabled:cursor-not-allowed ${!canApply ? (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500') : 'bg-[#4fa784] text-white hover:bg-[#3d8c6d]'}`}>
              {isApplying ? 'Submitting…' : applyState.kind === 'applied' ? appliedLabel(applyState.status) : applyState.kind === 'cooldown' ? `Re-apply from ${formatDay(applyState.availableAt)}` : applyState.kind === 'reapply' ? 'Re-apply' : !isHiringOpen ? 'Not hiring' : 'Apply'}
            </button>
            <button type="button" onClick={toggleSaved} disabled={savedLoading} className={`rounded-lg border px-4 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-[#1a2636]' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>{isSaved ? 'Remove from saved' : 'Save for later'}</button>
            <Link to={jobUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-bold transition-colors ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-[#1a2636]' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>Open
            </Link>
            {applyError && <span role="alert" className="text-[11px] font-medium text-red-500">{applyError}</span>}
            {savedError && <span role="alert" className="text-[11px] font-medium text-red-500">{savedError}</span>}
            {!applyError && applyState.kind === 'cooldown' && <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Your previous application wasn't selected. You can apply again after {REAPPLY_COOLDOWN_DAYS} days.</span>}
          </div>
        </div>
      )}

      {isApplicationOpen && (
        <ApplicationFormModal
          job={job}
          profile={profile}
          isDarkMode={isDarkMode}
          isSubmitting={isApplying}
          submitError={applyError}
          onSubmit={apply}
          onClose={() => setApplicationOpen(false)}
        />
      )}
    </article>
  );
}
