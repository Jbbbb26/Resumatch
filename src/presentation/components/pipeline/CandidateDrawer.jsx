import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../../supabaseClient.js';
import { PIPELINE_STAGES, getPipelinePerson } from '../../../data/pipelineStages';

const stageLabel = (stage) => PIPELINE_STAGES.find((item) => item.id === stage)?.label || stage || 'Unknown';

function formatTimestamp(value) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Date unavailable';
}

export function CandidateDrawer({ application, isDarkMode, onClose, onSaveNotes }) {
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [notes, setNotes] = useState(application.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const closeButtonRef = useRef(null);
  const person = getPipelinePerson(application);
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const heading = isDarkMode ? 'text-white' : 'text-slate-900';
  const card = isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-slate-50';

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      setHistoryError('');
      const { data, error } = await supabase
        .from('application_stage_history')
        .select('id, from_stage, to_stage, changed_by, changed_at, note')
        .eq('application_id', application.id)
        .order('changed_at', { ascending: false });
      if (cancelled) return;
      if (error) setHistoryError(error.message);
      else setHistory(data || []);
    };
    loadHistory();
    return () => { cancelled = true; };
  }, [application.id, application.stage_updated_at]);

  const resumeValue = person.candidate.resumeFileUrl || person.candidate.resume_file_url;
  const resumeUrl = resumeValue
    ? (/^https?:\/\//i.test(resumeValue)
      ? resumeValue
      : supabase.storage.from('resumes').getPublicUrl(resumeValue).data.publicUrl)
    : null;
  const matchBreakdown = application.match_breakdown || application.match_details;

  const handleSaveNotes = async () => {
    setIsSaving(true);
    setSaveMessage('');
    const success = await onSaveNotes(application.id, notes);
    setSaveMessage(success ? 'Notes saved.' : 'Unable to save notes.');
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" aria-label="Close candidate details" onClick={onClose} className={`absolute inset-0 ${isDarkMode ? 'bg-[#04080e]/70' : 'bg-slate-900/30'}`} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-drawer-title"
        className={`relative z-10 flex h-full w-full max-w-xl flex-col border-l shadow-2xl ${isDarkMode ? 'border-white/5 bg-[#0d1622]' : 'border-slate-200 bg-white'}`}
      >
        <header className={`flex items-center justify-between gap-4 border-b p-5 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ea6036] text-sm font-bold text-white">{person.initials}</div>
            <div className="min-w-0">
              <h2 id="candidate-drawer-title" className={`truncate text-xl font-serif font-bold ${heading}`}>{person.name}</h2>
              <p className={`truncate text-xs ${muted}`}>{application.job_postings?.title || 'Job application'}</p>
            </div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close candidate details" className={`rounded-full p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036] ${isDarkMode ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}>×</button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className={`rounded-2xl border p-4 ${card}`}>
            <h3 className={`mb-3 text-xs font-bold uppercase tracking-wider ${muted}`}>Candidate details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2"><dt className={muted}>Email</dt><dd className={heading}>{person.email ? <a href={`mailto:${person.email}`} className="break-all text-[#ea6036] hover:underline">{person.email}</a> : 'Not provided'}</dd></div>
              <div className="flex gap-2"><dt className={muted}>Phone</dt><dd className={heading}>{person.candidate.phone ? <a href={`tel:${person.candidate.phone}`} className="text-[#ea6036] hover:underline">{person.candidate.phone}</a> : 'Not provided'}</dd></div>
              <div className="flex gap-2"><dt className={muted}>Match</dt><dd className={`${heading} font-bold`}>{Math.round(Number(application.match_score || 0))}%</dd></div>
              <div className="flex gap-2"><dt className={muted}>Applied</dt><dd className={heading}>{formatTimestamp(application.applied_at)}</dd></div>
            </dl>
            {resumeUrl && (
              <a href={resumeUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl bg-[#ea6036] px-4 py-2 text-sm font-bold text-white hover:bg-[#d8552e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]">
                View resume
              </a>
            )}
            {matchBreakdown && (
              <div className={`mt-4 border-t pt-4 ${isDarkMode ? 'border-white/5' : 'border-slate-200'}`}>
                <h4 className={`mb-2 text-xs font-bold uppercase tracking-wider ${muted}`}>Match breakdown</h4>
                <pre className={`whitespace-pre-wrap break-words text-xs ${muted}`}>{typeof matchBreakdown === 'string' ? matchBreakdown : JSON.stringify(matchBreakdown, null, 2)}</pre>
              </div>
            )}
            {!resumeUrl && <p className={`mt-3 text-xs ${muted}`}>No resume link is available on this profile.</p>}
          </section>

          <section className={`rounded-2xl border p-4 ${card}`}>
            <label htmlFor="pipeline-candidate-notes" className={`mb-2 block text-xs font-bold uppercase tracking-wider ${muted}`}>Recruiter notes</label>
            <textarea
              id="pipeline-candidate-notes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={`w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#ea6036] focus-visible:ring-2 focus-visible:ring-[#ea6036]/30 ${isDarkMode ? 'border-white/10 bg-[#0a121c] text-white' : 'border-slate-300 bg-white text-slate-900'}`}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span role="status" className={`text-xs ${saveMessage.includes('Unable') ? 'text-red-500' : muted}`}>{saveMessage}</span>
              <button type="button" disabled={isSaving} onClick={handleSaveNotes} className="rounded-lg bg-[#ea6036] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#d8552e] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]">{isSaving ? 'Saving…' : 'Save notes'}</button>
            </div>
          </section>

          <section>
            <h3 className={`mb-3 text-xs font-bold uppercase tracking-wider ${heading}`}>Stage history</h3>
            {historyError ? (
              <p role="alert" className="text-sm text-red-500">Could not load stage history: {historyError}</p>
            ) : history.length === 0 ? (
              <p className={`text-sm ${muted}`}>No stage history recorded.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((item) => (
                  <li key={item.id} className={`relative border-l-2 py-1 pl-4 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <span className={`absolute -left-[5px] top-2 h-2 w-2 rounded-full ${item.to_stage === 'rejected' ? 'bg-slate-400' : 'bg-[#ea6036]'}`} />
                    <div className={`text-sm font-semibold ${heading}`}>{item.from_stage ? `${stageLabel(item.from_stage)} → ` : ''}{stageLabel(item.to_stage)}</div>
                    <time className={`text-xs ${muted}`}>{formatTimestamp(item.changed_at)}</time>
                    {item.note && <p className={`mt-1 text-xs ${muted}`}>{item.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
