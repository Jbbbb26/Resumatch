import { Link, useNavigate } from 'react-router-dom';
import AppIcon from '../../../assets/Icon.png';
import { rememberReturnPath } from '../../data/services/returnPath';

export function GuestHeader({ isDarkMode = false, toggleTheme }) {
  const navigate = useNavigate();
  const go = (path) => {
    rememberReturnPath(window.location.pathname);
    navigate(path);
  };

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur ${isDarkMode ? 'border-white/10 bg-[#090e15]/90' : 'border-slate-200 bg-white/90'}`}>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:px-8">
        <Link to="/login" className="flex items-center gap-2" aria-label="ResuMatch home">
          <img src={AppIcon} alt="" className="h-9 w-9 rounded object-cover" />
          <span className={`font-serif text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>ResuMatch</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {toggleTheme && (
            <button type="button" onClick={toggleTheme} aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`rounded-lg p-2 ${isDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}>
              {isDarkMode ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
              )}
            </button>
          )}
          <button type="button" onClick={() => go('/login')}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${isDarkMode ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}`}>
            Sign in
          </button>
          <button type="button" onClick={() => go('/signup')}
            className="rounded-xl bg-[#ea6036] px-4 py-2 text-sm font-bold text-white hover:bg-[#d4532c]">
            Sign up
          </button>
        </div>
      </div>
    </header>
  );
}
