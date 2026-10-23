import { useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import { PIPELINE_STAGES, getPipelinePerson } from '../../../data/pipelineStages';

const matchStyle = (score, isDarkMode) => {
  if (score >= 75) return isDarkMode ? 'bg-[#4fa784]/15 text-[#74c49f]' : 'bg-emerald-50 text-emerald-700';
  if (score >= 50) return isDarkMode ? 'bg-amber-400/10 text-amber-300' : 'bg-amber-50 text-amber-700';
  return isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500';
};

const formatAppliedDate = (date) => date
  ? `Applied ${new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
  : 'Application date unavailable';

export function CandidateCard({ application, isDarkMode, onView, onMove, onRequestReject, overlay = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    data: { application },
    disabled: overlay,
  });
  const person = getPipelinePerson(application);
  const score = Math.round(Number(application.match_score || 0));
  const style = transform && !overlay
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const cardClass = `relative rounded-xl border p-3 shadow-sm transition-shadow ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-white'} ${isDragging ? 'z-10 opacity-40' : 'hover:shadow-md'} ${overlay ? 'shadow-xl' : ''}`;

  const move = (stage) => {
    setMenuOpen(false);
    if (stage === 'rejected') onRequestReject(application);
    else onMove(application.id, stage);
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      tabIndex={overlay ? -1 : 0}
      aria-label={`${person.name}, ${application.job_postings?.title || 'Job'}, ${score}% match`}
      className={`${cardClass} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]`}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ea6036] text-xs font-bold text-white">{person.initials}</div>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{person.name}</div>
          <div className={`mt-0.5 truncate text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{application.job_postings?.title || 'Job listing'}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${matchStyle(score, isDarkMode)}`}>{score}%</span>
      </div>
      <div className={`mt-3 flex items-center justify-between gap-2 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        <span>{formatAppliedDate(application.applied_at)}</span>
        {!overlay && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onView(application)}
              aria-label={`View ${person.name}`}
              className="rounded-md px-2 py-1 font-bold text-[#ea6036] hover:bg-[#ea6036]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ea6036]"
            >
              View
            </button>
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Drag ${person.name} to another stage`}
              className={`cursor-grab rounded-md px-2 py-1 text-base leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ea6036] active:cursor-grabbing ${isDarkMode ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              ⠿
            </button>
            <button
              type="button"
              aria-label={`Move ${person.name} to another stage`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className={`rounded-md px-2 py-1 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ea6036] ${isDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              ⋮
            </button>
          </div>
        )}
      </div>
      {menuOpen && (
        <div role="menu" aria-label={`Move ${person.name} to stage`} className={`absolute right-2 top-12 z-20 max-h-56 min-w-36 overflow-y-auto rounded-xl border p-1 shadow-xl ${isDarkMode ? 'border-white/10 bg-[#0d1622]' : 'border-slate-200 bg-white'}`}>
          <div className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Move to…</div>
          {PIPELINE_STAGES.filter((stage) => stage.id !== application.stage).map((stage) => (
            <button
              key={stage.id}
              type="button"
              role="menuitem"
              onClick={() => move(stage.id)}
              className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036] ${isDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              {stage.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
