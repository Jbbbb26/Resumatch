import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser, getCurrentUser, updateUserMetadata, createPublicProfile } from "../../data/services/authService";
import { TopHeader } from "../components/TopHeader";
import { FilterModal } from "../components/FilterModal";
import { ApplicationsModal } from "../components/ApplicationsModal";
import { ProfileModal } from "../components/ProfileModal";
import { supabase } from "../../../supabaseClient.js";
import { JobCard } from "../components/JobCard";
import { useJobs } from "../../hooks/useJobs";

const profileFields = ["firstName", "lastName", "resumeFileUrl", "resume_data", "skills", "experience"];

const hasProfileValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(value);
};

const profileCompletion = (profile) => profile ? Math.round((profileFields.filter((field) => hasProfileValue(profile[field])).length / profileFields.length) * 100) : 0;
const jobText = (job) => [job.title, job.company_name, job.description, job.requirements, job.location, job.work_type, job.employment_type].filter(Boolean).join(" ").toLowerCase();

const formatShortDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const matchScoreOf = (job) => {
  const score = Number(job.match_score ?? job.matchScore);
  return Number.isFinite(score) && score > 0 ? Math.round(score) : null;
};

function JobSkeleton({ isDarkMode }) {
  return <div className={`h-[132px] rounded-2xl animate-pulse ${isDarkMode ? 'bg-[#121b27]' : 'bg-white border border-slate-200'}`} />;
}

/* ------------------------------------------------------------------ Left column: compact job list item (Prosple style) */
function JobListItem({ job, isSelected, isApplied, isSaved, onSelect, isDarkMode }) {
  const company = job.company_name || 'Company';
  const score = matchScoreOf(job);
  const isClosed = (job.hiring_status || 'open') === 'closed';

  const base = 'w-full text-left rounded-2xl border p-4 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]';
  const selectedStyle = isDarkMode
    ? 'border-[#ea6036] bg-[#162232] shadow-lg'
    : 'border-[#ea6036] bg-white shadow-lg ring-1 ring-[#ea6036]';
  const idleStyle = isDarkMode
    ? 'border-white/5 bg-[#121b27] hover:border-white/20'
    : 'border-slate-200 bg-white hover:border-slate-400 shadow-sm';
  const chip = isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600';

  return (
    <button type="button" onClick={() => onSelect(job.id)} aria-current={isSelected ? 'true' : undefined} className={`${base} ${isSelected ? selectedStyle : idleStyle}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ea6036] text-sm font-bold text-white" aria-hidden="true">
            {company.trim().charAt(0).toUpperCase() || '?'}
          </div>
          <span className={`truncate text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{company}</span>
        </div>
        {score !== null && (
          <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${isDarkMode ? 'bg-[#4fa784]/15 text-[#4fa784]' : 'bg-emerald-50 text-emerald-700'}`}>{score}% match</span>
        )}
      </div>

      <h3 className={`mt-3 text-base font-bold leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>

      <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        <span className="truncate">{job.location || 'Location not specified'}</span>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {job.employment_type && <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${chip}`}>{job.employment_type}</span>}
        {job.work_type && <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${chip}`}>{job.work_type}</span>}
        {isApplied && <span className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Applied</span>}
        {isClosed && <span className="rounded-md bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-600">Not hiring</span>}
        {isSaved && <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'bg-[#ea6036]/20 text-[#ff8a5c]' : 'bg-orange-50 text-[#ea6036]'}`}>Saved</span>}
      </div>

      {job.created_at && <p className={`mt-3 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Posted {formatShortDate(job.created_at)}</p>}
    </button>
  );
}

/* ------------------------------------------------------------------ Right column: details panel for the selected job */
function JobDetailsPanel({ job, onBack, isDarkMode, children }) {
  const panel = isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm';

  if (!job) {
    return (
      <div className={`hidden rounded-2xl border p-10 text-center text-sm lg:block ${panel} ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Select a job on the left to see its full details.
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 sm:p-6 ${panel}`}>
      <button
        type="button"
        onClick={onBack}
        className={`mb-4 inline-flex items-center gap-1.5 text-sm font-bold lg:hidden ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        Back to jobs
      </button>
      {children}
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
  const [titleQuery, setTitleQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savedError, setSavedError] = useState('');
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState('');
  const [isApplicationsOpen, setApplicationsOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const { jobs, isLoading: jobsLoading, error: jobsError, refetch: reloadJobs } = useJobs(user?.id, Boolean(user?.id));

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
            .select('id, job_posting_id, created_at, job_postings(id, title, location, work_type, employment_type, status, hiring_status, is_archived, created_at)')
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

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) navigate("/login");
  };

  const filteredJobs = useMemo(() => {
    const titleSearch = titleQuery.trim().toLowerCase();
    const locationSearch = locationQuery.trim().toLowerCase();
    return jobs.filter((job) => (!titleSearch || jobText(job).includes(titleSearch)) && (!locationSearch || [job.location, job.work_type].filter(Boolean).join(' ').toLowerCase().includes(locationSearch)));
  }, [jobs, titleQuery, locationQuery]);
  const visibleSavedJobs = savedJobs.filter((saved) => saved.job_postings
    && !saved.job_postings.is_archived
    && (saved.job_postings.hiring_status || 'open') === 'open');

  // Keep a valid job selected so the right-hand details panel is never empty on desktop.
  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedJobId(null);
      return;
    }
    if (!filteredJobs.some((job) => job.id === selectedJobId)) setSelectedJobId(filteredJobs[0].id);
  }, [filteredJobs, selectedJobId]);

  const selectedJob = filteredJobs.find((job) => job.id === selectedJobId) || null;

  const selectJob = (jobId) => {
    setSelectedJobId(jobId);
    setMobileDetailOpen(true);
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
            <button className="flex-1 md:flex-none px-8 py-2.5 bg-[#ea6036] hover:bg-[#d8552e] text-white text-sm font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg">
              Search
            </button>
          </div>
        </div>

        {/* ---------------- Split view: job list (left) + job details (right) ---------------- */}
        <div className="mb-2 flex items-center gap-2">
          <h2 className={`text-lg font-serif ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Recommended</h2>
          {!jobsLoading && !jobsError && (
            <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
            </span>
          )}
        </div>

        <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(340px,430px)_minmax(0,1fr)]">
          {/* Left: job listing */}
          <section aria-label="Job listings" className={mobileDetailOpen ? 'hidden lg:block' : ''}>
            <div className="space-y-3 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-2">
              {jobsError ? (
                <div role="alert" className={`rounded-2xl p-6 text-sm ${isDarkMode ? 'bg-[#121b27] text-slate-300' : 'bg-white text-slate-600'}`}>
                  <p>Unable to load job listings: {jobsError}</p>
                  <button type="button" onClick={reloadJobs} className="mt-3 font-bold text-[#ea6036] hover:underline">Retry</button>
                </div>
              ) : jobsLoading ? (
                <div className="space-y-3">{[0, 1, 2].map((index) => <JobSkeleton key={index} isDarkMode={isDarkMode} />)}</div>
              ) : filteredJobs.length === 0 ? (
                <p className={`rounded-2xl p-6 text-sm ${isDarkMode ? 'bg-[#121b27] text-slate-400' : 'bg-white text-slate-500'}`}>No jobs match your filters right now.</p>
              ) : (
                filteredJobs.map((job) => (
                  <JobListItem
                    key={job.id}
                    job={job}
                    isSelected={job.id === selectedJobId}
                    isApplied={applications.some((a) => a.jobId === job.id)}
                    isSaved={savedJobs.some((saved) => saved.job_posting_id === job.id)}
                    onSelect={selectJob}
                    isDarkMode={isDarkMode}
                  />
                ))
              )}
            </div>
            <p className={`text-xs mt-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <button className="text-[#3c8eec] hover:underline">Update your profile</button> to sharpen these recommendations, or use the search bar above.
            </p>
          </section>

          {/* Right: details of the selected job */}
          <section aria-label="Job details" className={`min-w-0 ${mobileDetailOpen ? '' : 'hidden lg:block'}`}>
            <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              <JobDetailsPanel job={selectedJob} onBack={() => setMobileDetailOpen(false)} isDarkMode={isDarkMode}>
                {selectedJob && (
                  <JobCard
                    key={selectedJob.id}
                    job={selectedJob}
                    profile={profile}
                    userId={user.id}
                    application={applications.find((a) => a.jobId === selectedJob.id)}
                    onApplied={() => loadApplications(user.id)}
                    onApplySuccess={() => { setSuccessToast(`Application submitted for ${selectedJob.title}.`); window.setTimeout(() => setSuccessToast(''), 4000); }}
                    savedRecord={savedJobs.find((saved) => saved.job_posting_id === selectedJob.id) || null}
                    onSavedChange={(record, isNowSaved) => {
                      setSavedError('');
                      setSavedJobs((current) => isNowSaved ? [record, ...current] : current.filter((saved) => saved.job_posting_id !== selectedJob.id));
                    }}
                    isDarkMode={isDarkMode}
                  />
                )}
              </JobDetailsPanel>
            </div>
          </section>
        </div>

        {/* ---------------- Saved jobs ---------------- */}
        <div className="mb-8">
          <h2 className={`text-lg font-serif mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Saved jobs</h2>
          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="space-y-4">
              {savedError && <p className="text-xs text-red-500">Unable to load saved jobs: {savedError}</p>}
              {visibleSavedJobs.length === 0 ? (
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Use the save button on each listing to keep it here — accessible from any device.</p>
              ) : (
                visibleSavedJobs.map((saved) => {
                  const isInList = filteredJobs.some((job) => job.id === saved.job_posting_id);
                  return (
                    <div key={saved.id} className={`flex items-start justify-between gap-3 border-b pb-4 last:border-0 last:pb-0 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                      <div className="min-w-0">
                        <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{saved.job_postings.title}</h3>
                        <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {saved.job_postings.location || 'Location not specified'} · {saved.job_postings.work_type || 'Work type not specified'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {isInList && (
                          <button type="button" onClick={() => { selectJob(saved.job_posting_id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-xs font-bold text-[#3c8eec] hover:underline">
                            View
                          </button>
                        )}
                        <button onClick={async () => {
                          const { error } = await supabase.from('saved_jobs').delete().eq('id', saved.id).eq('candidate_id', user.id);
                          if (error) setSavedError(error.message); else setSavedJobs((current) => current.filter((item) => item.id !== saved.id));
                        }} className="text-xs text-[#ea6036]">
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
          onClose={() => setProfileModalOpen(false)}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}