import { useDroppable } from '@dnd-kit/core';
import { CandidateCard } from './CandidateCard';

const stageColors = {
  blue: 'bg-blue-500',
  orange: 'bg-[#ea6036]',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  green: 'bg-[#4fa784]',
  slate: 'bg-slate-400',
};

export function PipelineColumn({ stage, applications, isDarkMode, onView, onMove, onRequestReject }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const muted = stage.id === 'rejected';
  return (
    <section
      ref={setNodeRef}
      aria-label={`${stage.label}, ${applications.length} candidates`}
      className={`flex h-[min(68vh,680px)] w-[300px] flex-col rounded-2xl border p-3 transition-colors ${isOver ? 'border-[#ea6036] bg-[#ea6036]/5' : ''} ${muted ? (isDarkMode ? 'border-white/5 bg-[#0d151f]/70' : 'border-slate-200 bg-slate-100/80') : (isDarkMode ? 'border-white/5 bg-[#101924]' : 'border-slate-200 bg-slate-100/70')}`}
    >
      <header className={`mb-3 flex shrink-0 items-center justify-between rounded-xl px-3 py-2 ${isDarkMode ? 'bg-[#121b27]' : 'bg-white'}`}>
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${stageColors[stage.color]}`} />
          <h2 className={`text-sm font-bold ${muted ? (isDarkMode ? 'text-slate-400' : 'text-slate-500') : (isDarkMode ? 'text-white' : 'text-slate-800')}`}>{stage.label}</h2>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{applications.length}</span>
      </header>
      <div className="min-h-[120px] flex-1 space-y-3 overflow-y-auto pr-1">
        {applications.length === 0 ? (
          <p className={`px-2 py-8 text-center text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No candidates</p>
        ) : applications.map((application) => (
          <CandidateCard
            key={application.id}
            application={application}
            isDarkMode={isDarkMode}
            onView={onView}
            onMove={onMove}
            onRequestReject={onRequestReject}
          />
        ))}
      </div>
    </section>
  );
}
