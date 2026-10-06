import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../../data/services/authService';
import { supabase } from '../../../supabaseClient.js';
import { TopHeader } from '../components/TopHeader';
import { CompanyProfileModal } from '../components/CompanyProfileModal';
import { ProfileModal } from '../components/ProfileModal';

const emptyJobForm = {
  title: '', location: '', work_type: 'Remote', employment_type: 'Full-time', description: '', requirements: '',
};

const formatPostedDate = (createdAt) => `Posted ${new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

function Badge({ children, positive = false, isDarkMode }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${positive ? (isDarkMode ? 'bg-[#4fa784]/15 text-[#4fa784]' : 'bg-[#4fa784]/15 text-emerald-700') : (isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
      {children}
    </span>
  );
}

function Sidebar({ active, onNavigate, isDarkMode }) {
  const items = [
    ['home', 'Dashboard'], ['jobs', 'Job Management'], ['tracking', 'Applicant Tracking'], 
    ['pipeline', 'Pipeline'], ['messages', 'Messages']
  ];
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

function Home({ onNavigate, isDarkMode, jobs, applicants }) {
  const activeListingsCount = jobs.length;
  const totalApplicantsCount = applicants.length;
  const awaitingReviewCount = applicants.filter(a => a.status === 'Applied' || a.status === 'Pending').length;
  const interviewsCount = applicants.filter(a => a.status === 'Interview').length;

  const stats = [
    [activeListingsCount.toString(), 'Active listings'], 
    [totalApplicantsCount.toString(), 'Total applicants'],
    [awaitingReviewCount.toString(), 'Awaiting review'], 
    [interviewsCount.toString(), 'Interviews scheduled'],
  ];

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className={`mb-1 text-sm font-semibold ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>Welcome back</div>
          <h1 className={`text-3xl sm:text-4xl font-serif mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Your hiring workspace</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Review ranked applicants and keep your hiring process moving.</p>
        </div>
        <button onClick={() => onNavigate('jobs')} className="rounded-xl px-6 py-2.5 text-sm font-bold text-white bg-[#ea6036] hover:bg-[#d8552e] transition-colors shadow-lg">
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
      
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className={`rounded-2xl p-6 border transition-colors ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h2 className={`mb-4 text-lg font-serif ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Your active listings</h2>
          {jobs.length === 0 ? (
            <p className={`text-sm py-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No active listings. Post a job to get started.</p>
          ) : (
            jobs.slice(0, 5).map((listing) => {
              const appCount = applicants.filter(a => a.job_id === listing.id).length;
              return (
                <div key={listing.id} className={`flex items-center justify-between border-b py-4 last:border-0 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                  <div>
                    <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{listing.title}</div>
                    <div className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{formatPostedDate(listing.created_at)} - {listing.work_type}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>{appCount}</div>
                    <div className={`text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>applicants</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className={`rounded-2xl p-6 border transition-colors ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h2 className={`mb-4 text-lg font-serif ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Recent activity</h2>
          {applicants.length === 0 ? (
            <p className={`text-sm py-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No candidate activity yet.</p>
          ) : (
            applicants.slice(0, 4).map((app) => {
              const fname = app.candidate_profiles?.firstName || 'A candidate';
              const role = app.job_postings?.title || 'a role';
              return (
                <div key={app.id} className={`border-b py-3.5 text-sm font-medium last:border-0 ${isDarkMode ? 'border-white/5 text-slate-300' : 'border-slate-100 text-slate-700'}`}>
                  {fname} applied for {role}
                  <div className={`mt-1 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(app.applied_at).toLocaleDateString()}</div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  );
}

function Tracking({ isDarkMode, applicants }) {
  const [previewCandidate, setPreviewCandidate] = useState(null);

  const mappedCandidates = applicants.map(app => {
    const fname = app.candidate_profiles?.firstName || 'Unknown';
    const lname = app.candidate_profiles?.lastName || '';
    const name = `${fname} ${lname}`.trim();
    const initials = `${fname.charAt(0) || ''}${lname.charAt(0) || ''}`.toUpperCase() || 'C';
    
    return {
      id: app.id,
      candidateId: app.candidate_id, // Extracted to pass down to ProfileModal
      email: app.candidate_profiles?.email || 'No email provided',
      name,
      initials,
      role: app.job_postings?.title || 'Unknown Role',
      score: app.match_score ? Math.round(app.match_score) : 0, 
      stage: app.status || 'Applied',
      applied: new Date(app.applied_at).toLocaleDateString()
    };
  });

  return (
    <section>
      <div className="mb-8">
        <div className={`mb-1 text-sm font-semibold ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>Applicant Tracking</div>
        <h1 className={`text-3xl sm:text-4xl font-serif mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Auto-ranked applicant pool</h1>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Candidates are sorted by semantic match score.</p>
      </div>
      
      <div className={`overflow-x-auto rounded-2xl border transition-colors ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
        <table className="w-full min-w-[680px] text-left">
          <thead className={`${isDarkMode ? 'bg-[#0a121c]' : 'bg-slate-50'}`}>
            <tr>
              {['Candidate', 'Match score', 'Applied', 'Stage'].map((heading) => (
                <th key={heading} className={`px-5 py-4 text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mappedCandidates.length === 0 ? (
              <tr>
                <td colSpan="4" className={`px-5 py-8 text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  No applications found.
                </td>
              </tr>
            ) : mappedCandidates.map((candidate) => (
              <tr key={candidate.id} className={`border-t transition-colors ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'}`}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white bg-[#ea6036] shadow-sm">{candidate.initials}</div>
                    <div>
                      <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{candidate.name}</div>
                      <div className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{candidate.role}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-[70px] rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                      <div className={`h-full rounded-full ${isDarkMode ? 'bg-[#4fa784]' : 'bg-emerald-500'}`} style={{ width: `${candidate.score}%` }} />
                    </div>
                    <strong className={`font-bold ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>{candidate.score}%</strong>
                  </div>
                </td>
                <td className={`px-5 py-4 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{candidate.applied}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <Badge positive={candidate.stage === 'Interview'} isDarkMode={isDarkMode}>{candidate.stage}</Badge>
                    <button 
                      onClick={() => setPreviewCandidate(candidate)}
                      title="Preview Candidate Profile"
                      className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-[#ea6036]' : 'text-slate-500 hover:bg-slate-100 hover:text-[#ea6036]'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {previewCandidate && (
        <ProfileModal 
          user={{ 
            id: previewCandidate.candidateId, 
            name: previewCandidate.name, 
            initials: previewCandidate.initials,
            email: previewCandidate.email 
          }} 
          onClose={() => setPreviewCandidate(null)} 
          isDarkMode={isDarkMode} 
          isRecruiterView={true}  
        />
      )}
    </section>
  );
}

function JobFormModal({ form, setForm, onClose, onSubmit, isSubmitting, message, isDarkMode }) {
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const inputBg = isDarkMode ? 'bg-[#0a121c] border-white/10 text-white focus:border-[#ea6036]' : 'bg-white border-slate-300 text-slate-900 focus:border-[#ea6036] focus:ring-1 focus:ring-[#ea6036]';
  const labelColor = isDarkMode ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className={`fixed inset-0 backdrop-blur-sm transition-opacity ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`} onClick={onClose}></div>
      <form onSubmit={onSubmit} className={`relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 sm:p-8 shadow-2xl transition-colors ${isDarkMode ? 'bg-[#0d1622] border border-[#1b2b3b]' : 'bg-white border border-slate-200'}`}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className={`text-2xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Post a new job listing</h2>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Add the role details candidates will see.</p>
          </div>
          <button type="button" onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>Job title *</span>
            <input required value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Senior Product Designer" className={`rounded-xl px-4 py-3 text-sm outline-none border transition-colors ${inputBg}`} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>Location</span>
            <input value={form.location} onChange={(e) => updateField('location', e.target.value)} placeholder="City or region" className={`rounded-xl px-4 py-3 text-sm outline-none border transition-colors ${inputBg}`} />
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
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>Description</span>
            <textarea rows="4" value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Describe the role and responsibilities" className={`resize-none rounded-xl px-4 py-3 text-sm outline-none border transition-colors ${inputBg}`} />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>Requirements</span>
            <textarea rows="4" value={form.requirements} onChange={(e) => updateField('requirements', e.target.value)} placeholder="List the minimum qualifications and skills" className={`resize-none rounded-xl px-4 py-3 text-sm outline-none border transition-colors ${inputBg}`} />
          </label>
        </div>
        {message && <p className={`mt-5 text-sm font-medium ${message.type === 'error' ? 'text-red-500' : 'text-[#4fa784]'}`}>{message.text}</p>}
        <div className="mt-8 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={`rounded-xl border px-6 py-2.5 text-sm font-bold transition-colors ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>Cancel</button>
          <button type="submit" disabled={isSubmitting} className="rounded-xl px-6 py-2.5 text-sm font-bold text-white bg-[#ea6036] hover:bg-[#d8552e] shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Publishing...' : 'Publish listing'}</button>
        </div>
      </form>
    </div>
  );
}

function Jobs({ onNavigate, user, isDarkMode, jobs, setJobs, applicants }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(emptyJobForm);
  const [message, setMessage] = useState(null);

  const getApplicantCount = (jobId) => applicants.filter(a => a.job_id === jobId).length;
  
  const getTopMatch = (jobId) => {
    const jobApps = applicants.filter(a => a.job_id === jobId);
    if (!jobApps.length) return '-';
    const maxScore = Math.max(...jobApps.map(a => a.match_score || 0));
    return `${Math.round(maxScore)}%`;
  };

  const openForm = () => { setForm(emptyJobForm); setMessage(null); setIsFormOpen(true); };
  const closeForm = () => { if (!isSubmitting) setIsFormOpen(false); };
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/post-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recruiter_id: user.id })
      });
      const result = await response.json();
      if (!result.success) {
        setMessage({ type: 'error', text: result.message });
      } else {
        setJobs((current) => [result.data, ...current]);
        setIsFormOpen(false);
        setForm(emptyJobForm);
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Failed to connect to the AI server." });
    }
    setIsSubmitting(false);
  };
  
  const handleDelete = async (job) => {
    if (!window.confirm("Delete this listing? This can't be undone")) return;
    const { error } = await supabase.from('job_postings').delete().eq('id', job.id).eq('recruiter_id', user.id);
    if (error) setMessage({ type: 'error', text: error.message });
    else setJobs((current) => current.filter((item) => item.id !== job.id));
  };

  return (
    <section>
      <div className="mb-8">
        <div className={`mb-1 text-sm font-semibold ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>Job Management</div>
        <h1 className={`text-3xl sm:text-4xl font-serif mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Your listings</h1>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Post new roles and manage everything that is live.</p>
      </div>
      <div className={`mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6 border transition-colors ${isDarkMode ? 'bg-[#0a121c] border-white/5' : 'bg-slate-100 border-slate-200'}`}>
        <div>
          <h2 className={`text-lg font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Post a new job listing</h2>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Write the role once and generate a match vector automatically.</p>
        </div>
        <button onClick={openForm} className="rounded-xl px-6 py-2.5 text-sm font-bold text-white bg-[#ea6036] hover:bg-[#d8552e] shadow-md transition-all">+ New listing</button>
      </div>
      {message && !isFormOpen && <p className="mb-5 text-sm font-medium text-red-500">{message.text}</p>}
      
      <div className="flex flex-col gap-4">
        {jobs.length === 0 ? (
          <div className={`rounded-2xl p-12 text-center border ${isDarkMode ? 'bg-[#121b27] border-white/5 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-sm'}`}>
            <p className="text-sm">No listings yet - post your first job to see matches.</p>
          </div>
        ) : jobs.map((job) => (
          <div key={job.id} className={`flex flex-wrap items-center justify-between gap-5 rounded-2xl p-6 border transition-colors ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div>
              <div className={`flex items-center gap-3 text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {job.title}
                <Badge positive isDarkMode={isDarkMode}>{job.status || 'active'}</Badge>
              </div>
              <div className={`mt-1.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {job.location || 'Location not specified'} - {job.work_type || 'Work type not specified'} - {job.employment_type || 'Employment type not specified'} - {formatPostedDate(job.created_at)}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{getApplicantCount(job.id)}</div>
                <div className={`text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>applicants</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>{getTopMatch(job.id)}</div>
                <div className={`text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>top match</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onNavigate('tracking')} className={`rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-[#1a2636]' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Review</button>
                <button onClick={() => handleDelete(job)} className={`rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${isDarkMode ? 'border-red-900/50 text-red-400 hover:bg-red-900/20' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {isFormOpen && <JobFormModal form={form} setForm={setForm} onClose={closeForm} onSubmit={handleSubmit} isSubmitting={isSubmitting} message={message} isDarkMode={isDarkMode} />}
    </section>
  );
}

function SimpleView({ eyebrow, title, description, isDarkMode }) {
  return (
    <section>
      <div className="mb-8">
        <div className={`mb-1 text-sm font-semibold ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>{eyebrow}</div>
        <h1 className={`text-3xl sm:text-4xl font-serif mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
      </div>
      <div className={`rounded-2xl p-10 text-center border ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>This workspace view is ready for Supabase data wiring.</p>
      </div>
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
  
  // Real Data States
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);

  useEffect(() => { document.documentElement.classList.toggle('light-mode', !isDarkMode); }, [isDarkMode]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
    }
  }, [isDarkMode]);

  useEffect(() => { 
    getCurrentUser().then((response) => { 
      if (!response.success || !response.data) {
        navigate('/login'); 
      } else if (response.data.user_metadata?.role !== 'recruiter') {
        navigate('/candidate-dashboard'); 
      } else {
        const metadata = response.data.user_metadata || {};
        const rawName = metadata.full_name || response.data.email?.split('@')[0] || "Recruiter";
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
        
        loadDashboardData(response.data.id);
      } 
    }); 
  }, [navigate]);

  const loadDashboardData = async (userId) => {
    setIsLoading(true);
    
    // 1. Fetch Real Jobs
    const { data: fetchedJobs } = await supabase
      .from('job_postings')
      .select('*')
      .eq('recruiter_id', userId)
      .order('created_at', { ascending: false });
      
    if (fetchedJobs) setJobs(fetchedJobs);

    // 2. Fetch Real Applications (Updated to include candidate_id & email for ProfileModal)
    const { data: fetchedApps, error: appsError } = await supabase
      .from('applications')
      .select(`
        id, match_score, status, applied_at, job_id, candidate_id,
        job_postings!inner(title, recruiter_id),
        candidate_profiles(firstName, lastName, email)
      `)
      .eq('job_postings.recruiter_id', userId)
      .order('match_score', { ascending: false });

    if (appsError) {
      console.error("Supabase Query Error:", appsError.message);
    } else if (fetchedApps) {
      setApplicants(fetchedApps);
    }
    
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

  const content = view === 'home' ? <Home onNavigate={setView} isDarkMode={isDarkMode} jobs={jobs} applicants={applicants} /> 
    : view === 'jobs' ? <Jobs onNavigate={setView} user={user} isDarkMode={isDarkMode} jobs={jobs} setJobs={setJobs} applicants={applicants} /> 
    : view === 'tracking' ? <Tracking isDarkMode={isDarkMode} applicants={applicants} /> 
    : view === 'pipeline' ? <SimpleView eyebrow="Pipeline Management" title="Hiring pipeline" description="Track candidates as they move through your hiring process." isDarkMode={isDarkMode} /> 
    : view === 'messages' ? <SimpleView eyebrow="Messages & Scheduling" title="Conversations" description="Direct messages and status updates in one inbox." isDarkMode={isDarkMode} /> 
    : null;

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