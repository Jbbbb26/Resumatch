import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser, getCurrentUser, updateUserMetadata } from "../../data/services/authService";
import { TopHeader } from "../components/TopHeader";
import { FilterModal } from "../components/FilterModal";
import { ProfileModal } from "../components/ProfileModal";
import { supabase } from "../../../supabaseClient.js";

const profileFields = ["firstName", "lastName", "resumeFileUrl", "resume_data", "skills", "experience"];

const hasProfileValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(value);
};

const profileCompletion = (profile) => profile ? Math.round((profileFields.filter((field) => hasProfileValue(profile[field])).length / profileFields.length) * 100) : 0;
const jobText = (job) => [job.title, job.description, job.requirements, job.location, job.work_type, job.employment_type].filter(Boolean).join(" ").toLowerCase();

function JobCard({ job, isSaved, onToggleSave, isDarkMode, userId }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyStatus, setApplyStatus] = useState(null); 

  const handleApply = async (e) => {
    e.stopPropagation();
    if (isApplying || applyStatus === 'success') return;

    setIsApplying(true);
    setApplyStatus(null);

    try {
      const { error } = await supabase.from('applications').insert([{
  candidate_id: userId,
  job_id: job.id,
  match_score: job.match || 0,
  status: 'Applied'
}]);

      if (error) {
        if (error.code === '23505') {
          setApplyStatus('already_applied');
        } else {
          throw error;
        }
      } else {
        setApplyStatus('success');
      }
    } catch (err) {
      console.error("Application Error:", err);
      setApplyStatus('error');
    } finally {
      setIsApplying(false);
    }
  };


  const keywords = ['Design systems', 'B2B SaaS', 'Figma', 'User research', 'Cross-functional leadership', 'A/B testing'];

  return (
    <div className={`overflow-hidden rounded-2xl border transition-all duration-200 ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
      
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center justify-between gap-4 p-5 cursor-pointer group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
      >
        <div className="min-w-0 flex-1">
          <h3 className={`text-base font-bold group-hover:text-[#ea6036] transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {job.title}
          </h3>
          <p className={`text-xs mt-1 flex items-center flex-wrap gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{job.company_name || 'Company Name'}</span>
            <span>—</span>
            <span>{job.location || 'Remote'}</span>
            <span>—</span>
            <span className="font-semibold">{job.work_type || 'Full-time'}</span>
          </p>

          {!isExpanded && (
            <div className="flex gap-2 mt-2.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-[#1a2636] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {job.employment_type || 'Full-time'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-[#1a2636] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {job.work_type || 'Hybrid'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-right shrink-0">
          <button className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </button>

          <div className={`px-3 py-1.5 rounded-xl border text-center ${isDarkMode ? 'border-[#1b4332] bg-[#0c1a1a]/40' : 'border-emerald-200 bg-emerald-50/50'}`}>
            <span className="block text-base leading-none font-bold text-[#4fa784]">
              {job.match != null ? `${job.match}%` : '-'}
            </span>
            <span className={`text-[9px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-emerald-700/60'}`}>
              match score
            </span>
          </div>

          <svg className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>

      {isExpanded && (
        <div className={`px-5 pb-5 border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
          <div className="pt-4 space-y-5">

            <p className={`text-[13px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {job.description || "Lead end-to-end design for our core platform, owning the design system and mentoring two mid-level designers. We're looking for someone with strong B2B SaaS experience."}
            </p>

            <div>
              <h4 className={`text-xs font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Matched keywords</h4>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, idx) => (
                  <span key={idx} className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${idx > 2 ? (isDarkMode ? 'bg-[#0a121c] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600') : (isDarkMode ? 'bg-[#1b4332]/30 border-[#1b4332] text-slate-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800')}`}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleApply}
                disabled={isApplying || applyStatus === 'success' || applyStatus === 'already_applied'}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-sm ${applyStatus === 'success' || applyStatus === 'already_applied'
                    ? (isDarkMode ? 'bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-500 cursor-not-allowed')
                    : 'bg-[#4fa784] hover:bg-[#3d8c6d] text-white'
                  }`}
              >
                {isApplying ? 'Applying...'
                  : applyStatus === 'success' ? 'Applied Successfully'
                    : applyStatus === 'already_applied' ? 'Already Applied'
                      : 'One-click apply'}
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); onToggleSave(job.id); }}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors border ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-[#1a2636]' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
              >
                {isSaved ? 'Remove from saved' : 'Save for later'}
              </button>

              <button className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors border flex items-center gap-1.5 ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-[#1a2636]' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                Open
              </button>

              {applyStatus === 'error' && (
                <span className="text-[11px] text-red-500 font-medium">Failed to submit application.</span>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function JobSkeleton({ isDarkMode }) {
  return <div className={`h-[84px] rounded-2xl animate-pulse ${isDarkMode ? 'bg-[#121b27]' : 'bg-white border border-slate-200'}`} />;
}

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [titleQuery, setTitleQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [jobsError, setJobsError] = useState('');
  const [savedError, setSavedError] = useState('');

  useEffect(() => { document.documentElement.classList.toggle('light-mode', !isDarkMode); }, [isDarkMode]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
    }
  }, [isDarkMode]);

  const loadRecommendations = async (userId) => {
    try {
      const { data, error } = await supabase.rpc('get_recommended_jobs', {
        p_candidate_id: userId,
        match_threshold: 0.4, 
        match_count: 10       
      });

      if (error) throw error;

      if (data) {
        const rankedJobs = data.map(job => ({
          ...job,
          match: Math.round(job.similarity * 100)
        }));
        setJobs(rankedJobs);
      }
    } catch (err) {
      console.error("Matching Error:", err);
      setJobsError(err.message);
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

          if (metadata.role === 'recruiter') {
            navigate('/recruiter-dashboard');
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
          
          await loadRecommendations(response.data.id);
          
          const { data: savedData } = await supabase
            .from('saved_jobs')
            .select('id, job_posting_id, created_at, job_postings(id, title, location, work_type, employment_type, status, created_at)')
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
      />
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <p className={`text-sm mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Welcome back</p>
          <h1 className={`text-3xl sm:text-4xl font-serif mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Good to see you, {user?.name || 'There'}
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Your profile is <span className="text-[#4fa784] font-semibold">{profileCompletion(profile)}%</span> complete. Finish it to improve your match scores across every listing.
          </p>
        </div>

        <div className={`flex flex-col md:flex-row items-center gap-3 p-2 rounded-2xl border mb-12 shadow-lg transition-colors ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200'}`}>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <h2 className={`text-lg font-serif ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Recommended</h2>
              <svg className="w-4 h-4 text-slate-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div className="space-y-3">
              {jobsError ? (
                <p className="text-sm text-red-500">Unable to load listings: {jobsError}</p>
              ) : filteredJobs.length === 0 ? (
                <p className={`p-6 rounded-2xl text-sm ${isDarkMode ? 'bg-[#121b27] text-slate-400' : 'bg-white text-slate-500'}`}>No listings yet — check back soon.</p>
              ) : (
                filteredJobs.map((job) => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    userId={user.id}
                    isSaved={savedJobs.some((saved) => saved.job_posting_id === job.id)} 
                    onToggleSave={async (jobId) => {
                      const existing = savedJobs.find((saved) => saved.job_posting_id === jobId);
                      if (existing) {
                        const { error } = await supabase.from('saved_jobs').delete().eq('id', existing.id).eq('candidate_id', user.id);
                        if (error) setSavedError(error.message); else setSavedJobs((current) => current.filter((saved) => saved.id !== existing.id));
                      } else {
                        const { data, error } = await supabase.from('saved_jobs').insert([{ candidate_id: user.id, job_posting_id: jobId }]).select('id,job_posting_id,created_at,job_postings(id,title,location,work_type,employment_type,status,created_at)').single();
                        if (error) setSavedError(error.message); else setSavedJobs((current) => [data, ...current]);
                      }
                    }} 
                    isDarkMode={isDarkMode} 
                  />
                ))
              )}
            </div>
            <p className={`text-xs mt-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <button className="text-[#3c8eec] hover:underline">Update your profile</button> to sharpen these recommendations, or use the search bar above.
            </p>
          </div>

          <div className="lg:col-span-1">
            <h2 className={`text-lg font-serif mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Saved jobs</h2>
            <div className={`p-5 rounded-2xl border h-[calc(100%-2.5rem)] ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="space-y-4 mb-8">
                {savedError && <p className="text-xs text-red-500">Unable to load saved jobs: {savedError}</p>}
                {savedJobs.length === 0 ? (
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Use the save button on each listing to keep it here — accessible from any device.</p>
                ) : (
                  savedJobs.map((saved) => saved.job_postings && (
                    <div key={saved.id} className="flex items-start justify-between gap-3 border-b pb-4 last:border-0">
                      <div>
                        <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{saved.job_postings.title}</h3>
                        <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {saved.job_postings.location || 'Location not specified'} · {saved.job_postings.work_type || 'Work type not specified'}
                        </p>
                      </div>
                      <button onClick={async () => { 
                        const { error } = await supabase.from('saved_jobs').delete().eq('id', saved.id).eq('candidate_id', user.id); 
                        if (error) setSavedError(error.message); else setSavedJobs((current) => current.filter((item) => item.id !== saved.id)); 
                      }} className="text-xs text-[#ea6036]">
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
              <p className={`text-[11px] leading-relaxed border-t pt-4 ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                Use the save button on each job listing to keep it here — accessible from any device.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8">
          {[
            { value: "0", label: "Active applications" },
            { value: "0", label: "Interview requests" },
            { value: "—", label: "Average match score" }
          ].map((stat, idx) => (
            <div key={idx} className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
              <span className={`block text-4xl font-serif font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stat.value}</span>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{stat.label}</span>
            </div>
          ))}
        </div>
      </main>

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