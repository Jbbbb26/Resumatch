import { useState } from 'react';
import { getPipelinePerson } from '../../data/pipelineStages';
import { usePipeline } from '../../hooks/usePipeline';
import { CandidateDrawer } from '../components/pipeline/CandidateDrawer';
import { PipelineBoard } from '../components/pipeline/PipelineBoard';
import { PipelineToolbar } from '../components/pipeline/PipelineToolbar';
import { RejectDialog } from '../components/pipeline/RejectDialog';

function PipelineSkeleton({ isDarkMode }) {
  return (
    <div className="flex min-w-max gap-4 overflow-hidden" aria-label="Loading hiring pipeline">
      {[0, 1, 2, 3, 4, 5].map((column) => (
        <div key={column} className={`h-[min(68vh,680px)] w-[300px] animate-pulse rounded-2xl border p-4 ${isDarkMode ? 'border-white/5 bg-[#101924]' : 'border-slate-200 bg-slate-100'}`}>
          <div className={`mb-5 h-8 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-white'}`} />
          {[0, 1, 2].map((card) => <div key={card} className={`mb-3 h-28 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-white'}`} />)}
        </div>
      ))}
    </div>
  );
}

export function PipelinePage({ user, isDarkMode }) {
  const pipeline = usePipeline(user?.id);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [rejectApplication, setRejectApplication] = useState(null);
  const heading = isDarkMode ? 'text-white' : 'text-slate-900';
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  const requestReject = (application) => setRejectApplication(application);
  const confirmReject = async (reason) => {
    if (rejectApplication) {
      await pipeline.moveCandidate(rejectApplication.id, 'rejected', reason);
      setRejectApplication(null);
    }
  };

  return (
    <section>
      <div className="mb-7">
        <div className={`mb-1 text-sm font-semibold ${isDarkMode ? 'text-[#4fa784]' : 'text-emerald-600'}`}>Pipeline Management</div>
        <h1 className={`mb-2 font-serif text-3xl sm:text-4xl ${heading}`}>Hiring pipeline</h1>
        <p className={`text-sm ${muted}`}>Track candidates as they move through your hiring process.</p>
      </div>

      {pipeline.error && (
        <div role="alert" className={`fixed bottom-5 right-5 z-40 flex max-w-lg items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl ${isDarkMode ? 'border-red-900/50 bg-[#36191b] text-red-100' : 'border-red-200 bg-red-50 text-red-700'}`}>
          <span>{pipeline.error}</span>
          <button type="button" onClick={pipeline.refetch} className="shrink-0 rounded-lg bg-[#ea6036] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#d8552e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]">Retry</button>
          <button type="button" aria-label="Dismiss pipeline error" onClick={() => pipeline.setError('')} className="rounded px-2 py-1 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500">×</button>
        </div>
      )}

      <PipelineToolbar jobs={pipeline.jobs} filters={pipeline.filters} onFilterChange={pipeline.updateFilter} isDarkMode={isDarkMode} />

      {pipeline.loading ? (
        <PipelineSkeleton isDarkMode={isDarkMode} />
      ) : pipeline.error && pipeline.allApplications.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-white shadow-sm'}`}>
          <p className={`text-sm ${muted}`}>The hiring pipeline could not be loaded.</p>
          <button type="button" onClick={pipeline.refetch} className="mt-3 rounded-xl bg-[#ea6036] px-4 py-2 text-sm font-bold text-white hover:bg-[#d8552e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]">Retry</button>
        </div>
      ) : pipeline.allApplications.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-white shadow-sm'}`}>
          <p className={`text-sm ${muted}`}>No applicants yet. Candidates will appear here once they apply to your listings.</p>
        </div>
      ) : pipeline.applications.length === 0 ? (
        <div className={`rounded-2xl border p-10 text-center ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-white shadow-sm'}`}>
          <p className={`text-sm ${muted}`}>No applicants match these filters.</p>
        </div>
      ) : (
        <PipelineBoard
          groupedByStage={pipeline.groupedByStage}
          isDarkMode={isDarkMode}
          onView={setSelectedApplication}
          onMove={pipeline.moveCandidate}
          onRequestReject={requestReject}
        />
      )}
      <p aria-live="polite" className="sr-only">{pipeline.announcement}</p>

      {selectedApplication && (
        <CandidateDrawer
          key={`${selectedApplication.id}-${selectedApplication.stage}`}
          application={pipeline.allApplications.find((item) => item.id === selectedApplication.id) || selectedApplication}
          isDarkMode={isDarkMode}
          onClose={() => setSelectedApplication(null)}
          onSaveNotes={pipeline.saveNotes}
        />
      )}
      {rejectApplication && (
        <RejectDialog
          candidateName={getPipelinePerson(rejectApplication).name}
          isDarkMode={isDarkMode}
          onConfirm={confirmReject}
          onCancel={() => setRejectApplication(null)}
        />
      )}
    </section>
  );
}
