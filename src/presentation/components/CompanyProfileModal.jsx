import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient.js';

export const CompanyProfileModal = ({ user, onClose, isDarkMode = true }) => {
  const [activeTab, setActiveTab] = useState('about');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [jobs, setJobs] = useState([]);
  
  const [companyData, setCompanyData] = useState({
    website: '',
    industry: 'Business Support Services',
    size: '51-100',
    location: 'Makati, Metro Manila, Philippines',
    description: 'Established and managed by professionals with over 50 years of combined management experience in Information Technology, Human Resource, Sales, and Marketing disciplines.'
  });

  useEffect(() => {
    const fetchJobs = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('job_postings')
        .select('*')
        .eq('recruiter_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setJobs(data);
    };
    fetchJobs();
  }, [user?.id]);

  const handleSave = async () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsEditing(false);
    }, 800);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const updateField = (field, value) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  const inputClass = `w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#ea6036] transition-colors ${isDarkMode ? 'bg-[#0a121c] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`;
  const labelClass = `text-xs font-bold uppercase tracking-wider mb-1.5 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200" aria-modal="true">
      <div className={`fixed inset-0 backdrop-blur-md transition-opacity ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`} onClick={handleOverlayClick}></div>
      
      <div className={`relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] transition-colors duration-200 ${isDarkMode ? 'bg-[#0d1622] border border-[#1b2b3b]' : 'bg-white border border-slate-200'}`}>
        
        {/* Header Section */}
        <div className={`p-6 sm:p-8 border-b ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-slate-50'}`}>
          <button onClick={onClose} className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-20 ${isDarkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-sm transition-colors ${isDarkMode ? 'bg-[#0a121c] border border-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}>
              {user?.initials || 'CO'}
            </div>
            <div>
              <h1 className={`text-2xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {user?.name || 'Company Workspace'}
              </h1>
              <div className={`flex items-center gap-2 mt-1.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-[#ea6036]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                  4.8 (5 reviews)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex items-center gap-6 px-6 sm:px-8 border-b transition-colors ${isDarkMode ? 'border-[#1b2b3b]' : 'border-slate-200'}`}>
          {['about', 'jobs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-bold capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-[#ea6036] text-[#ea6036]' : `border-transparent ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}`}
            >
              {tab} {tab === 'jobs' && <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'jobs' ? 'bg-[#ea6036]/10' : (isDarkMode ? 'bg-white/10' : 'bg-slate-100')}`}>{jobs.length}</span>}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          
          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Company overview</h2>
                <button
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  disabled={isSaving}
                  className={`px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 ${isEditing ? 'bg-[#4fa784] hover:bg-[#3d8c6d] text-white' : `border ${isDarkMode ? 'bg-[#1a2636] hover:bg-[#233348] border-white/10 text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'}`}`}
                >
                  {isSaving ? 'Saving...' : isEditing ? 'Save Details' : 'Edit Profile'}
                </button>
              </div>

              {isEditing ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div><label className={labelClass}>Website</label><input value={companyData.website} onChange={e => updateField('website', e.target.value)} placeholder="https://..." className={inputClass} /></div>
                  <div><label className={labelClass}>Industry</label><input value={companyData.industry} onChange={e => updateField('industry', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Company Size</label><input value={companyData.size} onChange={e => updateField('size', e.target.value)} placeholder="e.g. 51-100" className={inputClass} /></div>
                  <div><label className={labelClass}>Primary Location</label><input value={companyData.location} onChange={e => updateField('location', e.target.value)} className={inputClass} /></div>
                  <div className="sm:col-span-2"><label className={labelClass}>About the Company</label><textarea rows="5" value={companyData.description} onChange={e => updateField('description', e.target.value)} className={`resize-none ${inputClass}`} /></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-8">
                    <div className="sm:col-span-1 text-sm font-bold text-slate-500">Website</div>
                    <div className={`sm:col-span-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{companyData.website ? <a href={companyData.website} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">{companyData.website}</a> : 'Not provided'}</div>
                    
                    <div className="sm:col-span-1 text-sm font-bold text-slate-500">Industry</div>
                    <div className={`sm:col-span-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{companyData.industry || '-'}</div>
                    
                    <div className="sm:col-span-1 text-sm font-bold text-slate-500">Company size</div>
                    <div className={`sm:col-span-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{companyData.size || '-'}</div>
                    
                    <div className="sm:col-span-1 text-sm font-bold text-slate-500">Primary location</div>
                    <div className={`sm:col-span-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{companyData.location || '-'}</div>
                  </div>
                  
                  <div className={`pt-6 border-t leading-relaxed text-sm ${isDarkMode ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                    {companyData.description || 'No description provided.'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* JOBS TAB */}
          {activeTab === 'jobs' && (
            <div className="animate-in fade-in duration-300">
               <h2 className={`mb-6 text-xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Active Roles</h2>
               
               <div className="grid gap-4 sm:grid-cols-2">
                 {jobs.length === 0 ? (
                   <div className={`sm:col-span-2 py-10 text-center rounded-xl border ${isDarkMode ? 'bg-[#121b27] border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                     <p className="text-sm">No active jobs posted yet.</p>
                   </div>
                 ) : jobs.map((job) => (
                   <div key={job.id} className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#121b27] border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:shadow-md'}`}>
                     <div className="flex justify-between items-start mb-3">
                       <div>
                         <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                         <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{user?.name} • {job.location}</p>
                       </div>
                     </div>
                     <p className={`text-xs line-clamp-2 leading-relaxed mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                       {job.description}
                     </p>
                     <div className={`flex items-center justify-between text-[11px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                       <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                       <span className={`px-2 py-1 rounded-md ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>{job.work_type}</span>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};