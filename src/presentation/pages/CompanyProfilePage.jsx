import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../supabaseClient.js';
import { jobTextOnly } from '../../data/services/jobText';
import { TopHeader } from '../components/TopHeader';
import { ProfileModal } from '../components/ProfileModal';
import { ApplicationsModal } from '../components/ApplicationsModal';
import { getCurrentUser, logoutUser } from '../../data/services/authService';

const formatDate = (value) => value
  ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  : '';

const getCompanyLogo = (company) => company?.logo_url || company?.company_logo_url
  || company?.companyLogo || company?.logoUrl || company?.logo || null;

const safeWebsite = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

const asText = (value) => typeof value === 'string' ? value.trim() : '';
const asItems = (value) => Array.isArray(value)
  ? value.filter((item) => typeof item === 'string' && item.trim())
  : (typeof value === 'string' ? value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean) : []);

function Section({ id, title, children, isDarkMode }) {
  return (
    <section id={id} className={`scroll-mt-6 rounded-[20px] p-6 shadow-sm sm:p-9 ${isDarkMode ? 'border border-white/10 bg-[#121b27]' : 'bg-white'}`}>
      <h2 className={`mb-5 text-xl font-bold sm:text-[22px] ${isDarkMode ? 'text-white' : 'text-[#16202A]'}`}>{title}</h2>
      {children}
    </section>
  );
}

export default function CompanyProfilePage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [headerUser, setHeaderUser] = useState(null);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isApplicationsOpen, setApplicationsOpen] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState('');

  // The company page opens in a new tab, so fetch the session for TopHeader.
  useEffect(() => {
    let mounted = true;
    const loadHeaderUser = async () => {
      const result = await getCurrentUser();
      if (!mounted || !result.success || !result.data) return;
      const authUser = result.data;
      const metadata = authUser.user_metadata || {};
      const fullName = (metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'User').trim();
      const parts = fullName.split(/\s+/).filter(Boolean);
      const initials = parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : fullName.slice(0, 2).toUpperCase();
      setHeaderUser({
        id: authUser.id,
        name: fullName,
        initials,
        email: authUser.email || '',
        role: metadata.role,
      });
      if (metadata.role === 'job_seeker') {
        const { count } = await supabase
          .from('applications')
          .select('id', { head: true, count: 'exact' })
          .eq('candidate_id', authUser.id);
        if (mounted && count !== null) setApplicationCount(count);
      }
    };
    loadHeaderUser();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', !isDarkMode);
    return () => document.documentElement.classList.remove('light-mode');
  }, [isDarkMode]);

  const handleLogout = async () => {
    if (!headerUser) return navigate('/login');
    const result = await logoutUser();
    if (result.success) navigate('/login');
  };

  const loadApplications = async () => {
    if (!headerUser?.id) return;
    setApplicationsLoading(true);
    setApplicationsError('');
    try {
      const { data, error: applicationError } = await supabase
        .from('applications')
        .select('*, job_postings(id, title, recruiter_id)')
        .eq('candidate_id', headerUser.id)
        .order('applied_at', { ascending: false });
      if (applicationError) throw applicationError;
      const recruiterIds = [...new Set((data || []).map((app) => app.job_postings?.recruiter_id).filter(Boolean))];
      const companyNames = {};
      if (recruiterIds.length) {
        const { data: employers, error: employerError } = await supabase
          .from('employers').select('id, companyName').in('id', recruiterIds);
        if (employerError) throw employerError;
        (employers || []).forEach((employer) => { companyNames[employer.id] = employer.companyName; });
      }
      setApplications((data || []).map((app) => ({
        id: app.id,
        jobId: app.job_id,
        jobTitle: app.job_postings?.title || 'Position no longer available',
        jobRemoved: !app.job_postings,
        company: companyNames[app.job_postings?.recruiter_id] || '—',
        appliedAt: app.applied_at,
        status: app.status || 'Applied',
      })));
      setApplicationCount((data || []).length);
    } catch (err) {
      setApplicationsError(err.message || 'Unable to load applications.');
    } finally {
      setApplicationsLoading(false);
    }
  };

  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [jobSearch, setJobSearch] = useState('');

  useEffect(() => {
    let active = true;
    const loadCompany = async () => {
      setIsLoading(true);
      setError('');
      try {
        // The company route uses the same recruiter ID as the job's recruiter_id.
        const [companyResult, jobsResult] = await Promise.all([
          supabase.from('employers').select('*').eq('id', companyId).maybeSingle(),
          supabase.from('job_postings')
            .select('id,title,description,location,work_type,employment_type,created_at,status,hiring_status,is_archived')
            .eq('recruiter_id', companyId)
            .eq('status', 'active')
            .eq('hiring_status', 'open')
            .eq('is_archived', false)
            .order('created_at', { ascending: false }),
        ]);
        if (companyResult.error) throw companyResult.error;
        if (jobsResult.error) throw jobsResult.error;
        if (!companyResult.data) throw new Error('This company profile could not be found.');
        if (active) {
          setCompany(companyResult.data);
          setJobs(jobsResult.data || []);
        }
      } catch (err) {
        if (active) setError(err.message || 'Unable to load this company.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    if (companyId) loadCompany();
    else { setIsLoading(false); setError('Company ID is missing.'); }
    return () => { active = false; };
  }, [companyId]);

  const name = asText(company?.companyName) || 'Company profile';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  const logo = getCompanyLogo(company);
  const about = asText(company?.description) || asText(company?.about);
  const industry = asText(company?.industry);
  const size = asText(company?.size) || asText(company?.company_size);
  const location = asText(company?.location);
  const website = safeWebsite(company?.website);
  const benefits = asItems(company?.benefits);
  // The HTML example has gallery and reviews. Render them only if the employer actually supplies data.
  const gallery = (Array.isArray(company?.gallery_photos) ? company.gallery_photos :
    Array.isArray(company?.photos) ? company.photos : [])
    .map((entry) => typeof entry === 'string' ? entry : (entry?.url || entry?.src))
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url));
  const reviews = Array.isArray(company?.reviews) ? company.reviews : [];
  const visibleJobs = useMemo(() => jobs.filter((job) =>
    [job.title, job.location, job.work_type].filter(Boolean).join(' ').toLowerCase().includes(jobSearch.trim().toLowerCase())),
  [jobs, jobSearch]);

  useEffect(() => {
    document.title = company?.companyName ? `${company.companyName} | ResuMatch` : 'Company profile | ResuMatch';
  }, [company?.companyName]);

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-[#090e15] text-slate-200' : 'bg-[#F3F5F8] text-[#16202A]'}`}>
      <TopHeader
        user={headerUser || { name: 'Guest', email: 'Sign in to use your account', initials: '?' }}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode((current) => !current)}
        openProfile={() => {
          if (!headerUser) return navigate('/login');
          if (headerUser.role === 'recruiter') return navigate('/recruiter-dashboard');
          setProfileOpen(true);
        }}
        logout={handleLogout}
        openApplications={headerUser?.role === 'job_seeker' ? () => {
          setApplicationsOpen(true);
          loadApplications();
        } : undefined}
        applicationsCount={applicationCount}
      />

      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
        <Link to={headerUser?.role === 'recruiter' ? '/recruiter-dashboard' : '/candidate-dashboard'}
          className={`inline-flex w-fit items-center gap-2 text-sm font-semibold transition-colors hover:text-[#ea6036] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" /></svg>
          Back to job search
        </Link>
        {isLoading ? (
          <div className={`rounded-[20px] p-10 text-center text-sm ${isDarkMode ? 'bg-[#121b27] text-slate-400' : 'bg-white text-[#4A5565]'}`} role="status">Loading company information…</div>
        ) : error ? (
          <div className={`rounded-[20px] p-8 ${isDarkMode ? 'bg-[#121b27]' : 'bg-white'}`} role="alert">
            <h1 className={`mb-2 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#1B2A5C]'}`}>Company profile unavailable</h1>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-[#4A5565]'}`}>{error}</p>
            <Link to="/candidate-dashboard" className={`mt-4 inline-block font-semibold underline ${isDarkMode ? 'text-orange-400' : 'text-[#1B2A5C]'}`}>Return to jobs</Link>
          </div>
        ) : (
          <>
            <header className={`overflow-hidden rounded-[20px] px-5 pt-6 shadow-sm sm:px-9 sm:pt-8 ${isDarkMode ? 'border border-white/10 bg-[#121b27]' : 'bg-white'}`}>
              <div className="flex flex-wrap items-center gap-5">
                <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[#E6F4F3] font-bold text-2xl text-[#0E8A86]">
                  {initials || '?'}
                  {logo && <img src={logo} alt={`${name} logo`} className="absolute inset-0 h-full w-full bg-white object-contain p-1" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className={`text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl ${isDarkMode ? 'text-white' : 'text-[#1B2A5C]'}`}>{name}</h1>
                  {industry && <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-[#4A5565]'}`}>{industry}</p>}
                  {location && <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-[#4A5565]'}`}>{location}</p>}
                </div>
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer"
                    className={`inline-flex min-h-11 items-center rounded-xl border px-5 text-sm font-bold transition-colors ${isDarkMode ? 'border-slate-500 text-white hover:bg-white/10' : 'border-[#1B2A5C] text-[#1B2A5C] hover:bg-[#1B2A5C] hover:text-white'}`}>
                    Visit website ↗
                  </a>
                )}
              </div>
              <nav className="mt-6 flex flex-wrap items-center gap-2" aria-label="Company sections">
                <a href="#about" className={`border-b-[3px] px-4 py-3 text-sm font-bold ${isDarkMode ? 'border-[#ea6036] text-white hover:bg-white/5' : 'border-[#1B2A5C] text-[#1B2A5C] hover:bg-slate-50'}`}>About</a>
                <a href="#jobs" className={`border-b-[3px] border-transparent px-4 py-3 text-sm font-bold ${isDarkMode ? 'text-slate-400 hover:border-[#ea6036] hover:text-white' : 'text-[#4A5565] hover:border-[#1B2A5C] hover:text-[#1B2A5C]'}`}>Jobs <span className="ml-1 rounded-full bg-[#E6F4F3] px-2 py-1 text-xs text-[#0A5C58]">{jobs.length}</span></a>
                {gallery.length > 0 && <a href="#gallery" className={`border-b-[3px] border-transparent px-4 py-3 text-sm font-bold ${isDarkMode ? 'text-slate-400 hover:border-[#ea6036] hover:text-white' : 'text-[#4A5565] hover:border-[#1B2A5C] hover:text-[#1B2A5C]'}`}>Life &amp; Culture</a>}
                {reviews.length > 0 && <a href="#reviews" className={`border-b-[3px] border-transparent px-4 py-3 text-sm font-bold ${isDarkMode ? 'text-slate-400 hover:border-[#ea6036] hover:text-white' : 'text-[#4A5565] hover:border-[#1B2A5C] hover:text-[#1B2A5C]'}`}>Reviews</a>}
              </nav>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <main className="min-w-0 space-y-6">
                <Section isDarkMode={isDarkMode} id="about" title="Company overview">
                  {about ? (
                    <>
                      <p className={`whitespace-pre-line text-[15px] leading-8 ${isDarkMode ? 'text-slate-300' : 'text-[#2B3644]'} ${showFullAbout ? '' : 'line-clamp-5'}`}>{about}</p>
                      {about.length > 350 && (
                        <button type="button" onClick={() => setShowFullAbout((current) => !current)} className={`mt-3 text-sm font-bold hover:underline ${isDarkMode ? 'text-orange-400' : 'text-[#1B2A5C]'}`}>
                          {showFullAbout ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </>
                  ) : <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-[#4A5565]'}`}>The employer has not provided a company overview yet.</p>}
                  {benefits.length > 0 && (
                    <div className="mt-6">
                      <h3 className={`mb-3 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-[#16202A]'}`}>Benefits</h3>
                      <div className="flex flex-wrap gap-2">{benefits.map((benefit, index) => <span key={`${benefit}-${index}`} className="rounded-full bg-[#E6F4F3] px-3 py-1.5 text-xs font-semibold text-[#0A5C58]">{benefit}</span>)}</div>
                    </div>
                  )}
                </Section>

                <Section isDarkMode={isDarkMode} id="jobs" title={`Jobs at ${name}`}>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-[#4A5565]'}`}>{jobs.length} open {jobs.length === 1 ? 'position' : 'positions'}</p>
                    {jobs.length > 3 && <input type="search" aria-label="Search this company's jobs" placeholder="Search jobs" value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} className={`min-h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-[#ea6036] sm:w-56 ${isDarkMode ? 'border-white/10 bg-[#0d1622] text-white' : 'border-[#E3E7EE] bg-white'}`} />}
                  </div>
                  {visibleJobs.length === 0 ? (
                    <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-[#4A5565]'}`}>{jobs.length ? 'No roles match your search.' : 'There are no currently open roles for this employer.'}</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {visibleJobs.map((job) => (
                        <article key={job.id} className={`flex flex-col gap-2 rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none ${isDarkMode ? 'border-white/10 hover:border-[#ea6036]' : 'border-[#E3E7EE] hover:border-[#1B2A5C]/50'}`}>
                          <h3 className={`text-base font-bold leading-snug ${isDarkMode ? 'text-white' : 'text-[#1B2A5C]'}`}>{job.title}</h3>
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-300' : 'text-[#2B3644]'}`}>{job.location || 'Location not specified'}</p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#4A5565]'}`}>{[job.employment_type, job.work_type].filter(Boolean).join(' · ')}</p>
                          {job.description && <p className={`line-clamp-3 text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-[#4A5565]'}`}>{jobTextOnly(job.description)}</p>}
                          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                            <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-[#4A5565]'}`}>{formatDate(job.created_at)}</span>
                            <Link to={`/candidate-dashboard/jobs/${encodeURIComponent(job.id)}`} className={`text-sm font-bold hover:underline ${isDarkMode ? 'text-orange-400' : 'text-[#1B2A5C]'}`}>View job</Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </Section>

                {gallery.length > 0 && (
                  <Section isDarkMode={isDarkMode} id="gallery" title="Life & Culture">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {gallery.map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${name} company photo ${index + 1}`} loading="lazy" className="h-44 w-full rounded-xl bg-[#E6F4F3] object-cover" />)}
                    </div>
                  </Section>
                )}

                {reviews.length > 0 && (
                  <Section isDarkMode={isDarkMode} id="reviews" title="Recent reviews">
                    <div className="space-y-4">
                      {reviews.map((review, index) => (
                        <article key={review?.id || index} className={`rounded-xl border p-5 ${isDarkMode ? 'border-white/10' : 'border-[#E3E7EE]'}`}>
                          <div className="mb-2 flex flex-wrap items-center gap-3">
                            {review?.rating != null && <span className="text-sm font-bold text-[#C2410C]">★ {review.rating}/5</span>}
                            {review?.role && <span className="text-sm font-semibold">{review.role}</span>}
                          </div>
                          {review?.title && <h3 className="mb-2 font-bold">{review.title}</h3>}
                          {review?.comment && <p className={`whitespace-pre-line text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-[#4A5565]'}`}>{review.comment}</p>}
                        </article>
                      ))}
                    </div>
                  </Section>
                )}
              </main>

              <aside className="rounded-[20px] bg-[#1B2A5C] p-7 text-white lg:sticky lg:top-6">
                <h2 className="mb-6 text-xs font-bold uppercase tracking-[0.12em] text-[#BFC8E6]">At a glance</h2>
                <dl className="space-y-5">
                  {industry && <div><dt className="text-sm text-[#BFC8E6]">Industry</dt><dd className="mt-1 font-bold">{industry}</dd></div>}
                  {size && <div><dt className="text-sm text-[#BFC8E6]">Company size</dt><dd className="mt-1 font-bold">{size}</dd></div>}
                  {location && <div><dt className="text-sm text-[#BFC8E6]">Location</dt><dd className="mt-1 font-bold">{location}</dd></div>}
                  <div><dt className="text-sm text-[#BFC8E6]">Open jobs</dt><dd className="mt-1 text-xl font-bold">{jobs.length}</dd></div>
                  {website && <div><dt className="text-sm text-[#BFC8E6]">Website</dt><dd className="mt-1 break-all text-sm font-semibold"><a href={website} target="_blank" rel="noopener noreferrer" className="hover:underline">{company.website} ↗</a></dd></div>}
                </dl>
              </aside>
            </div>
          </>
        )}
      </div>

      {isProfileOpen && headerUser && (
        <ProfileModal
          user={headerUser}
          isDarkMode={isDarkMode}
          onClose={() => setProfileOpen(false)}
        />
      )}
      {isApplicationsOpen && (
        <ApplicationsModal
          applications={applications}
          isLoading={applicationsLoading}
          error={applicationsError}
          onClose={() => setApplicationsOpen(false)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}
