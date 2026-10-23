import React from 'react';

const statusStyle = (status, isDarkMode) => {
  if (status === 'Interview' || status === 'Hired') return isDarkMode ? 'bg-[#4fa784]/15 text-[#4fa784]' : 'bg-emerald-100 text-emerald-700';
  if (status === 'Rejected') return isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600';
  return isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600';
};

// Candidate's application history: Job Title, Company, Date Applied, Status.
export const ApplicationsModal = ({ applications, isLoading, error, onClose, isDarkMode }) => {
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className={`fixed inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`} onClick={onClose}></div>
      <div className={`relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl ${isDarkMode ? 'bg-[#0d1622] border border-[#1b2b3b]' : 'bg-white border border-slate-200'}`}>
        <div className={`flex items-start justify-between gap-4 border-b p-6 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
          <div>
            <div className={`mb-1 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>Candidate applications</div>
            <h2 className={`text-2xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Your application history</h2>
            <p className={`mt-1 text-sm ${muted}`}>Every position you have applied for and where it stands.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="overflow-auto p-6">
          {error ? (
            <p className="text-sm text-red-500">Unable to load your applications: {error}</p>
          ) : isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className={`h-12 animate-pulse rounded-xl ${isDarkMode ? 'bg-[#121b27]' : 'bg-slate-100'}`} />)}
            </div>
          ) : applications.length === 0 ? (
            <p className={`py-10 text-center text-sm ${muted}`}>You haven't applied to any positions yet. Choose Apply on a job listing to get started.</p>
          ) : (
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr>
                  {['Job title', 'Company', 'Date applied', 'Status'].map((h) => (
                    <th key={h} className={`px-3 pb-3 text-[11px] font-bold uppercase tracking-wider ${muted}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className={`border-t ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                    <td className={`px-3 py-3.5 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {app.jobTitle}
                      {app.jobRemoved && <span className={`ml-2 text-[10px] font-normal ${muted}`}>(listing removed)</span>}
                    </td>
                    <td className={`px-3 py-3.5 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{app.company}</td>
                    <td className={`px-3 py-3.5 text-sm ${muted}`}>{new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="px-3 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyle(app.status, isDarkMode)}`}>{app.status === 'Rejected' ? 'Not selected' : app.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
