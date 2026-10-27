import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../supabaseClient.js';
import { changePassword, hasPasswordLogin, isStrongPassword } from '../../data/services/authService';

function PasswordField({ id, label, value, onChange, autoComplete, inputRef, isDarkMode, hint }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border px-3 py-2.5 pr-16 text-sm outline-none focus:border-[#ea6036] focus-visible:ring-2 focus-visible:ring-[#ea6036]/30 ${isDarkMode ? 'border-white/10 bg-[#0a121c] text-white' : 'border-slate-300 bg-white text-slate-900'}`}
        />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className={`absolute inset-y-0 right-0 px-3 text-xs font-semibold ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint}
    </div>
  );
}

export function ChangePasswordModal({ isDarkMode, onClose }) {
  const [needsCurrent, setNeedsCurrent] = useState(true);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active && data?.user) setNeedsCurrent(hasPasswordLogin(data.user));
    });
    firstFieldRef.current?.focus();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !isSaving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, isSaving]);

  const strong = isStrongPassword(next);
  const matches = next.length > 0 && next === confirm;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (needsCurrent && !current) return setError('Enter your current password.');
    if (!strong) return setError('Use at least 8 characters, including a number or symbol.');
    if (!matches) return setError('The new passwords don’t match.');
    setIsSaving(true);
    const result = await changePassword(needsCurrent ? current : null, next);
    setIsSaving(false);
    if (!result.success) return setError(result.message);
    setDone(true);
    setCurrent(''); setNext(''); setConfirm('');
  };

  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const hintClass = (ok) => `mt-1.5 text-[11px] ${ok ? 'text-emerald-600' : muted}`;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Close change password" onClick={() => !isSaving && onClose()} className={`fixed inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`} />
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="change-password-title" noValidate
        className={`relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl ${isDarkMode ? 'border-[#1b2b3b] bg-[#0d1622]' : 'border-slate-200 bg-white'}`}>
        <h2 id="change-password-title" className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{needsCurrent ? 'Change password' : 'Set a password'}</h2>
        {!needsCurrent && <p className={`mt-1 text-sm ${muted}`}>You signed up with Google. Set a password to also sign in with your email.</p>}

        {done ? (
          <div className="mt-4">
            <p role="status" className={`rounded-xl border p-3 text-sm font-medium ${isDarkMode ? 'border-emerald-900 bg-emerald-950/30 text-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
              Your password has been changed. Use it the next time you sign in.
            </p>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={onClose} className="rounded-xl bg-[#ea6036] px-4 py-2 text-sm font-bold text-white hover:bg-[#d8552e]">Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-4">
              {needsCurrent && (
                <PasswordField id="current-password" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" inputRef={firstFieldRef} isDarkMode={isDarkMode} />
              )}
              <PasswordField id="new-password" label="New password" value={next} onChange={setNext} autoComplete="new-password" inputRef={needsCurrent ? undefined : firstFieldRef} isDarkMode={isDarkMode}
                hint={<p className={hintClass(strong)}>{strong ? '✓ ' : ''}At least 8 characters, including a number or symbol.</p>} />
              <PasswordField id="confirm-password" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" isDarkMode={isDarkMode}
                hint={confirm ? <p className={hintClass(matches)}>{matches ? '✓ Passwords match' : 'Passwords don’t match yet'}</p> : null} />
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={isSaving} className={`rounded-xl border px-4 py-2 text-sm font-bold ${isDarkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>Cancel</button>
              <button type="submit" disabled={isSaving} className="rounded-xl bg-[#ea6036] px-4 py-2 text-sm font-bold text-white hover:bg-[#d8552e] disabled:opacity-60">
                {isSaving ? 'Saving…' : needsCurrent ? 'Change password' : 'Set password'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>,
    document.body,
  );
}
