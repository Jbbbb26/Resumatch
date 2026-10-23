import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../supabaseClient.js';
import { getCurrentUser, logoutUser } from '../../data/services/authService';
import { useJob } from '../../hooks/useJobs';
import { useJobAttachments } from '../../hooks/useJobAttachments';
import { useApplyToJob } from '../../hooks/useApplyToJob';
import { useSavedJob } from '../../hooks/useSavedJob';
import { TopHeader } from '../components/TopHeader';
import { ApplicationFormModal } from '../components/ApplicationFormModal';
import { AttachmentList } from '../components/AttachmentList';
import { JobDescription } from '../components/JobDescription';
import { KeywordChips } from '../components/KeywordChips';

const isDarkDefault = () => !document.documentElement.classList.contains('light-mode');

export default function JobDetailsPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(isDarkDefault);
  const [authLoading, setAuthLoading] = useState(true);
  const [isApplicationOpen, setApplicationOpen] = useState(false);
  const [application, setApplication] = useState(null);
  const [applicationLoading, setApplicationLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { job, isLoading: jobLoading, error: jobError } = useJob(jobId, user?.id, Boolean(user?.id));
  const { attachments, isLoading: attachmentsLoading, error: attachmentsError, getDownloadUrl } = useJobAttachments(job?.id, user?.id, Boolean(job?.id));
  const { isSaved, isLoading: savedLoading, error: savedError, toggle: toggleSaved } = useSavedJob({
    jobId: job?.id,
    userId: user?.id,
    onChange: () => setActionError(''),
  });
  const { apply, isSubmitting, error: applyError } = useApplyToJob({
    job,
    userId: user?.id,
    onSuccess: (data) => {
      setApplication({ status: 'Applied', statusUpdatedAt: data?.status_updated_at, appliedAt: data?.applied_at });
      setApplicationOpen(false);
      setSuccessMessage('Your application was submitted successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    },
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', !isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    let cancelled = false;
    const loadCandidate = async () => {
      try {
        const response = await getCurrentUser();
        if (!response.success || !response.data) {
          navigate('/login', { replace: true });
          return;
        }
        const role = response.data.user_metadata?.role;
        if (role !== 'job_seeker') {
          navigate(role === 'recruiter' ? '/recruiter-dashboard' : '/login', { replace: true });
          return;
        }
        if (cancelled) return;
        setUser({
          id: response.data.id,
          name: response.data.user_metadata?.full_name || response.data.email?.split('@')[0] || 'Candidate',
          email: response.data.email,
          initials: (response.data.user_metadata?.full_name || 'Candidate').slice(0, 2).toUpperCase(),
        });
        const { data, error } = await supabase.from('candidate_profiles').select('*').eq('id', response.data.id).maybeSingle();
        if (error) throw error;
        if (!cancelled) setProfile(data);
      } catch (loadError) {
        if (!cancelled) {
          console.error('Candidate job details load error:', loadError);
          navigate('/login', { replace: true });
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };
    loadCandidate();
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    if (!user?.id || !job?.id) return;
    let cancelled = false;
    const loadActions = async () => {
      setApplicationLoading(true);
      setActionError('');
      const applicationResult = await supabase.from('applications')
        .select('status,status_updated_at,applied_at')
        .eq('candidate_id', user.id)
        .eq('job_id', job.id)
        .maybeSingle();
      if (cancelled) return;
      if (applicationResult.error) {
        setActionError(applicationResult.error.message || 'Could not load application status.');
      } else {
        setApplication(applicationResult.data ? {
          status: applicationResult.data.status,
          statusUpdatedAt: applicationResult.data.status_updated_at,
          appliedAt: applicationResult.data.applied_at,
        } : null);
      }
      setApplicationLoading(false);
    };
    loadActions();
    return () => { cancelled = true; };
  }, [job?.id, user?.id]);

  useEffect(() => {
    if (!job) return undefined;
    const previousTitle = document.title;
    document.title = `${job.title} at ${job.company_name}`;
    return () => { document.title = previousTitle; };
  }, [job]);

  const handleDownload = async (attachment) => {
    const downloadWindow = window.open('about:blank', '_blank');
    const url = await getDownloadUrl(attachment.file_path);
    if (!url || !downloadWindow) {
      downloadWindow?.close();
      return false;
    }
    downloadWindow.opener = null;
    downloadWindow.location = url;
    return true;
  };

  const handleSave = async () => {
    setActionError('');
    await toggleSaved();
  };

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) navigate('/login');
  };

  const appState = (() => {
    if (!application) return 'new';
    if (application.status !== 'Rejected') return 'applied';
    const base = new Date(application.statusUpdatedAt || application.appliedAt);
    return Date.now() - base.getTime() >= 30 * 24 * 60 * 60 * 1000 ? 'reapply' : 'cooldown';
  })();
  const hiringOpen = job && !job.is_archived && (job.hiring_status || 'open') === 'open';
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  if (authLoading || (user && jobLoading)) {
    return <div role="status" className={`flex min-h-screen items-center justify-center text-sm ${isDarkMode ? 'bg-[#090e15] text-slate-300' : 'bg-slate-50 text-slate-500'}`}>Loading job details…</div>;
  }

  if (!user || jobError || !job) {
    return (
      <main className={`flex min-h-screen flex-col items-center justify-center px-5 text-center ${isDarkMode ? 'bg-[#090e15] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <h1 className="text-3xl font-serif font-bold">This job is no longer available</h1>
        <p className={`mt-3 max-w-md text-sm ${muted}`}>It may have been removed or is no longer visible. Browse current opportunities from your dashboard.</p>
        <Link to="/candidate-dashboard" className="mt-6 rounded-xl bg-[#ea6036] px-5 py-3 text-sm font-bold text-white">Back to dashboard</Link>
      </main>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-[#090e15] text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
      <TopHeader user={user} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode((value) => !value)} openProfile={() => navigate('/candidate-dashboard')} logout={handleLogout} openApplications={() => navigate('/candidate-dashboard')} applicationsCount={0} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <Link to="/candidate-dashboard" className={`mb-5 inline-flex text-sm font-semibold text-[#ea6036] hover:underline`}>← Back to jobs</Link>
        <article className={`rounded-2xl border p-5 shadow-sm sm:p-8 ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-white'}`}>
          <header className={`border-b pb-6 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#4fa784]">{job.company_name}</p>
                <h1 className={`mt-1 text-3xl font-serif font-bold sm:text-4xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h1>
                <p className={`mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm ${muted}`}>
                  {job.location && <span>{job.location}</span>}
                  {job.work_type && <span>{job.work_type}</span>}
                  {job.employment_type && <span>{job.employment_type}</span>}
                  {job.created_at && <span>Posted {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${hiringOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{hiringOpen ? 'Open' : 'Not hiring'}</span>
                <span className={`rounded-xl border px-3 py-2 text-center ${isDarkMode ? 'border-[#1b4332] bg-[#0c1a1a]/40' : 'border-emerald-200 bg-emerald-50/50'}`}><strong className="block text-lg leading-none text-[#4fa784]">{job.match == null ? '—' : `${job.match}%`}</strong><span className="text-[9px] uppercase">match</span></span>
              </div>
            </div>
          </header>

          <div className="space-y-7 py-6">
            <JobDescription text={job.description} isDarkMode={isDarkMode} collapsed={false} />
            <JobDescription text={job.requirements} isDarkMode={isDarkMode} label="Requirements" collapsed={false} />
            <KeywordChips job={job} profile={profile} isDarkMode={isDarkMode} />
            <AttachmentList attachments={attachments} isLoading={attachmentsLoading} error={attachmentsError} isDarkMode={isDarkMode} onDownload={handleDownload} />
          </div>

          <footer className={`flex flex-wrap items-center gap-3 border-t pt-5 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
            <button type="button" disabled={!hiringOpen || applicationLoading || isSubmitting || appState === 'applied' || appState === 'cooldown'} onClick={() => setApplicationOpen(true)} className="rounded-xl bg-[#4fa784] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
              {applicationLoading ? 'Loading…' : appState === 'applied' ? 'Applied' : appState === 'cooldown' ? 'Re-apply unavailable' : !hiringOpen ? 'Not hiring' : appState === 'reapply' ? 'Re-apply' : 'Apply'}
            </button>
            <button type="button" onClick={handleSave} disabled={savedLoading} className={`rounded-xl border px-5 py-3 text-sm font-bold disabled:opacity-60 ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{isSaved ? 'Remove from saved' : 'Save for later'}</button>
            {actionError && <p role="alert" className="w-full text-sm text-red-500">{actionError}</p>}
            {savedError && <p role="alert" className="w-full text-sm text-red-500">{savedError}</p>}
            {applyError && <p role="alert" className="w-full text-sm text-red-500">{applyError}</p>}
            {successMessage && <p role="status" className="w-full text-sm font-semibold text-emerald-600">{successMessage}</p>}
          </footer>
        </article>
      </main>
      {isApplicationOpen && <ApplicationFormModal job={job} profile={profile} isDarkMode={isDarkMode} isSubmitting={isSubmitting} submitError={applyError} onSubmit={apply} onClose={() => setApplicationOpen(false)} />}
    </div>
  );
}
