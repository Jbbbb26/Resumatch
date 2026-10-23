import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../supabaseClient.js';
import { createApplicationForm } from '../../data/applicationForm';

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const emailLooksValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
const phoneLooksValid = (value) => /^\+?[0-9\s().-]{7,20}$/.test(String(value || '').trim());

function buildApplicationSnapshot(profile, authUser, resumeFile) {
  const resumeData = profile?.resume_data && typeof profile.resume_data === 'object'
    ? profile.resume_data : {};
  const populatedProfile = {
    ...profile,
    email: authUser?.email || profile?.email || '',
    // The parsed resume may have skills even if the top-level skills column is empty.
    skills: Array.isArray(profile?.skills) && profile.skills.length ? profile.skills : (resumeData.skills || []),
    education: Array.isArray(profile?.education) && profile.education.length ? profile.education : (resumeData.education || []),
  };
  const base = createApplicationForm(populatedProfile);
  const fullName = base.fullName.trim() || String(authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '').trim();
  const education = Array.isArray(base.education) ? base.education.filter((entry) =>
    hasText(String(entry.degreeLevel || '')) || hasText(String(entry.fieldOfStudy || '')) || hasText(String(entry.school || ''))
  ) : [];

  return {
    ...base,
    fullName,
    education,
    languages: (base.languages || []).filter((entry) => hasText(String(entry.language || ''))),
    qualifications: (base.qualifications || []).filter((entry) => hasText(String(entry.name || ''))),
    // Preserve all parsed experience in the saved applicant_details JSON snapshot.
    experience: Array.isArray(resumeData.experience) ? resumeData.experience : [],
    // The resume is referenced in Storage, not duplicated or re-uploaded.
    resumeBucket: resumeFile ? 'resumes' : null,
    resumeFilePath: resumeFile?.name || null,
    resumeFileName: resumeFile?.name || null,
    resumeFileUrl: resumeFile?.existingUrl || null,
  };
}

function getMissingInformation(details) {
  const missing = [];
  if (!hasText(details.fullName)) missing.push('Full name');
  if (!emailLooksValid(details.email)) missing.push('Valid email');
  if (!phoneLooksValid(details.phone)) missing.push('Valid phone number');
  if (!hasText(details.location)) missing.push('Location');
  if (!details.resumeFilePath && !details.resumeFileUrl) missing.push('Uploaded resume');
  if (!details.education?.some((entry) => hasText(String(entry.school || '')) &&
    (hasText(String(entry.degreeLevel || '')) || hasText(String(entry.fieldOfStudy || ''))))) {
    missing.push('Education');
  }
  if (!details.skills?.length) missing.push('Skills');
  return missing;
}

function CheckIcon({ good }) {
  return good ? (
    <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg>
  ) : (
    <svg className="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v6m0 3h.01" /></svg>
  );
}

/**
 * Quick Apply: read the candidate's latest saved profile and resume, then let them
 * explicitly confirm before using the existing apply_to_job RPC through onSubmit.
 * This replaces the long repeat-entry form, not the Supabase submission logic.
 */
export function ApplicationFormModal({ job, profile, isDarkMode, isSubmitting, submitError, onSubmit, onClose, onEditProfile }) {
  const [snapshot, setSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [localError, setLocalError] = useState('');
  const [consent, setConsent] = useState(false);
  const closeRef = useRef(null);
  const pendingRef = useRef(false);
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const heading = isDarkMode ? 'text-white' : 'text-[#1B2A5C]';
  const card = isDarkMode ? 'border-white/10 bg-[#121e2e]' : 'border-slate-200 bg-slate-50';

  const loadApplicant = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    setLocalError('');
    setConsent(false);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const authUser = auth?.user;
      if (!authUser) throw new Error('Sign in to continue your application.');

      const { data: freshProfile, error: profileError } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      if (profileError) throw profileError;

      const { data: objects, error: storageError } = await supabase.storage
        .from('resumes').list('', { search: `${authUser.id}-resume.` });
      if (storageError) throw new Error(`Could not check the uploaded resume: ${storageError.message}`);
      const uploaded = (objects || [])
        .filter((file) => file.name?.startsWith(`${authUser.id}-resume.`))
        .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))[0];
      // Some existing candidate records store a reference directly on the profile.
      const savedResumeUrl = freshProfile?.resumeFileUrl || freshProfile?.resume_file_url;
      const resumeFile = uploaded || (hasText(savedResumeUrl) ? { existingUrl: savedResumeUrl } : null);
      setSnapshot(buildApplicationSnapshot(freshProfile || profile || {}, authUser, resumeFile));
    } catch (error) {
      setLoadError(error?.message || 'Could not retrieve your saved candidate information.');
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => { loadApplicant(); }, [loadApplicant]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  const requestClose = useCallback(() => {
    if (!isSubmitting && !pendingRef.current) onClose();
  }, [isSubmitting, onClose]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.stopPropagation(); requestClose(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [requestClose]);

  const missing = useMemo(() => snapshot ? getMissingInformation(snapshot) : [], [snapshot]);
  const ready = Boolean(snapshot && !isLoading && !loadError && missing.length === 0);
  const details = [
    { label: 'Personal information', complete: !!snapshot && !missing.some((item) => ['Full name', 'Valid email', 'Valid phone number', 'Location'].includes(item)),
      detail: snapshot ? `${snapshot.fullName || 'Name missing'} · ${snapshot.email || 'Email missing'}` : 'Not loaded' },
    { label: 'Uploaded resume', complete: !!(snapshot?.resumeFilePath || snapshot?.resumeFileUrl),
      detail: snapshot?.resumeFileName || (snapshot?.resumeFileUrl ? 'Saved resume link' : 'No resume found') },
    { label: 'Education', complete: !!snapshot && !missing.includes('Education'),
      detail: snapshot?.education?.length ? `${snapshot.education.length} education entry/entries` : 'No education found' },
    { label: 'Skills', complete: !!snapshot?.skills?.length,
      detail: snapshot?.skills?.length ? snapshot.skills.slice(0, 5).join(', ') : 'No skills found' },
  ];

  const confirmApplication = async () => {
    if (!ready || !consent || isSubmitting || pendingRef.current) return;
    pendingRef.current = true;
    setLocalError('');
    try {
      const result = await onSubmit({ ...snapshot });
      if (result?.success === false) setLocalError(result.error || 'Application could not be submitted.');
    } catch (error) {
      setLocalError(error?.message || 'Application could not be submitted.');
    } finally {
      pendingRef.current = false;
    }
  };

  const editProfile = () => {
    if (isSubmitting || pendingRef.current) return;
    if (onEditProfile) {
      onEditProfile();
    } else {
      // Standalone Job Details page: return to the Candidate Dashboard and open profile.
      window.location.assign('/candidate-dashboard#edit-profile');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="quick-apply-title">
      <button type="button" aria-label="Close quick apply" className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={requestClose} />
      <div className={`relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${isDarkMode ? 'border-white/10 bg-[#0d1622]' : 'border-slate-200 bg-white'}`}>
        <header className={`flex shrink-0 items-start justify-between gap-3 border-b px-5 py-5 sm:px-7 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#4fa784]">Quick apply</p>
            <h2 id="quick-apply-title" className={`mt-1 text-2xl font-serif font-bold ${heading}`}>Confirm your application</h2>
            <p className={`mt-1 text-sm ${muted}`}>Review the information that will be shared with the recruiter.</p>
          </div>
          <button ref={closeRef} type="button" onClick={requestClose} aria-label="Close quick apply" className={`rounded-lg p-2 hover:bg-slate-500/10 ${muted}`}>✕</button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:px-7 sm:py-6">
          <div className={`rounded-xl border p-4 ${card}`}>
            <p className={`font-bold ${heading}`}>{job?.title || 'Job position'}</p>
            <p className={`mt-1 text-sm ${muted}`}>{job?.company_name || 'Company'}</p>
          </div>

          {isLoading ? (
            <p role="status" className={`py-5 text-sm ${muted}`}>Checking your saved candidate profile and resume…</p>
          ) : loadError ? (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
              <p>{loadError}</p>
              <button type="button" onClick={loadApplicant} className="mt-3 font-bold underline">Try again</button>
            </div>
          ) : (
            <>
              <h3 className={`text-sm font-bold ${heading}`}>Information to be submitted</h3>
              <div className="space-y-4">
                {details.map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-slate-100'}`}><CheckIcon good={item.complete} /></span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold ${heading}`}>{item.label}</p>
                      <p className={`mt-0.5 break-words text-xs ${muted}`}>{item.detail}</p>
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold ${item.complete ? 'text-emerald-500' : 'text-amber-500'}`}>{item.complete ? 'Ready' : 'Incomplete'}</span>
                  </div>
                ))}
              </div>

              {snapshot && (
                <div className={`rounded-xl border p-4 text-xs leading-6 ${card} ${muted}`}>
                  <p><span className="font-bold">Phone:</span> {snapshot.phone || 'Not provided'}</p>
                  <p><span className="font-bold">Location:</span> {snapshot.location || 'Not provided'}</p>
                  {snapshot.education?.length > 0 && <p><span className="font-bold">Education:</span> {snapshot.education.map((item) => [item.degreeLevel, item.fieldOfStudy, item.school].filter(Boolean).join(' · ')).join('; ')}</p>}
                  <p className="mt-2">Your saved profile details, education, skills, and resume reference will be included in the application. The resume file itself is not duplicated.</p>
                </div>
              )}

              {missing.length > 0 && (
                <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>Complete your profile before applying</p>
                  <p className={`mt-1 text-xs ${muted}`}>Missing or invalid: {missing.join(', ')}.</p>
                  <button type="button" onClick={editProfile} className="mt-3 rounded-lg bg-[#ea6036] px-4 py-2 text-xs font-bold text-white hover:bg-[#d8552e]">Update candidate profile</button>
                </div>
              )}

              {ready && (
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${card}`}>
                  <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={isSubmitting}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#ea6036]" />
                  <span className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    I have reviewed my saved information and agree to share these application details with this employer.
                  </span>
                </label>
              )}
            </>
          )}
          {(submitError || localError) && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{submitError || localError}</p>}
        </div>
        <footer className={`flex shrink-0 flex-wrap justify-end gap-3 border-t p-4 sm:px-7 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <button type="button" onClick={requestClose} disabled={isSubmitting} className={`rounded-xl border px-5 py-2.5 text-sm font-bold disabled:opacity-60 ${isDarkMode ? 'border-white/20 text-slate-200' : 'border-slate-300 text-slate-700'}`}>Cancel</button>
          <button type="button" onClick={confirmApplication} disabled={!ready || !consent || isSubmitting}
            className="rounded-xl bg-[#ea6036] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#d8552e] disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? 'Submitting…' : 'Confirm & apply'}
          </button>
        </footer>
      </div>
    </div>
  );
}
