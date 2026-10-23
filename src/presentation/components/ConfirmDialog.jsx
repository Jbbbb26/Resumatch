import { useEffect, useRef } from 'react';

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  isDarkMode,
  isWorking = false,
  onConfirm,
  onCancel,
}) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isWorking) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isWorking, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close confirmation dialog"
        className={`fixed inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`}
        onClick={onCancel}
        disabled={isWorking}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className={`relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDarkMode ? 'border-[#1b2b3b] bg-[#0d1622]' : 'border-slate-200 bg-white'}`}
      >
        <h2 id="confirm-dialog-title" className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
        <p className={`mt-3 text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isWorking}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ea6036] ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isWorking}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-wait disabled:opacity-60 ${isDarkMode ? 'border-red-900/50 bg-red-900/20 text-red-300 hover:bg-red-900/30' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}
          >
            {isWorking ? 'Archiving…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
