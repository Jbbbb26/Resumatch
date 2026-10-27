import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { rememberReturnPath } from '../../data/services/returnPath';

export function SignInPrompt({ title, message, onClose, isDarkMode = false }) {
  const navigate = useNavigate();
  const signInRef = useRef(null);

  useEffect(() => {
    signInRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const go = (path) => {
    rememberReturnPath(window.location.pathname);
    navigate(path);
  };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default bg-slate-900/60 backdrop-blur-[2px]" />
      <div role="dialog" aria-modal="true" aria-labelledby="sign-in-prompt-title"
        className={`relative w-full max-w-sm rounded-2xl border p-6 text-center shadow-2xl ${isDarkMode ? 'border-white/10 bg-[#121b27]' : 'border-slate-200 bg-white'}`}>
        <button type="button" onClick={onClose} aria-label="Close"
          className={`absolute right-3 top-3 rounded-full p-2 ${isDarkMode ? 'text-slate-400 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'}`}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-[#ea6036]">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        </div>
        <h2 id="sign-in-prompt-title" className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
        {message && <p className={`mt-2 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{message}</p>}
        <div className="mt-6 flex flex-col gap-2">
          <button ref={signInRef} type="button" onClick={() => go('/login')}
            className="rounded-xl bg-[#ea6036] px-4 py-3 text-sm font-bold text-white hover:bg-[#d4532c]">
            Sign in
          </button>
          <button type="button" onClick={() => go('/signup')}
            className={`rounded-xl border px-4 py-3 text-sm font-bold ${isDarkMode ? 'border-white/15 text-white hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
            Create an account
          </button>
        </div>
        <p className={`mt-4 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>You'll come right back to this page.</p>
      </div>
    </div>,
    document.body,
  );
}
