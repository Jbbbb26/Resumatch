import { useEffect, useRef, useState } from 'react';

export function RejectDialog({ candidateName, isDarkMode, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const reasonRef = useRef(null);
  useEffect(() => {
    reasonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Close rejection confirmation" onClick={onCancel} className={`fixed inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`} />
      <section role="dialog" aria-modal="true" aria-labelledby="reject-title" className={`relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDarkMode ? 'border-[#1b2b3b] bg-[#0d1622]' : 'border-slate-200 bg-white'}`}>
        <h2 id="reject-title" className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Move candidate to Rejected?</h2>
        <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{candidateName} will remain in your records and can be moved back to another stage.</p>
        <label className="mt-4 block">
          <span className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Reason (optional)</span>
          <textarea
            ref={reasonRef}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className={`w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none focus:border-[#ea6036] focus-visible:ring-2 focus-visible:ring-[#ea6036]/30 ${isDarkMode ? 'border-white/10 bg-[#0a121c] text-white' : 'border-slate-300 bg-white text-slate-900'}`}
          />
        </label>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className={`rounded-xl border px-4 py-2 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ea6036] ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>Cancel</button>
          <button type="button" onClick={() => onConfirm(reason)} className="rounded-xl bg-[#ea6036] px-4 py-2 text-sm font-bold text-white hover:bg-[#d8552e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036]">Confirm rejection</button>
        </div>
      </section>
    </div>
  );
}
