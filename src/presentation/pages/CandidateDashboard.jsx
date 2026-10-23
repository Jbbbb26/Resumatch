import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logoutUser, getCurrentUser, updateUserMetadata, createPublicProfile } from "../../data/services/authService";
import { TopHeader } from "../components/TopHeader";
// File on disk is "FIlterModal.jsx" (capital I). The import must match exactly or the Linux build on Railway fails.
import { FilterModal } from "../components/FilterModal";
import { ApplicationsModal } from "../components/ApplicationsModal";
import { ProfileModal } from "../components/ProfileModal";
import { supabase } from "../../../supabaseClient.js";
import { ApplicationFormModal } from "../components/ApplicationFormModal";
import { JobDescription } from "../components/JobDescription";
import { AttachmentList } from "../components/AttachmentList";
import { useApplyToJob } from "../../hooks/useApplyToJob";
import { useJobAttachments } from "../../hooks/useJobAttachments";
import { useJobs } from "../../hooks/useJobs";
import { jobTextOnly } from "../../data/services/jobText";

const profileFields = ["firstName", "lastName", "resumeFileUrl", "resume_data", "skills", "experience"];

const hasProfileValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(value);
};

const profileCompletion = (profile) => profile ? Math.round((profileFields.filter((field) => hasProfileValue(profile[field])).length / profileFields.length) * 100) : 0;
const jobText = (job) => [job.title, job.company_name, jobTextOnly(job.description), jobTextOnly(job.requirements), job.location, job.work_type, job.employment_type].filter(Boolean).join(" ").toLowerCase();

const formatShortDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const matchScoreOf = (job) => {
  const raw = job.match_score ?? job.matchScore ?? job.match;
  const score = Number(raw);
  return raw != null && Number.isFinite(score) && score >= 0 ? Math.round(score) : null;
};

function JobSkeleton({ isDarkMode }) {
  return <div className={`h-[132px] rounded-2xl animate-pulse ${isDarkMode ? 'bg-[#121b27]' : 'bg-white border border-slate-200'}`} />;
}

/* ------------------------------------------------------------------ Left column: JobStreet-inspired job cards */
function JobListItem({ job, isSelected, isApplied, isSaved, isSaving, onSelect, onToggleSave, logoUrl, isDarkMode }) {
  const company = job.company_name || 'Company';
  const initials = company.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '?';
  const score = matchScoreOf(job);
  const isClosed = (job.hiring_status || 'open') === 'closed';
  const briefDetails = jobTextOnly(job.description || job.requirements).replace(/\s+/g, ' ').trim();

  const selectedStyle = isDarkMode
    ? 'border-[#ea6036] bg-[#162232] shadow-lg ring-1 ring-[#ea6036]/40'
    : 'border-[#ea6036] bg-white shadow-md ring-1 ring-[#ea6036]/50';
  const idleStyle = isDarkMode
    ? 'border-white/10 bg-[#121b27] hover:border-white/30'
    : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm';
  const chip = isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600';

  return (
    <article className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1B2A5C]/10 hover:ring-1 hover:ring-[#ea6036]/35 motion-reduce:transform-none ${isSelected ? selectedStyle : idleStyle}`}>
      <button
        type="button"
        onClick={() => onSelect(job.id)}
        aria-current={isSelected ? 'true' : undefined}
        aria-label={`View details for ${job.title} at ${company}`}
        className="block w-full p-4 pb-14 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ea6036] sm:p-5 sm:pb-14"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className={`text-base font-bold leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{company}</p>
            {score !== null && (
              <span className={`mt-2 inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${isDarkMode ? 'bg-[#4fa784]/15 text-[#75c5a3]' : 'bg-emerald-50 text-emerald-700'}`}>
                {score}% match
              </span>
            )}
          </div>

          {/* Real company logo when available, company initials as a fallback. */}
          <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${isDarkMode ? 'border-white/10 bg-white/10 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            <span className="text-base font-bold" aria-hidden="true">{initials}</span>
            {logoUrl && (
              <img
                src={logoUrl}
                alt={`${company} logo`}
                loading="lazy"
                className="absolute inset-0 h-full w-full bg-white object-contain p-1"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {job.employment_type && <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${chip}`}>{job.employment_type}</span>}
          {job.work_type && <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${chip}`}>{job.work_type}</span>}
          {isApplied && <span className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">Applied</span>}
          {isClosed && <span className="rounded-md bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-600">Not hiring</span>}
          {job.qualification_mismatch && <span className="rounded-md bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-600">Nursing qualifications not found</span>}
          {isSaved && <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${isDarkMode ? 'bg-[#ea6036]/20 text-[#ff8a5c]' : 'bg-orange-50 text-[#ea6036]'}`}>Saved</span>}
        </div>

        <p className={`mt-3 flex items-start gap-1.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span>{job.location || 'Location not specified'}</span>
        </p>

        {briefDetails && (
          <p className={`mt-3 line-clamp-3 text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {briefDetails}
          </p>
        )}

        {job.created_at && (
          <p className={`mt-4 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Posted {formatShortDate(job.created_at)}
          </p>
        )}
      </button>

      {/* Separate button so saving doesn't open the job details. */}
      <button
        type="button"
        disabled={isSaving}
        onClick={() => onToggleSave(job)}
        aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
        aria-pressed={isSaved}
        title={isSaved ? 'Remove from saved jobs' : 'Save job'}
        className={`absolute bottom-3 right-3 z-10 rounded-xl p-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036] disabled:cursor-wait disabled:opacity-50 ${isSaved ? 'text-[#ea6036]' : isDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4V4.75Z" />
        </svg>
      </button>
    </article>
  );
}

/* Saved jobs appear in a compact right-hand column, like the supplied JobStreet reference. */
function SavedJobCard({ saved, job, company, logoUrl, isDarkMode, isSaving, onOpen, onRemove }) {
  const title = job.title || 'Job listing';
  const initials = (company || 'Company').split(/\s+/).filter(Boolean).slice(0, 2)
    .map((word) => word[0]).join('').toUpperCase() || '?';

  return (
    <article className={`group relative rounded-2xl border transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1B2A5C]/10 hover:ring-1 hover:ring-[#ea6036]/35 motion-reduce:transform-none ${isDarkMode
      ? 'border-white/10 bg-[#121b27] hover:border-white/25'
      : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'}`}>
      <button type="button" onClick={() => onOpen(saved.job_posting_id)}
        className="block w-full rounded-2xl px-5 pb-14 pt-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]"
        aria-label={`View ${title} at ${company}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className={`line-clamp-3 text-base font-bold leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h3>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{company}</p>
          </div>
          <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${isDarkMode
            ? 'border-white/10 bg-white/10 text-white'
            : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            <span className="text-sm font-bold">{initials}</span>
            {logoUrl && <img src={logoUrl} alt={`${company} logo`} loading="lazy"
              className="absolute inset-0 h-full w-full bg-white object-contain p-1"
              onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
          </div>
        </div>
        <p className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {job.location || 'Location not specified'}{job.work_type ? ` (${job.work_type})` : ''}
        </p>
        {job.employment_type && (
          <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{job.employment_type}</p>
        )}
        {job.created_at && (
          <p className={`mt-3 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Posted {formatShortDate(job.created_at)}
          </p>
        )}
      </button>
      <button type="button" onClick={() => onRemove(job)} disabled={isSaving}
        aria-label={`Remove ${title} from saved jobs`} title="Remove from saved jobs"
        className="absolute bottom-3 right-3 rounded-xl p-2.5 text-[#ea6036] transition-colors hover:bg-[#ea6036]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036] disabled:opacity-50">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4V4.75Z" />
        </svg>
      </button>
    </article>
  );
}

/* JobStreet-inspired detail modal. Uses real job fields and existing application workflow. */
function JobDetailsModal({ job, profile, userId, application, isDarkMode, logoUrl, companyInfo, isSaved, isSaving,
  onToggleSave, onClose, onApplied, onApplySuccess, onEditProfile }) {
  const closeButtonRef = useRef(null);
  const [isApplicationOpen, setApplicationOpen] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const company = job.company_name || 'Company name not provided';
  const initials = company.split(/\s+/).filter(Boolean).slice(0, 2).map((name) => name[0]).join('').toUpperCase();
  const match = matchScoreOf(job);
  const hiringOpen = (job.hiring_status || 'open') === 'open' && !job.is_archived;

  // Use the same 30-day rejected-application cooldown as JobCard.
  const priorApplication = submittedApplication || application;
  let applyState = 'new';
  let reapplyOn = null;
  if (priorApplication) {
    if (priorApplication.status === 'Rejected') {
      const rejectedAt = new Date(priorApplication.statusUpdatedAt || priorApplication.appliedAt);
      reapplyOn = new Date(rejectedAt.getTime() + 30 * 86400000);
      applyState = Date.now() >= reapplyOn.getTime() ? 'reapply' : 'cooldown';
    } else {
      applyState = 'applied';
    }
  }
  const canApply = hiringOpen && ['new', 'reapply'].includes(applyState);
  const applyLabel = !hiringOpen ? 'Not hiring'
    : applyState === 'applied' ? (priorApplication?.status === 'Hired' ? 'Hired' : 'Applied')
    : applyState === 'cooldown' ? `Re-apply ${formatShortDate(reapplyOn)}`
    : applyState === 'reapply' ? 'Re-apply' : 'Quick apply';

  const { apply, isSubmitting, error: applyError } = useApplyToJob({
    job,
    userId,
    onSuccess: async (data) => {
      setSubmittedApplication({
        status: 'Applied',
        appliedAt: data?.applied_at || new Date().toISOString(),
        statusUpdatedAt: data?.status_updated_at || new Date().toISOString(),
      });
      setApplicationOpen(false);
      onApplySuccess?.();
      await onApplied?.();
    },
  });
  const { attachments, isLoading: attachmentsLoading, error: attachmentsError, getDownloadUrl } =
    useJobAttachments(job.id, userId, true);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const handleKeys = (event) => {
      // The application form has its own Escape handling and confirmation.
      if (isApplicationOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const dialog = closeButtonRef.current?.closest('[role="dialog"]');
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => element.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKeys);
    return () => document.removeEventListener('keydown', handleKeys);
  }, [isApplicationOpen, onClose]);

  const downloadAttachment = async (attachment) => {
    // Open a tab synchronously to avoid popup blockers after signed URL retrieval.
    const downloadWindow = window.open('about:blank', '_blank');
    const url = await getDownloadUrl(attachment.file_path);
    if (!url) { downloadWindow?.close(); return false; }
    if (!downloadWindow) return false;
    downloadWindow.opener = null;
    downloadWindow.location = url;
    return true;
  };

  const text = isDarkMode ? 'text-slate-200' : 'text-[#16202A]';
  const muted = isDarkMode ? 'text-slate-400' : 'text-[#596779]';
  const heading = isDarkMode ? 'text-white' : 'text-[#1B2A5C]';
  const chip = isDarkMode ? 'bg-white/10 text-slate-200' : 'bg-[#EEF1F7] text-[#273247]';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-5"
      aria-label="Job details overlay">
      <button type="button" aria-label="Close job details" onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-[#2B3342]/80 backdrop-blur-[3px]" />
      <div role="dialog" aria-modal="true" aria-labelledby="candidate-job-modal-title"
        className={`relative flex max-h-[calc(100dvh-1rem)] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-3xl ${isDarkMode ? 'border-white/10 bg-[#101a28]' : 'border-[#E3E7EE] bg-white'}`}>
        {/* Header: same fixed action-bar layout as the supplied HTML template. */}
        <div className={`flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3 sm:gap-3 sm:px-6 sm:py-4 ${isDarkMode ? 'border-white/10' : 'border-[#E3E7EE]'}`}>
          <div className="min-w-0 flex-1 basis-[140px]">
            <p className={`truncate text-sm font-bold sm:text-base ${heading}`}>{job.title}</p>
            <p className={`truncate text-xs sm:text-sm ${muted}`}>{company}</p>
          </div>
          <button type="button" onClick={() => onToggleSave(job)} disabled={isSaving} aria-pressed={isSaved}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold disabled:opacity-60 sm:min-h-11 sm:px-4 sm:text-sm ${isDarkMode ? 'border-white/20 text-white hover:bg-white/10' : 'border-[#1B2A5C] text-[#1B2A5C] hover:bg-slate-50'}`}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4V4.75Z" /></svg>
            {isSaving ? 'Saving…' : isSaved ? 'Saved' : 'Save'}
          </button>
          <button type="button" onClick={() => setApplicationOpen(true)} disabled={!canApply || isSubmitting}
            className="min-h-10 rounded-xl bg-[#C2410C] px-3 text-xs font-bold text-white hover:bg-[#a9360b] disabled:cursor-not-allowed disabled:bg-slate-400 sm:min-h-11 sm:px-5 sm:text-sm">
            {isSubmitting ? 'Submitting…' : applyLabel}
          </button>
          <button ref={closeButtonRef} type="button" aria-label="Close job details" onClick={onClose}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11 ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#EEF1F7] text-[#16202A] hover:bg-slate-200'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className={`min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-6 sm:space-y-8 sm:px-10 sm:py-8 ${text}`}>
          {/* Job title, employer logo and metadata */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border text-lg font-bold ${isDarkMode ? 'border-white/10 bg-white/10 text-white' : 'border-[#E3E7EE] bg-[#E6F4F3] text-[#0E6F6B]'}`}>
                {initials || '?'}
                {logoUrl && <img src={logoUrl} alt={`${company} logo`} className="absolute inset-0 h-full w-full bg-white object-contain p-1" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
              </div>
              <div className={`min-w-0 text-sm ${muted}`}>
                <p className="font-semibold">{company}</p>
                {job.created_at && <p>Posted {formatShortDate(job.created_at)}</p>}
              </div>
            </div>
            <h2 id="candidate-job-modal-title" className={`text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl ${heading}`}>{job.title}</h2>
            <div className="flex flex-wrap gap-2 text-xs font-semibold sm:text-sm">
              {job.location && <span className={`rounded-full px-3.5 py-2 ${chip}`}>{job.location}</span>}
              {job.work_type && <span className={`rounded-full px-3.5 py-2 ${chip}`}>{job.work_type}</span>}
              {job.employment_type && <span className={`rounded-full px-3.5 py-2 ${chip}`}>{job.employment_type}</span>}
              <span className={`rounded-full px-3.5 py-2 ${hiringOpen ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                {hiringOpen ? 'Open for applications' : 'Not hiring'}
              </span>
            </div>
          </section>

          <section className={`rounded-2xl border p-5 sm:p-6 ${isDarkMode ? 'border-white/10 bg-[#142234]' : 'border-[#E3E7EE] bg-white'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className={`text-lg font-bold ${heading}`}>How you match</h3>
                <p className={`mt-1 text-sm ${muted}`}>AI similarity between your resume and the job listing; not a qualification guarantee.</p>
              </div>
              <div className={`rounded-xl border px-4 py-2 text-center ${isDarkMode ? 'border-emerald-800 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50'}`}>
                <div className="text-xl font-extrabold text-[#4fa784]">{match === null ? '—' : `${match}%`}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[#4fa784]">Match score</div>
              </div>
            </div>
          </section>

          {job.description && (
            <section className="space-y-3">
              <h3 className={`text-xl font-bold ${heading}`}>Job description</h3>
              <JobDescription text={job.description} label="" collapsed={false} isDarkMode={isDarkMode} />
            </section>
          )}
          {job.requirements && (
            <section className="space-y-3">
              <h3 className={`text-xl font-bold ${heading}`}>Requirements</h3>
              <JobDescription text={job.requirements} label="" collapsed={false} isDarkMode={isDarkMode} />
            </section>
          )}
          <AttachmentList attachments={attachments} isLoading={attachmentsLoading} error={attachmentsError}
            isDarkMode={isDarkMode} onDownload={downloadAttachment} />

          {/* Company summary matches the supplied navy reference, with real employer data only. */}
          <section className="space-y-4 rounded-2xl bg-[#1B2A5C] p-6 text-white sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#BFC8E6]">Company profile</p>
            <h3 className="text-xl font-bold sm:text-2xl">{company}</h3>
            {(companyInfo?.industry || companyInfo?.size || companyInfo?.company_size || companyInfo?.location) && (
              <p className="text-sm leading-relaxed text-[#D5DBEF]">
                {[companyInfo?.industry, companyInfo?.size || companyInfo?.company_size, companyInfo?.location].filter(Boolean).join(' · ')}
              </p>
            )}
            {(companyInfo?.description || companyInfo?.about) && (
              <p className="line-clamp-4 text-sm leading-7 text-white/95 sm:text-base">
                {companyInfo.description || companyInfo.about}
              </p>
            )}
            {job.recruiter_id && (
              <Link
                to={`/companies/${encodeURIComponent(job.recruiter_id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-white hover:text-[#1B2A5C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                More about this company
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
              </Link>
            )}
          </section>
          {applyError && <p role="alert" className="text-sm text-red-500">{applyError}</p>}
        </div>
      </div>
      {isApplicationOpen && (
        <ApplicationFormModal job={job} profile={profile} isDarkMode={isDarkMode}
          isSubmitting={isSubmitting} submitError={applyError} onSubmit={apply}
          onClose={() => setApplicationOpen(false)}
          onEditProfile={() => { setApplicationOpen(false); onClose(); onEditProfile?.(); }} />
      )}
    </div>
  );
}

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [savingJobIds, setSavingJobIds] = useState([]);
  const [companyLogos, setCompanyLogos] = useState({});
  const [companyNames, setCompanyNames] = useState({});
  const [companyDetails, setCompanyDetails] = useState({});
  const [showAllSaved, setShowAllSaved] = useState(false);
  const [externalSelectedJob, setExternalSelectedJob] = useState(null);
  const [titleQuery, setTitleQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [jobView, setJobView] = useState('recommended'); // 'recommended' | 'all'
  const [isLoading, setIsLoading] = useState(true);
  const [savedError, setSavedError] = useState('');
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState('');
  const [isApplicationsOpen, setApplicationsOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const previousFocusRef = useRef(null);
  const { jobs, isLoading: jobsLoading, error: jobsError, refetch: reloadJobs } = useJobs(user?.id, Boolean(user?.id));

  useEffect(() => {
    if (window.location.hash !== '#edit-profile') return;
    setProfileModalOpen(true);
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }, []);

  useEffect(() => { document.documentElement.classList.toggle('light-mode', !isDarkMode); }, [isDarkMode]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
    }
  }, [isDarkMode]);

  // Candidate application history (title, company, date applied, status).
  const loadApplications = async (userId) => {
    setApplicationsLoading(true);
    setApplicationsError('');
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*, job_postings(id, title, recruiter_id)')
        .eq('candidate_id', userId)
        .order('applied_at', { ascending: false });
      if (error) throw error;

      // Company names live on the employers table (id = recruiter_id).
      const recruiterIds = [...new Set((data || []).map((a) => a.job_postings?.recruiter_id).filter(Boolean))];
      let companies = {};
      if (recruiterIds.length) {
        const { data: employers } = await supabase.from('employers').select('id, companyName').in('id', recruiterIds);
        companies = Object.fromEntries((employers || []).map((e) => [e.id, e.companyName]));
      }

      setApplications((data || []).map((a) => ({
        id: a.id,
        jobId: a.job_id,
        statusUpdatedAt: a.status_updated_at,
        jobTitle: a.job_postings?.title || 'Position no longer available',
        jobRemoved: !a.job_postings,
        company: companies[a.job_postings?.recruiter_id] || '—',
        appliedAt: a.applied_at,
        status: a.status || 'Applied',
        matchScore: a.match_score,
      })));
    } catch (err) {
      console.error("Applications Error:", err);
      setApplicationsError(err.message);
    } finally {
      setApplicationsLoading(false);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await getCurrentUser();

        if (response.success && response.data) {
          let metadata = response.data.user_metadata || {};
          const authIntent = sessionStorage.getItem('authIntent');
          const intendedRole = sessionStorage.getItem('intendedRole');

          if (authIntent === 'signup') {
            if (metadata.role) {
              await logoutUser();
              sessionStorage.removeItem('authIntent');
              sessionStorage.removeItem('intendedRole');
              navigate('/signup', {
                state: { error: 'This Google account is already registered. Please Sign In.' }
              });
              return;
            } else {
              await updateUserMetadata({ role: intendedRole });
              metadata.role = intendedRole;
              sessionStorage.removeItem('authIntent');
              sessionStorage.removeItem('intendedRole');
            }
          }

          if (metadata.role !== 'job_seeker') {
            if (metadata.role === 'recruiter') navigate('/recruiter-dashboard');
            else navigate('/login');
            return;
          }

          const rawName = metadata.full_name || response.data.email?.split('@')[0] || "Candidate";
          const cleanName = rawName.trim();
          const nameParts = cleanName.split(/\s+/);

          const initials = nameParts.length > 1
            ? `${nameParts[0][0] || ''}${nameParts[nameParts.length - 1][0] || ''}`.toUpperCase()
            : cleanName.substring(0, 2).toUpperCase();

          setUser({
            id: response.data.id,
            name: cleanName,
            email: response.data.email,
            initials: initials
          });

          // Make sure a candidate_profiles row with first/last name exists, so recruiters
          // see the real name on applications instead of "Unknown".
          await createPublicProfile(response.data.id, response.data.email, 'job_seeker', metadata.full_name || metadata.name || '');

          const { data: candidateProfile, error: profileError } = await supabase
            .from('candidate_profiles')
            .select('*')
            .eq('id', response.data.id)
            .maybeSingle();
          if (profileError) throw profileError;
          setProfile(candidateProfile);

          await loadApplications(response.data.id);

          const { data: savedData } = await supabase
            .from('saved_jobs')
            .select('id, job_posting_id, created_at, job_postings(id, recruiter_id, title, location, work_type, employment_type, status, hiring_status, is_archived, created_at)')
            .eq('candidate_id', response.data.id);

          if (savedData) setSavedJobs(savedData);

        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error("Dashboard Load Error:", error);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  // Fetch optional employer logo URLs without requiring a specific logo column.
  // Employers without logos continue to display company initials.
  useEffect(() => {
    const recruiterIds = [...new Set([
      ...jobs.map((job) => job.recruiter_id),
      ...savedJobs.map((saved) => saved.job_postings?.recruiter_id),
    ].filter(Boolean))];
    if (!recruiterIds.length) {
      setCompanyLogos({});
      setCompanyNames({});
      setCompanyDetails({});
      return;
    }
    let active = true;
    const loadCompanyLogos = async () => {
      const { data, error } = await supabase.from('employers').select('*').in('id', recruiterIds);
      if (error || !active) return;
      const logos = Object.fromEntries((data || []).map((company) => [
        company.id,
        company.logo_url || company.company_logo_url || company.companyLogo || company.logoUrl || company.logo || null,
      ]));
      setCompanyLogos(logos);
      setCompanyNames(Object.fromEntries((data || []).map((company) => [company.id, company.companyName || 'Company name not provided'])));
      setCompanyDetails(Object.fromEntries((data || []).map((company) => [company.id, company])));
    };
    loadCompanyLogos();
    return () => { active = false; };
  }, [jobs, savedJobs]);

  const toggleSavedJob = async (job) => {
    if (!user?.id || savingJobIds.includes(job.id)) return;
    setSavingJobIds((current) => [...current, job.id]);
    setSavedError('');
    try {
      const existing = savedJobs.find((saved) => saved.job_posting_id === job.id);
      if (existing) {
        const { error } = await supabase.from('saved_jobs')
          .delete().eq('id', existing.id).eq('candidate_id', user.id);
        if (error) throw error;
        setSavedJobs((current) => current.filter((saved) => saved.job_posting_id !== job.id));
      } else {
        const { data, error } = await supabase.from('saved_jobs')
          .insert([{ candidate_id: user.id, job_posting_id: job.id }])
          .select('id,job_posting_id,created_at,job_postings(id,recruiter_id,title,location,work_type,employment_type,status,hiring_status,is_archived,created_at)')
          .single();
        if (error) throw error;
        setSavedJobs((current) => current.some((saved) => saved.job_posting_id === job.id)
          ? current : [data, ...current]);
      }
    } catch (error) {
      setSavedError(error.message || 'Unable to update saved jobs.');
    } finally {
      setSavingJobIds((current) => current.filter((id) => id !== job.id));
    }
  };

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) navigate("/login");
  };

  // Only jobs returned with a usable recommendation score may enter Recommended.
  // Crucially, exclude explicit qualification mismatches BEFORE listing them,
  // rather than relying on a 0% badge. Unknown eligibility isn't a rejection;
  // these jobs remain discoverable through All jobs.
  const recommendedJobs = useMemo(() => jobs.filter((job) =>
    job.qualification_mismatch !== true &&
    matchScoreOf(job) !== null &&
    matchScoreOf(job) > 0
  ), [jobs]);

  const filteredJobs = useMemo(() => {
    const titleSearch = titleQuery.trim().toLowerCase();
    const locationSearch = locationQuery.trim().toLowerCase();
    const source = jobView === 'recommended' ? recommendedJobs : jobs;
    return source.filter((job) =>
      (!titleSearch || jobText(job).includes(titleSearch)) &&
      (!locationSearch || [job.location, job.work_type].filter(Boolean).join(' ').toLowerCase().includes(locationSearch))
    );
  }, [jobs, recommendedJobs, jobView, titleQuery, locationQuery]);
  const visibleSavedJobs = savedJobs.filter((saved) => saved.job_postings
    && !saved.job_postings.is_archived
    && (saved.job_postings.hiring_status || 'open') === 'open');

  // Job cards always open the modal. A saved job may be outside the search results;
  // fetch its full details in that case rather than showing an empty modal.
  const selectedJob = jobs.find((job) => job.id === selectedJobId)
    || (externalSelectedJob?.id === selectedJobId ? externalSelectedJob : null);

  const selectJob = async (jobId) => {
    previousFocusRef.current = document.activeElement;
    if (jobs.some((job) => job.id === jobId)) {
      setExternalSelectedJob(null);
      setSelectedJobId(jobId);
      return;
    }
    setSavedError('');
    try {
      const { data, error } = await supabase.from('job_postings').select('*').eq('id', jobId).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This job is no longer available.');
      let employerName = companyNames[data.recruiter_id];
      if (!employerName && data.recruiter_id) {
        const { data: employer } = await supabase.from('employers')
          .select('companyName').eq('id', data.recruiter_id).maybeSingle();
        employerName = employer?.companyName;
      }
      setExternalSelectedJob({ ...data, company_name: employerName || 'Company name not provided', match: null });
      setSelectedJobId(jobId);
    } catch (error) {
      setSavedError(error.message || 'Unable to open this saved job.');
    }
  };
  const closeJobModal = () => {
    setSelectedJobId(null);
    setExternalSelectedJob(null);
    requestAnimationFrame(() => previousFocusRef.current?.focus?.());
  };

  if (isLoading || !user) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center space-y-4 ${isDarkMode ? 'bg-[#090e15]' : 'bg-slate-50'}`}>
        <svg className="animate-spin h-10 w-10 text-[#ea6036]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className={`text-sm font-medium animate-pulse ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans selection:bg-[#ea6036]/30 transition-colors duration-200 ${isDarkMode ? 'bg-[#090e15] text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
      <TopHeader
        user={user}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
        openProfile={() => setProfileModalOpen(true)}
        logout={handleLogout}
        openApplications={() => { setApplicationsOpen(true); loadApplications(user.id); }}
        applicationsCount={applications.length}
      />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <p className={`text-sm mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Welcome back</p>
          <h1 className={`text-3xl sm:text-4xl font-serif mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Good to see you, {user?.name || 'There'}
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Your profile is <span className="text-[#4fa784] font-semibold">{profileCompletion(profile)}%</span> complete. Finish it to improve your match scores across every listing.
          </p>
        </div>

        <div className={`flex flex-col md:flex-row items-center gap-3 p-2 rounded-2xl border mb-8 shadow-lg transition-colors ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200'}`}>
          <div className={`flex-1 flex items-center px-4 w-full border-b md:border-b-0 md:border-r pb-2 md:pb-0 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
            <svg className="w-5 h-5 text-slate-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" value={titleQuery} onChange={(event) => setTitleQuery(event.target.value)} placeholder="Job title, skill, or company" className={`w-full bg-transparent border-none focus:ring-0 text-sm py-2 outline-none ${isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`} />
          </div>
          <div className="flex-1 flex items-center px-4 w-full">
            <svg className="w-5 h-5 text-slate-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <input type="text" value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="City or region" className={`w-full bg-transparent border-none focus:ring-0 text-sm py-2 outline-none ${isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`} />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto px-2 md:px-0 mt-2 md:mt-0">
            <button onClick={() => setFilterModalOpen(true)} className={`p-2.5 rounded-xl transition-colors border ${isDarkMode ? 'bg-[#1a2636] hover:bg-[#233348] text-slate-300 border-white/5' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            </button>
            <button type="button" onClick={() => setJobView('all')} className="flex-1 md:flex-none px-8 py-2.5 bg-[#ea6036] hover:bg-[#d8552e] text-white text-sm font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg">
              Search
            </button>
          </div>
        </div>

        {/* Desktop: Recommended on the left, Saved jobs on the right. On mobile they stack. */}
        {savedError && <p role="alert" className="mb-3 text-xs text-red-500">{savedError}</p>}
        <div className="mb-12 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)] lg:gap-8">
          <section aria-label={jobView === 'recommended' ? 'Recommended job listings' : 'All job listings'} className="min-w-0">
            <div className="mb-4 flex min-h-8 flex-wrap items-center gap-2">
              <h2 className={`text-xl font-serif ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {jobView === 'recommended' ? 'Recommended' : 'All jobs'}
              </h2>
              {!jobsLoading && !jobsError && (
                <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
                </span>
              )}
              <div className={`ml-auto inline-flex rounded-lg border p-0.5 ${isDarkMode ? 'border-white/10 bg-[#1a2636]' : 'border-slate-200 bg-slate-100'}`} role="group" aria-label="Job listing view">
                {[
                  { key: 'recommended', label: 'Recommended' },
                  { key: 'all', label: 'All jobs' },
                ].map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setJobView(key)} aria-pressed={jobView === key}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${jobView === key
                      ? 'bg-[#ea6036] text-white shadow-sm'
                      : isDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {jobsError ? (
              <div role="alert" className={`rounded-2xl p-6 text-sm ${isDarkMode ? 'bg-[#121b27] text-slate-300' : 'bg-white text-slate-600'}`}>
                <p>Unable to load job listings: {jobsError}</p>
                <button type="button" onClick={reloadJobs} className="mt-3 font-bold text-[#ea6036] hover:underline">Retry</button>
              </div>
            ) : jobsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((index) => <JobSkeleton key={index} isDarkMode={isDarkMode} />)}
              </div>
            ) : filteredJobs.length === 0 ? (
              <p className={`rounded-2xl p-6 text-sm ${isDarkMode ? 'bg-[#121b27] text-slate-400' : 'bg-white text-slate-500'}`}>
                {jobView === 'recommended'
                  ? 'No recommended matches found. Update your resume/profile to improve matching, or switch to All jobs to browse every listing.'
                  : 'No jobs match your search right now.'}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map((job) => (
                  <JobListItem key={job.id} job={job} isSelected={job.id === selectedJobId}
                    isApplied={applications.some((item) => item.jobId === job.id)}
                    isSaved={savedJobs.some((saved) => saved.job_posting_id === job.id)}
                    isSaving={savingJobIds.includes(job.id)}
                    logoUrl={companyLogos[job.recruiter_id] || null}
                    onSelect={selectJob} onToggleSave={toggleSavedJob} isDarkMode={isDarkMode} />
                ))}
              </div>
            )}
            <p className={`mt-4 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <button type="button" onClick={() => setProfileModalOpen(true)} className="text-[#3c8eec] hover:underline">Update your profile</button> to improve matching. Jobs lacking a recommendation score or failing the nursing qualification check remain searchable in All jobs.
            </p>
          </section>

          <aside aria-label="Saved jobs" className="min-w-0">
            <div className="mb-4 flex min-h-8 items-center justify-between gap-3">
              <h2 className={`text-xl font-serif ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Saved jobs</h2>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {visibleSavedJobs.length} saved
              </span>
            </div>
            {visibleSavedJobs.length === 0 ? (
              <div className={`rounded-2xl border px-5 py-8 text-center ${isDarkMode ? 'border-white/10 bg-[#121b27]' : 'border-slate-200 bg-white shadow-sm'}`}>
                <svg className="mx-auto mb-3 h-8 w-8 text-[#ea6036]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-4-6 4V4.75Z" /></svg>
                <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Bookmark a recommended job and it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(showAllSaved ? visibleSavedJobs : visibleSavedJobs.slice(0, 3)).map((saved) => {
                  const job = jobs.find((entry) => entry.id === saved.job_posting_id) || saved.job_postings;
                  const company = job.company_name || companyNames[job.recruiter_id] || 'Company name not provided';
                  return (
                    <SavedJobCard key={saved.id} saved={saved} job={job} company={company}
                      logoUrl={companyLogos[job.recruiter_id] || null}
                      isDarkMode={isDarkMode} isSaving={savingJobIds.includes(job.id)}
                      onOpen={selectJob} onRemove={toggleSavedJob} />
                  );
                })}
                {visibleSavedJobs.length > 3 && (
                  <button type="button" onClick={() => setShowAllSaved((current) => !current)}
                    className={`flex w-full items-center justify-end gap-2 py-2 text-sm font-semibold hover:underline ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {showAllSaved ? 'Show less' : `View all (${visibleSavedJobs.length})`}
                    <svg className={`h-4 w-4 ${showAllSaved ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" /></svg>
                  </button>
                )}
              </div>
            )}
          </aside>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8">
          {[
            { value: String(applications.filter((a) => a.status !== 'Rejected').length), label: "Active applications" },
            { value: String(applications.filter((a) => a.status === 'Interview').length), label: "Interview requests" },
            { value: applications.length ? `${Math.round(applications.reduce((sum, a) => sum + (a.matchScore || 0), 0) / applications.length)}%` : "—", label: "Average match score" }
          ].map((stat, idx) => (
            <div key={idx} className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
              <span className={`block text-4xl font-serif font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stat.value}</span>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{stat.label}</span>
            </div>
          ))}
        </div>
      </main>

      {selectedJob && (
        <JobDetailsModal key={selectedJob.id} job={selectedJob} profile={profile} userId={user.id}
          application={applications.find((item) => item.jobId === selectedJob.id) || null}
          logoUrl={companyLogos[selectedJob.recruiter_id] || null}
          companyInfo={companyDetails[selectedJob.recruiter_id] || null} isDarkMode={isDarkMode}
          isSaved={savedJobs.some((saved) => saved.job_posting_id === selectedJob.id)}
          isSaving={savingJobIds.includes(selectedJob.id)}
          onToggleSave={toggleSavedJob} onClose={closeJobModal}
          onEditProfile={() => setProfileModalOpen(true)}
          onApplied={() => loadApplications(user.id)}
          onApplySuccess={() => {
            setSuccessToast(`Application submitted for ${selectedJob.title}.`);
            window.setTimeout(() => setSuccessToast(''), 4000);
          }} />
      )}
      {successToast && <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-40 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-xl">{successToast}</div>}
      {isApplicationsOpen && (
        <ApplicationsModal
          applications={applications}
          isLoading={applicationsLoading}
          error={applicationsError}
          onClose={() => setApplicationsOpen(false)}
          isDarkMode={isDarkMode}
        />
      )}
      {isFilterModalOpen && <FilterModal onClose={() => setFilterModalOpen(false)} isDarkMode={isDarkMode} />}
      {isProfileModalOpen && (
        <ProfileModal
          user={user}
          onClose={async () => {
            setProfileModalOpen(false);
            if (!user?.id) return;
            const { data, error } = await supabase.from('candidate_profiles')
              .select('*').eq('id', user.id).maybeSingle();
            if (!error && data) setProfile(data);
          }}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}