import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../../data/services/authService';
import { apiFetch } from '../../data/services/apiClient';
import { candidateDisplay } from '../../data/services/candidateDisplay';
import { supabase } from '../../../supabaseClient.js';
import { TopHeader } from '../components/TopHeader';
import { CompanyProfileModal } from '../components/CompanyProfileModal';
import { ProfileModal } from '../components/ProfileModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { JobListingItem } from '../components/JobListingItem';
import { JOB_STATUS_FILTERS, useJobListings } from '../../hooks/useJobListings';
import { PipelinePage } from './PipelinePage';
import { FileUploadField } from '../components/FileUploadField';
import { useJobAttachments } from '../../hooks/useJobAttachments';
import { RichJobEditor } from '../components/RichJobEditor';
import { jobTextOnly } from '../../data/services/jobText';

const emptyJobForm = {
  title: '', location: '', work_type: 'Remote', employment_type: 'Full-time', description: '', requirements: '',
};

// Character limits for long text fields (adjust to taste)
const JOB_TEXT_LIMITS = {
  description: 5000,   // roughly 700-900 words, typical for a full job post
  requirements: 3000,  // roughly 400-500 words
};

const formatPostedDate = (createdAt) => `Posted ${new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

const APPLICATION_SELECT = `
  id, match_score, status, applied_at, job_id, candidate_id,
  job_postings!inner(title, recruiter_id),
  candidate_profiles(firstName, lastName, email)
`;

function Badge({ children, positive = false, isDarkMode }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${positive ? (isDarkMode ? 'bg-[#4fa784]/15 text-[#4fa784]' : 'bg-[#4fa784]/15 text-emerald-700') : (isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
      {children}
    </span>
  );
}

function Sidebar({ active, onNavigate, isDarkMode }) {
  const items = [['home', 'Dashboard'], ['jobs', 'Job Listings'], ['pipeline', 'Pipeline']];
  return (
    <aside className={`flex w-[250px] shrink-0 flex-col gap-4 px-5 py-8 border-r transition-colors duration-200 ${isDarkMode ? 'bg-[#090e15] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
      <div className={`mb-4 text-xs font-bold tracking-wider uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        Menu
      </div>
      <nav className="flex flex-col gap-1.5">
        {items.map(([id, label]) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition-all duration-200 ${active === id ? 'bg-[#ea6036] text-white font-semibold shadow-md' : (isDarkMode ? 'text-slate-400 hover:bg-[#121b27] hover:text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900')}`}
          >
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function CloseButton({ onClick, isDarkMode }) {
  return (
    <button type="button" onClick={onClick} aria-label="Close" className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
  );
}

/* ------------------------------------------------------------------ Job form (create + edit) */
function JobFormModal({ mode, form, setForm, jobId, recruiterId, onClose, onSubmit, isSubmitting, message, isDarkMode }) {
  const isEdit = mode === 'edit';
  const attachmentState = useJobAttachments(jobId, recruiterId, isEdit || Boolean(jobId));
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const inputBg = isDarkMode ? 'bg-[#0a121c] border-white/10 text-white focus:border-[#ea6036]' : 'bg-white border-slate-300 text-slate-900 focus:border-[#ea6036] focus:ring-1 focus:ring-[#ea6036]';
  const labelColor = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const requestClose = () => {
    if (isSubmitting && !window.confirm('An upload is in progress. Close the form anyway? The job and any completed attachments will be kept.')) return;
    onClose();
  };
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);
  const handleSubmit = (event) => {
    event.preventDefault();
    if (attachmentState.isLoading || attachmentState.validationErrors.length) return;
    onSubmit(event, attachmentState);
  };
  const downloadAttachment = async (attachment) => {
    const downloadWindow = window.open('about:blank', '_blank');
    const url = await attachmentState.getDownloadUrl(attachment.file_path);
    if (downloadWindow && url) {
      downloadWindow.opener = null;
      downloadWindow.location = url;
    } else {
      downloadWindow?.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close job form" className={`fixed inset-0 backdrop-blur-sm transition-opacity ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`} onClick={requestClose} />
      <form onSubmit={handleSubmit} className={`relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl transition-colors ${isDarkMode ? 'border border-[#1b2b3b] bg-[#0d1622]' : 'border border-slate-200 bg-white'}`}>
        <header className={`flex shrink-0 items-start justify-between gap-4 border-b p-6 sm:px-8 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
          <div className="min-w-0">
            <h2 className={`text-2xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{isEdit ? 'Edit job listing' : 'Post a new job listing'}</h2>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{isEdit ? 'Update the details candidates see. Match scores are recalculated on save.' : 'Add the role details candidates will see.'}</p>
          </div>
          <CloseButton onClick={requestClose} isDarkMode={isDarkMode} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>Job title *</span>
              <input required value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Senior Product Designer" className={`rounded-xl px-4 py-3 text-sm outline-none border transition-colors ${inputBg}`} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>Location</span>
              <input value={form.location || ''} onChange={(e) => updateField('location', e.target.value)} placeholder="City or region" className={`rounded-xl px-4 py-3 text-sm outline-none border transition-colors ${inputBg}`} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>Work type</span>
              <select value={form.work_type} onChange={(e) => updateField('work_type', e.target.value)} className={`rounded-xl px-4 py-3 text-sm outline-none border transition-colors ${inputBg}`}>
                <option>Remote</option><option>Hybrid</option><option>On-site</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>Employment type</span>
              <select value={form.employment_type} onChange={(e) => updateField('employment_type', e.target.value)} className={`rounded-xl px-4 py-3 text-sm outline-none border transition-colors ${inputBg}`}>
                <option>Full-time</option><option>Part-time</option><option>Contract</option>
              </select>
            </label>
            <RichJobEditor
              id="job-description"
              label="Description"
              value={form.description}
              onChange={(value) => updateField('description', value)}
              placeholder="Describe the role and responsibilities"
              maxLength={JOB_TEXT_LIMITS.description}
              isDarkMode={isDarkMode}
            />
            <RichJobEditor
              id="job-requirements"
              label="Requirements"
              value={form.requirements}
              onChange={(value) => updateField('requirements', value)}
              placeholder="List the minimum qualifications and skills"
              maxLength={JOB_TEXT_LIMITS.requirements}
              isDarkMode={isDarkMode}
            />
            <FileUploadField
              files={attachmentState.files}
              attachments={attachmentState.attachments}
              validationErrors={attachmentState.validationErrors}
              uploadError={attachmentState.error}
              isLoading={attachmentState.isLoading}
              isSubmitting={isSubmitting}
              isDarkMode={isDarkMode}
              onAddFiles={attachmentState.addFiles}
              onRemoveFile={attachmentState.removeFile}
              onRemoveAttachment={async (attachment) => { await attachmentState.deleteAttachment(attachment.id); }}
              onDownloadAttachment={downloadAttachment}
            />
          </div>
        </div>
        <footer className={`flex shrink-0 justify-end gap-3 border-t p-5 sm:px-8 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
          <button type="button" onClick={requestClose} className={`rounded-xl border px-6 py-2.5 text-sm font-bold transition-colors ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>Cancel</button>
          <button type="submit" disabled={isSubmitting || attachmentState.isLoading} className="rounded-xl px-6 py-2.5 text-sm font-bold text-white bg-[#ea6036] hover:bg-[#d8552e] shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{isEdit ? 'Saving...' : 'Publishing...'}</span> : (attachmentState.isLoading ? 'Loading attachments…' : (isEdit ? 'Save changes' : 'Publish listing'))}
          </button>
        </footer>
      </form>
      {message?.type === 'error' && (
        <div role="alert" aria-live="assertive" className={`fixed bottom-5 right-5 z-[60] max-w-md rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${isDarkMode ? 'border-red-900/50 bg-[#36191b] text-red-100' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Review applications modal */
const APPLICATION_STATUSES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];
const statusLabel = (status) => (status === 'Rejected' ? 'Not selected' : status);

function ReviewApplicationsModal({ job, onClose, onStatusChange, isDarkMode }) {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewCandidate, setPreviewCandidate] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [expandedApplicationId, setExpandedApplicationId] = useState(null);

  // Recruiter sets the outcome. "Rejected" (shown as "Not selected") lets the candidate re-apply after the cooldown.
  const updateStatus = async (app, status) => {
    setSavingId(app.id);
    setError('');
    const { error: updateError } = await supabase
      .from('applications')
      .update({ status, stage: status.toLowerCase() })
      .eq('id', app.id);
    if (updateError) {
      setError(updateError.message);
    } else {
      setApplications((current) => current.map((a) => (a.id === app.id ? { ...a, status } : a)));
      onStatusChange?.(app.id, status);
    }
    setSavingId(null);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError('');
      const { data, error: queryError } = await supabase
        .from('applications')
        .select('id, match_score, status, applied_at, candidate_id, applicant_details, candidate_profiles(firstName, lastName, email)')
        .eq('job_id', job.id)
        .order('match_score', { ascending: false });
      if (cancelled) return;
      if (queryError) setError(queryError.message);
      else setApplications(data || []);
      setIsLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [job.id]);

  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className={`fixed inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`} onClick={onClose}></div>
        <div className={`relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl ${isDarkMode ? 'bg-[#0d1622] border border-[#1b2b3b]' : 'bg-white border border-slate-200'}`}>
          <div className={`flex items-start justify-between gap-4 border-b p-6 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
            <div>
              <div className={`mb-1 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>Applications</div>
              <h2 className={`text-2xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h2>
              <p className={`mt-1 text-sm ${muted}`}>
                {isLoading ? 'Loading applicants...' : `${applications.length} ${applications.length === 1 ? 'candidate' : 'candidates'}, ranked by match score`}
              </p>
            </div>
            <CloseButton onClick={onClose} isDarkMode={isDarkMode} />
          </div>

          <div className="overflow-y-auto p-6">
            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className={`h-16 animate-pulse rounded-xl ${isDarkMode ? 'bg-[#121b27]' : 'bg-slate-100'}`} />)}
              </div>
            ) : applications.length === 0 ? (
              <p className={`py-10 text-center text-sm ${muted}`}>No one has applied to this position yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {applications.map((app) => {
                  const person = candidateDisplay(app);
                  const score = app.match_score ? Math.round(app.match_score) : 0;
                  return (
                    <li key={app.id} className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ea6036] text-xs font-bold text-white">{person.initials}</div>
                        <div className="min-w-0">
                          <div className={`truncate text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{person.name}</div>
                          <div className={`truncate text-xs ${muted}`}>{person.email} · Applied {new Date(app.applied_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-[60px] rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div className={`h-full rounded-full ${isDarkMode ? 'bg-[#4fa784]' : 'bg-emerald-500'}`} style={{ width: `${score}%` }} />
                          </div>
                          <strong className={`text-sm ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>{score}%</strong>
                        </div>
                        <select
                          aria-label="Application status"
                          value={app.status || 'Applied'}
                          disabled={savingId === app.id}
                          onChange={(e) => updateStatus(app, e.target.value)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold outline-none disabled:opacity-60 ${isDarkMode ? 'border-white/10 bg-[#0a121c] text-slate-200' : 'border-slate-300 bg-white text-slate-700'}`}
                        >
                          {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                        </select>
                        <button
                          onClick={() => setPreviewCandidate({ id: app.candidate_id, ...person })}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-[#1a2636]' : 'border-slate-300 text-slate-600 hover:bg-white'}`}
                        >
                          View profile
                        </button>
                        {app.applicant_details && (
                          <button
                            type="button"
                            aria-expanded={expandedApplicationId === app.id}
                            onClick={() => setExpandedApplicationId((current) => current === app.id ? null : app.id)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036] ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-[#1a2636]' : 'border-slate-300 text-slate-600 hover:bg-white'}`}
                          >
                            {expandedApplicationId === app.id ? 'Hide application' : 'View application'}
                          </button>
                        )}
                      </div>
                      {expandedApplicationId === app.id && app.applicant_details && (
                        <section className={`basis-full rounded-xl border p-4 text-xs ${isDarkMode ? 'border-white/10 bg-[#0a121c] text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`} aria-label={`Application details for ${person.name}`}>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <h3 className="mb-2 font-bold">Personal profile</h3>
                              <dl className="space-y-1">
                                {[
                                  ['Name', app.applicant_details.fullName],
                                  ['Email', app.applicant_details.email],
                                  ['Phone', app.applicant_details.phone],
                                  ['Location', app.applicant_details.location],
                                  ['Profile link', app.applicant_details.profileUrl],
                                  ['Summary', app.applicant_details.summary],
                                  ['Years of experience', app.applicant_details.yearsExperience],
                                  ['Cover note', app.applicant_details.coverNote],
                                ].filter(([, value]) => value).map(([label, value]) => (
                                  <div key={label}><dt className="inline font-semibold">{label}: </dt><dd className="inline whitespace-pre-line break-words">{String(value)}</dd></div>
                                ))}
                              </dl>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <h3 className="mb-1 font-bold">Education</h3>
                                {(app.applicant_details.education || []).length ? (
                                  <ul className="space-y-1">
                                    {app.applicant_details.education.map((item, index) => <li key={index}>{[item.degreeLevel, item.fieldOfStudy, item.school, item.yearGraduated].filter(Boolean).join(' · ')}</li>)}
                                  </ul>
                                ) : <p className={muted}>Not provided</p>}
                              </div>
                              <div>
                                <h3 className="mb-1 font-bold">Qualifications</h3>
                                {(app.applicant_details.qualifications || []).length ? (
                                  <ul className="space-y-1">
                                    {app.applicant_details.qualifications.map((item, index) => <li key={index}>{[item.name, item.organization, item.yearObtained].filter(Boolean).join(' · ')}</li>)}
                                  </ul>
                                ) : <p className={muted}>Not provided</p>}
                              </div>
                              <div>
                                <h3 className="mb-1 font-bold">Skills</h3>
                                <p>{(app.applicant_details.skills || []).join(', ') || 'Not provided'}</p>
                              </div>
                              <div>
                                <h3 className="mb-1 font-bold">Languages</h3>
                                {(app.applicant_details.languages || []).length ? (
                                  <ul className="space-y-1">
                                    {app.applicant_details.languages.map((item, index) => <li key={index}>{[item.language, item.proficiency].filter(Boolean).join(' · ')}</li>)}
                                  </ul>
                                ) : <p className={muted}>Not provided</p>}
                              </div>
                            </div>
                          </div>
                        </section>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {previewCandidate && (
        <ProfileModal
          user={previewCandidate}
          onClose={() => setPreviewCandidate(null)}
          isDarkMode={isDarkMode}
          isRecruiterView={true}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ Shared: save a job (create or edit) */
const saveJob = async ({ mode, jobId, form }) => {
  if (!form.title.trim()) return { success: false, message: 'Job title is required.' };
  if (jobTextOnly(form.description).length > JOB_TEXT_LIMITS.description) {
    return { success: false, message: `Description must be ${JOB_TEXT_LIMITS.description.toLocaleString()} characters or fewer.` };
  }
  if (jobTextOnly(form.requirements).length > JOB_TEXT_LIMITS.requirements) {
    return { success: false, message: `Requirements must be ${JOB_TEXT_LIMITS.requirements.toLocaleString()} characters or fewer.` };
  }
  return apiFetch(mode === 'edit' ? `/api/jobs/${jobId}` : '/api/post-job', {
    method: mode === 'edit' ? 'PUT' : 'POST',
    body: JSON.stringify(form),
  });
};

const applicantCountFor = (applicants, jobId) => applicants.filter((a) => a.job_id === jobId).length;
const topMatchFor = (applicants, jobId) => {
  const jobApps = applicants.filter((a) => a.job_id === jobId);
  if (!jobApps.length) return '-';
  return `${Math.round(Math.max(...jobApps.map((a) => a.match_score || 0)))}%`;
};

/* ------------------------------------------------------------------ Dashboard: read-only listings preview */
function JobListingsPreview({ jobs, applicants, onManage, isDarkMode }) {
  const preview = jobs.slice(0, 5);
  return (
    <div className={`rounded-2xl p-6 border transition-colors ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className={`text-lg font-serif ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Your job listings</h2>
        {jobs.length > 0 && (
          <button onClick={onManage} className={`text-xs font-bold ${isDarkMode ? 'text-[#ea6036] hover:text-[#ff7a52]' : 'text-[#ea6036] hover:text-[#c84d27]'}`}>
            Manage listings →
          </button>
        )}
      </div>
      {preview.length === 0 ? (
        <p className={`py-8 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No listings yet. Use “+ Post new job” to publish your first role.</p>
      ) : (
        <>
          {preview.map((job) => (
            <div key={job.id} className={`flex items-center justify-between gap-4 border-b py-4 last:border-0 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
              <div className="min-w-0">
                <div className={`flex items-center gap-2 truncate text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {job.title}
                  <Badge positive={job.hiring_status !== 'closed'} isDarkMode={isDarkMode}>{job.hiring_status === 'closed' ? 'closed' : 'open'}</Badge>
                </div>
                <div className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{formatPostedDate(job.created_at)} - {job.work_type || 'Work type not specified'}</div>
              </div>
              <div className="flex shrink-0 items-center gap-6 text-right">
                <div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{applicantCountFor(applicants, job.id)}</div>
                  <div className={`text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>applicants</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>{topMatchFor(applicants, job.id)}</div>
                  <div className={`text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>top match</div>
                </div>
              </div>
            </div>
          ))}
          {jobs.length > preview.length && (
            <p className={`pt-3 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Showing {preview.length} of {jobs.length} listings.</p>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Dashboard home */
function Home({ userId, isDarkMode, jobs, setJobs, applicants, onNavigate }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyJobForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [pendingJobId, setPendingJobId] = useState(null);

  const stats = [
    [jobs.filter((j) => !j.is_archived && (j.hiring_status || 'open') === 'open').length, 'Active listings'],
    [applicants.length, 'Total applicants'],
    [applicants.filter((a) => a.status === 'Applied' || a.status === 'Pending').length, 'Awaiting review'],
    [applicants.filter((a) => a.status === 'Interview').length, 'Interviews scheduled'],
  ];
  const recentActivity = [...applicants].sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at)).slice(0, 5);

  const openCreate = () => { setForm(emptyJobForm); setMessage(null); setPendingJobId(null); setIsFormOpen(true); };
  const closeForm = () => { setIsFormOpen(false); };

  const handleSubmit = async (_event, attachmentState) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      let targetJobId = pendingJobId;
      if (!targetJobId) {
        const result = await saveJob({ mode: 'create', form });
        if (!result.success) {
          setMessage({ type: 'error', text: result.message || 'Something went wrong. Please try again.' });
          return false;
        }
        targetJobId = result.data.id;
        setPendingJobId(targetJobId);
        setJobs((current) => [result.data, ...current]);
      }

      if (attachmentState.files.some((entry) => entry.status !== 'uploaded')) {
        const uploadResult = await attachmentState.uploadAttachments(targetJobId, attachmentState.files);
        if (!uploadResult.success) {
          setMessage({ type: 'error', text: uploadResult.error || attachmentState.error || 'Some attachments failed to upload. Retry the failed files.' });
          return false;
        }
      }
      setIsFormOpen(false);
      setPendingJobId(null);
      return true;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className={`mb-1 text-sm font-semibold ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>Welcome back</div>
          <h1 className={`text-3xl sm:text-4xl font-serif mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Your hiring workspace</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Post roles, review ranked applicants and keep your hiring process moving.</p>
        </div>
        <button onClick={openCreate} className="rounded-xl px-6 py-2.5 text-sm font-bold text-white bg-[#ea6036] hover:bg-[#d8552e] transition-colors shadow-lg">
          + Post new job
        </button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className={`rounded-2xl p-6 border transition-colors ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className={`text-4xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</div>
            <div className={`mt-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <JobListingsPreview jobs={jobs} applicants={applicants} onManage={() => onNavigate('jobs')} isDarkMode={isDarkMode} />

        <div className={`self-start rounded-2xl p-6 border transition-colors ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h2 className={`mb-4 text-lg font-serif ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Recent activity</h2>
          {recentActivity.length === 0 ? (
            <p className={`text-sm py-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No candidate activity yet.</p>
          ) : (
            recentActivity.map((app) => (
              <div key={app.id} className={`border-b py-3.5 text-sm font-medium last:border-0 ${isDarkMode ? 'border-white/5 text-slate-300' : 'border-slate-100 text-slate-700'}`}>
                {candidateDisplay(app).name} applied for {app.job_postings?.title || 'a role'}
                <div className={`mt-1 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(app.applied_at).toLocaleDateString()}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {isFormOpen && (
        <JobFormModal mode="create" form={form} setForm={setForm} jobId={pendingJobId} recruiterId={userId} onClose={closeForm} onSubmit={handleSubmit} isSubmitting={isSubmitting} message={message} isDarkMode={isDarkMode} />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Job Listings page: review, edit, delete */
function JobsPage({ user, isDarkMode, setJobs, applicants, setApplicants }) {
  const [editingJob, setEditingJob] = useState(null);
  const [form, setForm] = useState(emptyJobForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [reviewJob, setReviewJob] = useState(null);
  const [jobToArchive, setJobToArchive] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const {
    jobs: visibleJobs,
    statusFilter,
    setStatusFilter,
    isLoading,
    error,
    clearError,
    pendingJobIds,
    archiveJob,
    restoreJob,
    toggleHiring,
    reload,
  } = useJobListings({ setDashboardJobs: setJobs });

  const openEdit = (job) => {
    setForm({
      title: job.title || '', location: job.location || '', work_type: job.work_type || 'Remote',
      employment_type: job.employment_type || 'Full-time', description: job.description || '', requirements: job.requirements || '',
    });
    setMessage(null);
    setEditingJob(job);
  };
  const closeForm = () => { setEditingJob(null); };

  const handleSubmit = async (_event, attachmentState) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const result = await saveJob({ mode: 'edit', jobId: editingJob.id, form });
      if (!result.success) {
        setMessage({ type: 'error', text: result.message || 'Something went wrong. Please try again.' });
        return false;
      }
      setJobs((current) => current.map((job) => (job.id === editingJob.id ? result.data : job)));

      if (attachmentState.files.some((entry) => entry.status !== 'uploaded')) {
        const uploadResult = await attachmentState.uploadAttachments(editingJob.id, attachmentState.files);
        if (!uploadResult.success) {
          setMessage({ type: 'error', text: uploadResult.error || attachmentState.error || 'Some attachments failed to upload. Retry the failed files.' });
          return false;
        }
      }

      await reload();
      setEditingJob(null);
      return true;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!jobToArchive) return;
    setIsArchiving(true);
    await archiveJob(jobToArchive.id);
    setIsArchiving(false);
    setJobToArchive(null);
  };

  const handleRestore = async (job) => {
    await restoreJob(job.id);
  };

  const handleStatusChange = (applicationId, status) => {
    setApplicants((current) => current.map((a) => (a.id === applicationId ? { ...a, status } : a)));
  };

  return (
    <section>
      <div className="mb-8">
        <div className={`mb-1 text-sm font-semibold ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>Job Listings</div>
        <h1 className={`text-3xl sm:text-4xl font-serif mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Manage your listings</h1>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Review applicants, manage hiring status, and archive listings you no longer need.</p>
      </div>

      {message && !editingJob && <p className="mb-5 text-sm font-medium text-red-500">{message.text}</p>}

      {error && (
        <div role="alert" className={`fixed bottom-5 right-5 z-40 flex max-w-md items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm shadow-xl ${isDarkMode ? 'border-red-900/50 bg-[#36191b] text-red-100' : 'border-red-200 bg-red-50 text-red-700'}`}>
          <span>{error}</span>
          <button type="button" aria-label="Dismiss error" onClick={clearError} className="rounded px-2 py-1 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500">×</button>
        </div>
      )}

      <div className={`rounded-2xl border p-6 transition-colors ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-white shadow-sm'}`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className={`text-lg font-serif ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>All listings ({visibleJobs.length})</h2>
          <div className={`inline-flex flex-wrap gap-1 rounded-xl p-1 ${isDarkMode ? 'bg-[#0a121c]' : 'bg-slate-100'}`} role="group" aria-label="Filter job listings">
            {JOB_STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={statusFilter === filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036] ${statusFilter === filter.value ? 'bg-[#ea6036] text-white shadow-sm' : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <p role="status" className={`py-8 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading listings…</p>
        ) : error ? (
          <div className={`py-8 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <p>Listings could not be loaded.</p>
            <button type="button" onClick={reload} className="mt-2 font-bold text-[#ea6036] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]">Try again</button>
          </div>
        ) : visibleJobs.length === 0 ? (
          <p className={`py-8 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No listings in this view.</p>
        ) : (
          <div className="flex flex-col">
            {visibleJobs.map((job) => (
              <JobListingItem
                key={job.id}
                job={job}
                applicantCount={applicantCountFor(applicants, job.id)}
                topMatch={topMatchFor(applicants, job.id)}
                isDarkMode={isDarkMode}
                isPending={pendingJobIds.includes(job.id)}
                onReview={setReviewJob}
                onEdit={openEdit}
                onArchive={setJobToArchive}
                onRestore={handleRestore}
                onToggleHiring={toggleHiring}
              />
            ))}
          </div>
        )}
      </div>

      {editingJob && (
        <JobFormModal mode="edit" form={form} setForm={setForm} jobId={editingJob.id} recruiterId={user.id} onClose={closeForm} onSubmit={handleSubmit} isSubmitting={isSubmitting} message={message} isDarkMode={isDarkMode} />
      )}
      {jobToArchive && (
        <ConfirmDialog
          title="Confirm archive"
          message="Archive this listing? It will be hidden from candidates but you can restore it anytime. Applicants and data are kept."
          confirmLabel="Archive"
          isDarkMode={isDarkMode}
          isWorking={isArchiving}
          onConfirm={handleArchive}
          onCancel={() => { if (!isArchiving) setJobToArchive(null); }}
        />
      )}
      {reviewJob && (
        <ReviewApplicationsModal job={reviewJob} onClose={() => setReviewJob(null)} onStatusChange={handleStatusChange} isDarkMode={isDarkMode} />
      )}
    </section>
  );
}

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [view, setView] = useState('home');
  const [user, setUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', !isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    getCurrentUser().then((response) => {
      if (!response.success || !response.data) {
        navigate('/login');
      } else if (response.data.user_metadata?.role !== 'recruiter') {
        navigate('/candidate-dashboard');
      } else {
        const metadata = response.data.user_metadata || {};
        const cleanName = (metadata.full_name || response.data.email?.split('@')[0] || 'Recruiter').trim();
        const nameParts = cleanName.split(/\s+/);
        const initials = nameParts.length > 1
          ? `${nameParts[0][0] || ''}${nameParts[nameParts.length - 1][0] || ''}`.toUpperCase()
          : cleanName.substring(0, 2).toUpperCase();

        setUser({ id: response.data.id, name: cleanName, email: response.data.email, initials });
        loadDashboardData(response.data.id);
      }
    });
  }, [navigate]);

  const loadDashboardData = async (userId) => {
    setIsLoading(true);

    const { data: fetchedJobs } = await supabase
      .from('job_postings')
      .select('*')
      .eq('recruiter_id', userId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });
    if (fetchedJobs) setJobs(fetchedJobs);

    const { data: fetchedApps, error: appsError } = await supabase
      .from('applications')
      .select(APPLICATION_SELECT)
      .eq('job_postings.recruiter_id', userId)
      .order('match_score', { ascending: false });

    if (appsError) console.error('Supabase Query Error:', appsError.message);
    else if (fetchedApps) setApplicants(fetchedApps);

    setIsLoading(false);
  };

  const handleLogout = async () => {
    const response = await logoutUser();
    if (response.success) navigate('/login');
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

  const content = view === 'pipeline'
    ? <PipelinePage user={user} isDarkMode={isDarkMode} />
    : view === 'jobs'
      ? <JobsPage user={user} isDarkMode={isDarkMode} setJobs={setJobs} applicants={applicants} setApplicants={setApplicants} />
      : <Home userId={user.id} isDarkMode={isDarkMode} jobs={jobs} setJobs={setJobs} applicants={applicants} onNavigate={setView} />;

  return (
    <div className={`min-h-screen font-sans selection:bg-[#ea6036]/30 transition-colors duration-200 ${isDarkMode ? 'bg-[#090e15] text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
      <TopHeader
        user={user}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
        openProfile={() => setIsProfileModalOpen(true)}
        logout={handleLogout}
      />
      <div className="flex max-w-[1400px] mx-auto">
        <Sidebar active={view} onNavigate={setView} isDarkMode={isDarkMode} />
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-8 lg:px-11">
          {content}
        </main>
      </div>

      {isProfileModalOpen && (
        <CompanyProfileModal
          user={user}
          isDarkMode={isDarkMode}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
}