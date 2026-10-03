import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../../data/services/authService';
import { supabase } from '../../../supabaseClient.js';

const palette = {
  darkest: '#080e15', dark: '#0e1823', card: '#121f2d', border: '#1b2c3f',
  muted: '#71859c', accent: '#d85a30', sage: '#2a443a', sageLight: '#73ba96',
};

const dashboardListings = [
  { title: 'Senior Product Designer', workplace: 'Remote', applicants: 34, match: '91%', posted: 'Posted 4 days ago' },
  { title: 'Backend Engineer', workplace: 'Hybrid', applicants: 61, match: '88%', posted: 'Posted 9 days ago' },
  { title: 'Growth Marketing Lead', workplace: 'Remote', applicants: 12, match: '84%', posted: 'Posted 12 days ago' },
];

const listings = dashboardListings;

const emptyJobForm = {
  title: '',
  location: '',
  work_type: 'Remote',
  employment_type: 'Full-time',
  description: '',
  requirements: '',
};

const formatPostedDate = (createdAt) => `Posted ${new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

const candidates = [
  { name: 'Jamie Cruz', initials: 'JC', role: 'Senior Product Designer', score: 91, stage: 'Screened', applied: '2 days ago' },
  { name: 'Alex Tan', initials: 'AT', role: 'Product Designer', score: 85, stage: 'Applied', applied: '3 days ago' },
  { name: 'Priya Nair', initials: 'PN', role: 'Design Lead', score: 79, stage: 'Interview', applied: '5 days ago' },
  { name: 'Ravi Mehta', initials: 'RM', role: 'UI Designer', score: 58, stage: 'Applied', applied: '6 days ago' },
];

const stats = [
  ['5', 'Active listings', '+1 this week'], ['142', 'Total applicants', '+23 this week'],
  ['18', 'Awaiting review', ''], ['6', 'Interviews scheduled', ''],
];

function Badge({ children, positive = false }) {
  return <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ background: positive ? 'rgba(115,186,150,.15)' : 'rgba(27,44,63,.7)', color: positive ? palette.sageLight : palette.muted }}>{children}</span>;
}

function Sidebar({ active, onNavigate, onLogout, user }) {
  const items = [['home', 'Dashboard'], ['jobs', 'Job Management'], ['tracking', 'Applicant Tracking'], ['pipeline', 'Pipeline', '6'], ['messages', 'Messages', '3']];
  return <aside className="flex w-[250px] shrink-0 flex-col gap-8 px-5 py-7" style={{ background: palette.darkest }}>
    <div className="flex items-center gap-2.5"><div className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-lg font-bold" style={{ background: palette.sage }}>R</div><span className="text-xl font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>ResuMatch</span></div>
    <nav className="flex flex-col gap-1">{items.map(([id, label, badge]) => <button key={id} onClick={() => onNavigate(id)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm" style={{ background: active === id ? palette.sage : 'transparent', color: active === id ? '#fff' : '#cbd5e1', fontWeight: active === id ? 600 : 400 }}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />{label}{badge && <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{badge}</span>}</button>)}</nav>
    <div className="mt-auto border-t pt-4" style={{ borderColor: palette.border }}><div className="flex items-center gap-2.5"><div className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-xs font-bold" style={{ background: '#3b5b7a' }}>SM</div><div className="min-w-0"><div className="truncate text-[13px] font-semibold text-white">{user?.user_metadata?.full_name || 'Recruiter'}</div><div className="truncate text-[11px]" style={{ color: palette.muted }}>{user?.email || 'Recruiter workspace'}</div></div></div><button onClick={onLogout} className="mt-4 text-xs font-semibold" style={{ color: palette.accent }}>Sign out</button></div>
  </aside>;
}

function Home({ onNavigate }) {
  return <section><div className="mb-7 flex flex-wrap items-end justify-between gap-3.5"><div><div className="mb-1.5 text-sm font-semibold" style={{ color: palette.sageLight }}>Welcome back</div><h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>Your hiring workspace</h1><p className="mt-1.5 text-sm" style={{ color: palette.muted }}>Review ranked applicants and keep your hiring process moving.</p></div><button onClick={() => onNavigate('jobs')} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: palette.accent }}>+ Post new job</button></div><div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">{stats.map(([value, label, delta]) => <div key={label} className="rounded-xl p-5" style={{ background: palette.card, border: `1px solid ${palette.border}` }}><div className="text-3xl font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>{value}</div><div className="mt-1 text-xs" style={{ color: palette.muted }}>{label}</div>{delta && <div className="mt-1 text-[11px] font-semibold" style={{ color: palette.sageLight }}>{delta}</div>}</div>)}</div><div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"><div className="rounded-xl p-6" style={{ background: palette.card, border: `1px solid ${palette.border}` }}><h2 className="mb-3.5 text-lg font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>Your active listings</h2>{listings.map((listing) => <div key={listing.title} className="flex items-center justify-between border-b py-3.5 last:border-0" style={{ borderColor: palette.border }}><div><div className="text-sm font-semibold text-white">{listing.title}</div><div className="mt-0.5 text-xs" style={{ color: palette.muted }}>{listing.posted} - {listing.workplace}</div></div><div className="text-right"><div className="text-lg font-bold" style={{ color: palette.sageLight }}>{listing.applicants}</div><div className="text-[10px]" style={{ color: palette.muted }}>applicants</div></div></div>)}</div><div className="rounded-xl p-6" style={{ background: palette.card, border: `1px solid ${palette.border}` }}><h2 className="mb-3.5 text-lg font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>Recent activity</h2>{['New top match - Jamie Cruz scored 91%', 'New message from Alex Tan', 'Priya Nair moved to Interview'].map((activity) => <div key={activity} className="border-b py-3 text-sm last:border-0" style={{ borderColor: palette.border, color: '#e2e8f0' }}>{activity}<div className="mt-1 text-xs" style={{ color: palette.muted }}>Recently updated</div></div>)}</div></div></section>;
}

function Tracking() {
  const [selected, setSelected] = useState(null);
  return <section><div className="mb-7"><div className="mb-1.5 text-sm font-semibold" style={{ color: palette.sageLight }}>Applicant Tracking</div><h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>Auto-ranked applicant pool</h1><p className="mt-1.5 text-sm" style={{ color: palette.muted }}>Candidates are sorted by semantic match score.</p></div><div className="overflow-x-auto rounded-xl" style={{ background: palette.card, border: `1px solid ${palette.border}` }}><table className="w-full min-w-[680px] text-left"><thead><tr>{['Candidate', 'Match score', 'Applied', 'Stage'].map((heading) => <th key={heading} className="px-4 py-3 text-[11px] uppercase tracking-wide" style={{ color: palette.muted }}>{heading}</th>)}</tr></thead><tbody>{candidates.map((candidate) => <tr key={candidate.name} onClick={() => setSelected(selected === candidate.name ? null : candidate.name)} className="cursor-pointer border-t" style={{ borderColor: palette.border }}><td className="px-4 py-3.5"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: palette.accent }}>{candidate.initials}</div><div><div className="text-sm font-semibold text-white">{candidate.name}</div><div className="text-xs" style={{ color: palette.muted }}>{candidate.role}</div></div></div></td><td className="px-4 py-3.5"><div className="flex items-center gap-2"><div className="h-1.5 w-[70px] rounded-full" style={{ background: palette.border }}><div className="h-full rounded-full" style={{ width: `${candidate.score}%`, background: palette.sageLight }} /></div><strong style={{ color: palette.sageLight }}>{candidate.score}%</strong></div></td><td className="px-4 py-3.5 text-sm" style={{ color: palette.muted }}>{candidate.applied}</td><td className="px-4 py-3.5"><Badge positive={candidate.stage === 'Interview'}>{candidate.stage}</Badge></td></tr>)}</tbody></table></div>{selected && <div className="mt-5 rounded-xl p-6" style={{ background: palette.card, border: `1px solid ${palette.border}` }}><h2 className="text-lg font-semibold text-white">{selected}</h2><p className="mt-1 text-sm" style={{ color: palette.muted }}>Select an applicant row to review their profile and resume details.</p><button className="mt-5 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: palette.accent }}>View full resume</button></div>}</section>;
}

function JobFormModal({ form, setForm, onClose, onSubmit, isSubmitting, message }) {
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="new-job-title">
    <div className="fixed inset-0 bg-[#04080e]/80 backdrop-blur-md" onClick={onClose}></div>
    <form onSubmit={onSubmit} className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 shadow-2xl" style={{ background: palette.card, border: `1px solid ${palette.border}` }}>
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 id="new-job-title" className="text-xl font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>Post a new job listing</h2><p className="mt-1 text-sm" style={{ color: palette.muted }}>Add the role details candidates will see.</p></div><button type="button" onClick={onClose} aria-label="Close" className="text-xl text-slate-400 hover:text-white">×</button></div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 md:col-span-2"><span className="text-xs font-semibold" style={{ color: palette.muted }}>Job title *</span><input required value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="e.g. Senior Product Designer" className="rounded-lg px-3.5 py-2.5 text-sm text-white outline-none" style={{ background: palette.dark, border: `1px solid ${palette.border}` }} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold" style={{ color: palette.muted }}>Location</span><input value={form.location} onChange={(event) => updateField('location', event.target.value)} placeholder="City or region" className="rounded-lg px-3.5 py-2.5 text-sm text-white outline-none" style={{ background: palette.dark, border: `1px solid ${palette.border}` }} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold" style={{ color: palette.muted }}>Work type</span><select value={form.work_type} onChange={(event) => updateField('work_type', event.target.value)} className="rounded-lg px-3.5 py-2.5 text-sm text-white outline-none" style={{ background: palette.dark, border: `1px solid ${palette.border}` }}><option>Remote</option><option>Hybrid</option><option>On-site</option></select></label>
        <label className="flex flex-col gap-1.5 md:col-span-2"><span className="text-xs font-semibold" style={{ color: palette.muted }}>Employment type</span><select value={form.employment_type} onChange={(event) => updateField('employment_type', event.target.value)} className="rounded-lg px-3.5 py-2.5 text-sm text-white outline-none" style={{ background: palette.dark, border: `1px solid ${palette.border}` }}><option>Full-time</option><option>Part-time</option><option>Contract</option></select></label>
        <label className="flex flex-col gap-1.5 md:col-span-2"><span className="text-xs font-semibold" style={{ color: palette.muted }}>Description</span><textarea rows="4" value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Describe the role and responsibilities" className="resize-none rounded-lg px-3.5 py-2.5 text-sm text-white outline-none" style={{ background: palette.dark, border: `1px solid ${palette.border}` }} /></label>
        <label className="flex flex-col gap-1.5 md:col-span-2"><span className="text-xs font-semibold" style={{ color: palette.muted }}>Requirements</span><textarea rows="4" value={form.requirements} onChange={(event) => updateField('requirements', event.target.value)} placeholder="List the minimum qualifications and skills" className="resize-none rounded-lg px-3.5 py-2.5 text-sm text-white outline-none" style={{ background: palette.dark, border: `1px solid ${palette.border}` }} /></label>
      </div>
      {message && <p className="mt-4 text-sm" style={{ color: message.type === 'error' ? '#f28b72' : palette.sageLight }}>{message.text}</p>}
      <div className="mt-5 flex justify-end gap-2.5"><button type="button" onClick={onClose} className="rounded-lg border px-5 py-2.5 text-sm font-semibold text-slate-300" style={{ borderColor: palette.border }}>Cancel</button><button type="submit" disabled={isSubmitting} className="rounded-lg px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" style={{ background: palette.accent }}>{isSubmitting ? 'Publishing...' : 'Publish listing'}</button></div>
    </form>
  </div>;
}

function Jobs({ onNavigate, user }) {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(emptyJobForm);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadJobs = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      const { data, error } = await supabase.from('job_postings').select('*').eq('recruiter_id', user.id).order('created_at', { ascending: false });
      if (!isMounted) return;
      if (error) setMessage({ type: 'error', text: error.message });
      else setJobs(data || []);
      setIsLoading(false);
    };
    loadJobs();
    return () => { isMounted = false; };
  }, [user?.id]);

  const openForm = () => { setForm(emptyJobForm); setMessage(null); setIsFormOpen(true); };
  const closeForm = () => { if (!isSubmitting) setIsFormOpen(false); };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      // Route the data to your backend instead of Supabase directly
      // Adjust the URL if you are testing locally vs Railway
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${API_URL}/api/post-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          recruiter_id: user.id
        })
      });

      const result = await response.json();

      if (!result.success) {
        setMessage({ type: 'error', text: result.message });
      } else {
        // Instantly update the UI with the new vectorized job
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

  return <section><div className="mb-7"><div className="mb-1.5 text-sm font-semibold" style={{ color: palette.sageLight }}>Job Management</div><h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>Your listings</h1><p className="mt-1.5 text-sm" style={{ color: palette.muted }}>Post new roles and manage everything that is live.</p></div><div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6" style={{ background: palette.darkest }}><div><h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>Post a new job listing</h2><p className="mt-1 text-sm" style={{ color: palette.muted }}>Write the role once and generate a match vector automatically.</p></div><button onClick={openForm} className="rounded-lg px-5 py-2.5 text-sm font-bold text-white" style={{ background: palette.accent }}>+ New listing</button></div>{message && !isFormOpen && <p className="mb-4 text-sm" style={{ color: '#f28b72' }}>{message.text}</p>}<div className="flex flex-col gap-3">{isLoading ? [1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl" style={{ background: palette.card, border: `1px solid ${palette.border}` }} />) : jobs.length === 0 ? <div className="rounded-xl p-10 text-center" style={{ background: palette.card, border: `1px solid ${palette.border}` }}><p className="text-sm" style={{ color: palette.muted }}>No listings yet - post your first job.</p></div> : jobs.map((job) => <div key={job.id} className="flex flex-wrap items-center justify-between gap-5 rounded-xl p-5" style={{ background: palette.card, border: `1px solid ${palette.border}` }}><div><div className="flex items-center gap-2 text-[15px] font-bold text-white">{job.title}<Badge positive>{job.status || 'active'}</Badge></div><div className="mt-1 text-xs" style={{ color: palette.muted }}>{job.location || 'Location not specified'} - {job.work_type || 'Work type not specified'} - {job.employment_type || 'Employment type not specified'} - {formatPostedDate(job.created_at)}</div></div><div className="flex items-center gap-5"><div className="text-center"><div className="text-lg font-bold text-white">0</div><div className="text-[10px]" style={{ color: palette.muted }}>applicants</div></div><div className="text-center"><div className="text-lg font-bold" style={{ color: palette.sageLight }}>-</div><div className="text-[10px]" style={{ color: palette.muted }}>top match</div></div><button onClick={() => onNavigate('tracking')} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-300" style={{ borderColor: palette.border }}>Review</button><button onClick={() => handleDelete(job)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: palette.border, color: '#f28b72' }}>Delete</button></div></div>)}</div>{isFormOpen && <JobFormModal form={form} setForm={setForm} onClose={closeForm} onSubmit={handleSubmit} isSubmitting={isSubmitting} message={message} />}</section>;
}

function StaticJobs({ onNavigate }) {
  return <section><div className="mb-7"><div className="mb-1.5 text-sm font-semibold" style={{ color: palette.sageLight }}>Job Management</div><h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>Your listings</h1><p className="mt-1.5 text-sm" style={{ color: palette.muted }}>Post new roles and manage everything that is live.</p></div><div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6" style={{ background: palette.darkest }}><div><h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>Post a new job listing</h2><p className="mt-1 text-sm" style={{ color: palette.muted }}>Write the role once and generate a match vector automatically.</p></div><button onClick={() => onNavigate('tracking')} className="rounded-lg px-5 py-2.5 text-sm font-bold text-white" style={{ background: palette.accent }}>+ New listing</button></div><div className="flex flex-col gap-3">{listings.map((listing) => <div key={listing.title} className="flex flex-wrap items-center justify-between gap-5 rounded-xl p-5" style={{ background: palette.card, border: `1px solid ${palette.border}` }}><div><div className="flex items-center gap-2 text-[15px] font-bold text-white">{listing.title}<Badge positive>Active</Badge></div><div className="mt-1 text-xs" style={{ color: palette.muted }}>{listing.workplace} - Full-time - {listing.posted}</div></div><div className="flex items-center gap-5"><div className="text-center"><div className="text-lg font-bold text-white">{listing.applicants}</div><div className="text-[10px]" style={{ color: palette.muted }}>applicants</div></div><div className="text-center"><div className="text-lg font-bold" style={{ color: palette.sageLight }}>{listing.match}</div><div className="text-[10px]" style={{ color: palette.muted }}>top match</div></div><button onClick={() => onNavigate('tracking')} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-300" style={{ borderColor: palette.border }}>Review</button></div></div>)}</div></section>;
}

function SimpleView({ eyebrow, title, description }) {
  return <section><div className="mb-7"><div className="mb-1.5 text-sm font-semibold" style={{ color: palette.sageLight }}>{eyebrow}</div><h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'Georgia, serif' }}>{title}</h1><p className="mt-1.5 text-sm" style={{ color: palette.muted }}>{description}</p></div><div className="rounded-xl p-8" style={{ background: palette.card, border: `1px solid ${palette.border}` }}><p className="text-sm" style={{ color: palette.muted }}>This workspace view is ready for Supabase data wiring.</p></div></section>;
}

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('home');
  const [user, setUser] = useState(null);

  useEffect(() => { getCurrentUser().then((response) => { if (!response.success || !response.data) navigate('/login'); else if (response.data.user_metadata?.role !== 'recruiter') navigate('/candidate-dashboard'); else { setUser(response.data); setIsLoading(false); } }); }, [navigate]);

  const handleLogout = async () => { const response = await logoutUser(); if (response.success) navigate('/login'); };
  if (isLoading) return <div className="flex min-h-screen items-center justify-center" style={{ background: palette.darkest, color: palette.sageLight }}>Loading workspace...</div>;
  const content = view === 'home' ? <Home onNavigate={setView} /> : view === 'jobs' ? <Jobs onNavigate={setView} user={user} /> : view === 'tracking' ? <Tracking /> : view === 'pipeline' ? <SimpleView eyebrow="Pipeline Management" title="Hiring pipeline" description="Track candidates as they move through your hiring process." /> : view === 'messages' ? <SimpleView eyebrow="Messages & Scheduling" title="Conversations" description="Direct messages and status updates in one inbox." /> : null;
  return <div className="flex min-h-screen" style={{ background: palette.dark, fontFamily: 'Inter, system-ui, sans-serif' }}><Sidebar active={view} onNavigate={setView} onLogout={handleLogout} user={user} /><main className="min-w-0 flex-1 overflow-y-auto px-6 py-9 lg:px-11">{content}</main></div>;
}