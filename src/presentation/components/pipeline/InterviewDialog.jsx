import { useEffect, useRef, useState } from 'react';

export const INTERVIEW_MODES = ['In person', 'Video call', 'Phone call'];

const toLocalInput = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function InterviewDialog({ candidateName, initial = {}, isDarkMode, isEdit = false, onConfirm, onCancel }) {
  const [when, setWhen] = useState(toLocalInput(initial.interview_at));
  const [mode, setMode] = useState(initial.interview_mode || 'Video call');
  const [location, setLocation] = useState(initial.interview_location || '');
  const [notes, setNotes] = useState(initial.interview_notes || '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = async (event) => {
    event.preventDefault();
    if (!when) { setError('Choose the interview date and time.'); return; }
    const date = new Date(when);
    if (Number.isNaN(date.getTime())) { setError('Enter a valid date and time.'); return; }
    setIsSaving(true);
    setError('');
    const ok = await onConfirm({
      interview_at: date.toISOString(),
      interview_mode: mode,
      interview_location: location.trim() || null,
      interview_notes: notes.trim() || null,
    });
    setIsSaving(false);
    if (ok === false) setError('Could not save the interview. Please try again.');
  };

  const field = `w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#ea6036] focus-visible:ring-2 focus-visible:ring-[#ea6036]/30 ${isDarkMode ? 'border-white/10 bg-[#0a121c] text-white' : 'border-slate-300 bg-white text-slate-900'}`;
  const label = `mb-1.5 block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`;
  const locationLabel = mode === 'Video call' ? 'Meeting link' : mode === 'Phone call' ? 'Phone number we will call / instructions' : 'Address';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Close interview form" onClick={onCancel} className={`fixed inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`} />
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="interview-title" className={`relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDarkMode ? 'border-[#1b2b3b] bg-[#0d1622]' : 'border-slate-200 bg-white'}`}>
        <h2 id="interview-title" className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{isEdit ? 'Edit interview' : 'Schedule interview'}</h2>
        <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{candidateName} will be notified and can see these details.</p>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className={label}>Date and time *</span>
            <input ref={firstFieldRef} type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className={label}>Format</span>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className={field}>
              {INTERVIEW_MODES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={label}>{locationLabel} (optional)</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={300} className={field}
              placeholder={mode === 'Video call' ? 'https://meet.google.com/…' : mode === 'Phone call' ? 'We will call your number on file' : 'Building, street, city'} />
          </label>
          <label className="block">
            <span className={label}>Message for the candidate (optional)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} className={`${field} resize-y`} placeholder="What to bring, who they'll meet, how long it takes…" />
          </label>
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className={`rounded-xl border px-4 py-2 text-sm font-bold ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>Cancel</button>
          <button type="submit" disabled={isSaving} className="rounded-xl bg-[#ea6036] px-4 py-2 text-sm font-bold text-white hover:bg-[#d8552e] disabled:opacity-60">
            {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Schedule & notify'}
          </button>
        </div>
      </form>
    </div>
  );
}
