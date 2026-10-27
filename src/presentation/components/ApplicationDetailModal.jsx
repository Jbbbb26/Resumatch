import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../supabaseClient.js';

const STEPS = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];
const REAPPLY_COOLDOWN_DAYS = 30;
const WITHDRAWABLE = ['Applied', 'Screening', 'Interview'];

const formatDate = (value, options) => (value ? new Date(value).toLocaleString(undefined, options) : '');
const isUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

function calendarLink({ title, start, details, location }) {
  const fmt = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const begin = new Date(start);
  const end = new Date(begin.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${fmt(begin)}/${fmt(end)}`, details: details || '', location: location || '' });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function ApplicationDetailModal({ applicationId, isDarkMode, onClose, onChanged }) {
  const [application, setApplication] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError('');
      const { data, error: loadError } = await supabase
        .from('applications')
        .select('id, job_id, status, applied_at, status_updated_at, withdrawn_at, interview_at, interview_mode, interview_location, interview_notes, candidate_feedback, job_postings(id, title, location, work_type, recruiter_id)')
        .eq('id', applicationId)
        .maybeSingle();
      if (cancelled) return;
      if (loadError || !data) {
        setError(loadError?.message || 'This application could not be found.');
        setIsLoading(false);
        return;
      }
      setApplication(data);
      const recruiterId = data.job_postings?.recruiter_id;
      if (recruiterId) {
        const { data: employer } = await supabase.from('employers').select('companyName').eq('id', recruiterId).maybeSingle();
        if (!cancelled) setCompanyName(employer?.companyName || '');
      }
      setIsLoading(false);
    };
    load();
    const channel = supabase
      .channel(`application-detail-${applicationId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications', filter: `id=eq.${applicationId}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [applicationId]);

  const heading = isDarkMode ? 'text-white' : 'text-slate-900';
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const card = isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50';

  const job = application?.job_postings;
  const title = job?.title || 'Position no longer available';
  const status = application?.status || 'Applied';
  const isRejected = status === 'Rejected';
  const isWithdrawn = status === 'Withdrawn';
  const canWithdraw = WITHDRAWABLE.includes(status);

  const withdraw = async () => {
    setIsWithdrawing(true);
    setWithdrawError('');
    const { data, error: rpcError } = await supabase.rpc('withdraw_application', { p_application_id: applicationId });
    setIsWithdrawing(false);
    if (rpcError) {
      setWithdrawError(rpcError.message || 'Could not withdraw this application.');
      return;
    }
    setConfirmingWithdraw(false);
    setApplication((current) => ({ ...current, ...(data || {}), status: 'Withdrawn', job_postings: current?.job_postings }));
    onChanged?.();
  };
  const stepIndex = STEPS.indexOf(status);
  const reapplyOn = isRejected
    ? new Date(new Date(application.status_updated_at || application.applied_at).getTime() + REAPPLY_COOLDOWN_DAYS * 86400000)
    : null;
  const interviewPast = application?.interview_at && new Date(application.interview_at) < new Date();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Close application details" onClick={onClose} className={`fixed inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`} />
      <section role="dialog" aria-modal="true" aria-labelledby="application-detail-title"
        className={`relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${isDarkMode ? 'border-[#1b2b3b] bg-[#0d1622]' : 'border-slate-200 bg-white'}`}>
        <header className={`flex items-start justify-between gap-4 border-b p-6 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
          <div className="min-w-0">
            <p className={`mb-1 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>Application details</p>
            <h2 id="application-detail-title" className={`text-2xl font-serif font-bold ${heading}`}>{isLoading ? 'Loading…' : title}</h2>
            {!isLoading && !error && (
              <p className={`mt-1 text-sm ${muted}`}>
                {[companyName, job?.location, `Applied ${formatDate(application.applied_at, { dateStyle: 'medium' })}`].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className={`rounded-full p-2 ${isDarkMode ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto p-6">
          {error ? (
            <p role="alert" className="text-sm text-red-500">{error}</p>
          ) : isLoading ? (
            <div className="space-y-3">{[0, 1].map((i) => <div key={i} className={`h-20 animate-pulse rounded-xl ${isDarkMode ? 'bg-[#121b27]' : 'bg-slate-100'}`} />)}</div>
          ) : (
            <>
              {isWithdrawn ? (
                <div className={`rounded-xl border p-4 ${card}`}>
                  <p className={`text-sm font-bold ${heading}`}>You withdrew this application</p>
                  <p className={`mt-1 text-xs ${muted}`}>
                    {formatDate(application.withdrawn_at || application.status_updated_at, { dateStyle: 'medium' })}. The recruiter has been told. You can apply for this position again at any time while it's open.
                  </p>
                </div>
              ) : isRejected ? (
                <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-red-900/50 bg-red-950/20' : 'border-red-200 bg-red-50'}`}>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>Not selected</p>
                  <p className={`mt-1 text-xs ${isDarkMode ? 'text-red-200/80' : 'text-red-700/80'}`}>Updated {formatDate(application.status_updated_at || application.applied_at, { dateStyle: 'medium' })}</p>
                </div>
              ) : (
                <ol className="flex items-center gap-1" aria-label={`Status: ${status}`}>
                  {STEPS.map((step, index) => {
                    const done = index <= stepIndex;
                    return (
                      <li key={step} className="flex flex-1 flex-col items-center gap-1.5">
                        <span className={`h-1.5 w-full rounded-full ${done ? 'bg-[#4fa784]' : (isDarkMode ? 'bg-white/10' : 'bg-slate-200')}`} />
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${index === stepIndex ? 'text-[#4fa784]' : muted}`}>{step}</span>
                      </li>
                    );
                  })}
                </ol>
              )}

              {status === 'Interview' && (
                <div className={`rounded-xl border p-4 ${card}`}>
                  <h3 className={`text-sm font-bold ${heading}`}>{interviewPast ? 'Your interview' : 'Your upcoming interview'}</h3>
                  {application.interview_at ? (
                    <>
                      <p className="mt-2 text-lg font-bold text-[#ea6036]">{formatDate(application.interview_at, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      <p className={`text-sm font-semibold ${heading}`}>{formatDate(application.interview_at, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</p>
                      <dl className="mt-3 space-y-1.5 text-sm">
                        {application.interview_mode && <div className="flex gap-2"><dt className={muted}>Format:</dt><dd className={heading}>{application.interview_mode}</dd></div>}
                        {application.interview_location && (
                          <div className="flex gap-2"><dt className={muted}>{application.interview_mode === 'Video call' ? 'Link:' : 'Where:'}</dt>
                            <dd className={`${heading} break-all`}>{isUrl(application.interview_location)
                              ? <a href={application.interview_location.trim()} target="_blank" rel="noopener noreferrer" className="text-[#3c8eec] hover:underline">{application.interview_location}</a>
                              : application.interview_location}</dd>
                          </div>
                        )}
                      </dl>
                      {application.interview_notes && (
                        <div className={`mt-3 border-t pt-3 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                          <p className={`mb-1 text-xs font-bold uppercase tracking-wider ${muted}`}>Message from the recruiter</p>
                          <p className={`whitespace-pre-line text-sm ${heading}`}>{application.interview_notes}</p>
                        </div>
                      )}
                      {!interviewPast && (
                        <a href={calendarLink({ title: `Interview: ${title}${companyName ? ` at ${companyName}` : ''}`, start: application.interview_at, details: application.interview_notes, location: application.interview_location })}
                          target="_blank" rel="noopener noreferrer"
                          className="mt-4 inline-flex rounded-xl bg-[#ea6036] px-4 py-2 text-sm font-bold text-white hover:bg-[#d8552e]">
                          Add to Google Calendar
                        </a>
                      )}
                    </>
                  ) : (
                    <p className={`mt-1 text-sm ${muted}`}>You've been moved to the interview stage. The recruiter hasn't set a date yet; you'll get a notification when they do.</p>
                  )}
                </div>
              )}

              {isRejected && (
                <div className={`rounded-xl border p-4 ${card}`}>
                  <h3 className={`text-sm font-bold ${heading}`}>Feedback from the recruiter</h3>
                  {application.candidate_feedback
                    ? <p className={`mt-2 whitespace-pre-line text-sm ${heading}`}>{application.candidate_feedback}</p>
                    : <p className={`mt-2 text-sm ${muted}`}>The recruiter didn't leave a reason for this decision.</p>}
                  {reapplyOn && (
                    <p className={`mt-3 text-xs ${muted}`}>
                      {Date.now() >= reapplyOn.getTime()
                        ? 'You can apply for this position again.'
                        : `You can apply for this position again from ${formatDate(reapplyOn, { dateStyle: 'medium' })}.`}
                    </p>
                  )}
                </div>
              )}

              {status === 'Screening' && <p className={`text-sm ${muted}`}>The recruiter is reviewing your application. You'll be notified when there's an update.</p>}
              {status === 'Applied' && <p className={`text-sm ${muted}`}>Your application has been received. You'll be notified when the recruiter moves it forward.</p>}
              {status === 'Offer' && <p className={`text-sm ${heading}`}>Congratulations, you have an offer for this position. The recruiter will contact you with the details.</p>}
              {status === 'Hired' && <p className={`text-sm ${heading}`}>Congratulations, you've been hired for this position!</p>}

              {canWithdraw && (
                <div className={`border-t pt-4 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                  {!confirmingWithdraw ? (
                    <button type="button" onClick={() => { setConfirmingWithdraw(true); setWithdrawError(''); }}
                      className={`rounded-xl border px-4 py-2 text-sm font-bold ${isDarkMode ? 'border-red-900/60 text-red-300 hover:bg-red-950/30' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                      Withdraw application
                    </button>
                  ) : (
                    <div role="alertdialog" aria-labelledby="withdraw-confirm-title" className={`rounded-xl border p-4 ${isDarkMode ? 'border-red-900/60 bg-red-950/20' : 'border-red-200 bg-red-50'}`}>
                      <p id="withdraw-confirm-title" className={`text-sm font-bold ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>Withdraw your application for {title}?</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-red-200/80' : 'text-red-700/80'}`}>
                        The recruiter will be notified and you'll be removed from their hiring pipeline{status === 'Interview' ? ', including your scheduled interview' : ''}. You can apply again later if the job is still open.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={withdraw} disabled={isWithdrawing} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                          {isWithdrawing ? 'Withdrawing…' : 'Yes, withdraw'}
                        </button>
                        <button type="button" onClick={() => setConfirmingWithdraw(false)} disabled={isWithdrawing} className={`rounded-xl border px-4 py-2 text-sm font-bold ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-white'}`}>
                          Keep application
                        </button>
                      </div>
                    </div>
                  )}
                  {withdrawError && <p role="alert" className="mt-2 text-sm text-red-500">{withdrawError}</p>}
                </div>
              )}
              {['Offer', 'Hired'].includes(status) && (
                <p className={`text-xs ${muted}`}>To decline at this stage, please contact the recruiter directly.</p>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {job?.id && (
                  <Link to={`/candidate-dashboard/jobs/${job.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-semibold text-[#ea6036] hover:underline">
                    View job posting
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
