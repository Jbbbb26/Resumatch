import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient.js';

// Read-only company profile a candidate sees when clicking "Open" on a job card.
// Shows the company, the role they opened, and the company's other open roles.
export const CompanyViewModal = ({ job, onClose, isDarkMode }) => {
  const [company, setCompany] = useState(null);
  const [otherJobs, setOtherJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);

      let recruiterId = job.recruiter_id;
      if (!recruiterId) {
        const { data } = await supabase.from('job_postings').select('recruiter_id').eq('id', job.id).maybeSingle();
        recruiterId = data?.recruiter_id;
      }

      if (recruiterId) {
        const [{ data: employer }, { data: jobs }] = await Promise.all([
          supabase.from('employers').select('*').eq('id', recruiterId).maybeSingle(),
          supabase.from('job_postings')
            .select('id, title, location, work_type, employment_type, status, hiring_status, is_archived, created_at')
            .eq('recruiter_id', recruiterId)
            .neq('id', job.id)
            .eq('is_archived', false)
            .eq('hiring_status', 'open')
            .order('created_at', { ascending: false }),
        ]);
        if (!cancelled) {
          setCompany(employer || null);
          setOtherJobs((jobs || []).filter((j) => (j.status || 'active') === 'active'));
        }
      }
      if (!cancelled) setIsLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [job.id, job.recruiter_id]);

  const name = company?.companyName || job.company_name || 'Company';
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  // Optional company columns: shown only if they exist in the employers table.
  const facts = [
    ['Industry', company?.industry],
    ['Company size', company?.size || company?.company_size],
    ['Location', company?.location],
    ['Website', company?.website],
  ].filter(([, v]) => v);
  const about = company?.description || company?.about;

  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const heading = isDarkMode ? 'text-white' : 'text-slate-900';
  const panel = isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-slate-50 border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className={`fixed inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`} onClick={onClose}></div>
      <div className={`relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl ${isDarkMode ? 'bg-[#0d1622] border border-[#1b2b3b]' : 'bg-white border border-slate-200'}`}>
        <div className={`flex items-start justify-between gap-4 border-b p-6 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#ea6036] font-serif text-lg font-bold text-white">{initials}</div>
            <div>
              <div className={`mb-0.5 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>Company profile</div>
              <h2 className={`text-2xl font-serif font-bold ${heading}`}>{isLoading ? 'Loading…' : name}</h2>
              {company?.email && <p className={`mt-0.5 text-xs ${muted}`}>{company.email}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-6">
          {(facts.length > 0 || about) && (
            <section>
              {facts.length > 0 && (
                <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {facts.map(([label, value]) => (
                    <div key={label} className={`rounded-xl border p-3 ${panel}`}>
                      <dt className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>{label}</dt>
                      <dd className={`mt-1 truncate text-sm font-semibold ${heading}`}>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {about && <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{about}</p>}
            </section>
          )}

          <section className={`rounded-2xl border p-5 ${panel}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${muted}`}>The role you opened</h3>
            <div className={`mt-2 text-lg font-bold ${heading}`}>{job.title}</div>
            <div className={`mt-1 text-xs ${muted}`}>
              {[job.location || 'Location not specified', job.work_type, job.employment_type].filter(Boolean).join(' · ')}
              {job.match != null && <span className="ml-2 font-bold text-[#4fa784]">{job.match}% match</span>}
            </div>
            {job.description && (
              <>
                <h4 className={`mt-4 text-xs font-bold ${heading}`}>Description</h4>
                <p className={`mt-1 whitespace-pre-line text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{job.description}</p>
              </>
            )}
            {job.requirements && (
              <>
                <h4 className={`mt-4 text-xs font-bold ${heading}`}>Requirements</h4>
                <p className={`mt-1 whitespace-pre-line text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{job.requirements}</p>
              </>
            )}
          </section>

          <section>
            <h3 className={`mb-3 text-sm font-bold ${heading}`}>Other open roles at {name}</h3>
            {isLoading ? (
              <div className={`h-12 animate-pulse rounded-xl ${isDarkMode ? 'bg-[#121b27]' : 'bg-slate-100'}`} />
            ) : otherJobs.length === 0 ? (
              <p className={`text-sm ${muted}`}>No other open roles right now.</p>
            ) : (
              <ul className="space-y-2">
                {otherJobs.map((j) => (
                  <li key={j.id} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${panel}`}>
                    <span className={`text-sm font-semibold ${heading}`}>{j.title}</span>
                    <span className={`text-xs ${muted}`}>{[j.location, j.work_type, j.employment_type].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
