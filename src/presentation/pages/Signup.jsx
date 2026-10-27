import { useState , useEffect} from 'react';
import { Link, useNavigate , useLocation} from 'react-router-dom';
import { registerUser, loginWithGoogle } from '../../data/services/authService';
import { takeReturnPath } from '../../data/services/returnPath';
import AppIcon from '../../../assets/Icon.png';

export default function Signup() {
  const navigate = useNavigate();
const location = useLocation();
  const [activeRole, setActiveRole] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isPasswordValid = password.length >= 8 && /[\d!@#$%^&*(),.?":{}|<>]/.test(password);

useEffect(() => {
    if (location.state?.error) {
      setMessage(`Error: ${location.state.error}`);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleGoogleAuth = async () => {
    setMessage('');

    sessionStorage.setItem('authIntent', 'signup');
    sessionStorage.setItem('intendedRole', activeRole);

    const response = await loginWithGoogle('/login');

    if (!response.success) {
      setMessage(`Google Auth Error: ${response.message}`);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const invalidCharRegex = /[<>]/;
    if (invalidCharRegex.test(fullName)) {
      setMessage('Error: Full Name contains invalid characters (e.g., < or >).');
      setLoading(false);
      return;
    }

    if (activeRole === 'recruiter' && invalidCharRegex.test(companyName)) {
      setMessage('Error: Company Name contains invalid characters.');
      setLoading(false);
      return;
    }

    const response = await registerUser(email, password, activeRole, fullName, companyName);

    if (!response.success) {
      const errorMsg = response.message || "";

      if (errorMsg.toLowerCase().includes('already registered') || errorMsg.toLowerCase().includes('already exists')) {
        setMessage('This email is already registered. Please sign in instead.');
      } else {
        setMessage(`Error: ${errorMsg}`);
      }
      setLoading(false);
    } else {
      navigate(takeReturnPath(activeRole));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] font-sans">

      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-100">
        <div className="flex items-center gap-2">
          <img src={AppIcon} alt="ResuMatch Logo" className="w-10 h-10 object-cover rounded" />
          <span className="text-xl font-bold font-serif text-slate-900">ResuMatch</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">
            Sign In
          </Link>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">

          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-serif text-slate-900">
              {activeRole ? 'Create your account' : 'How will you use ResuMatch?'}
            </h1>
            <p className="text-sm text-slate-500">
              {activeRole
                ? 'Get started with your deterministic ResuMatch workspace.'
                : 'Select your primary goal to customize your onboarding experience.'}
            </p>
          </div>

          {!activeRole ? (
            <div className="space-y-4">
              <button
                onClick={() => setActiveRole('job_seeker')}
                className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left"
              >
                <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">I am a Job Seeker</h3>
                  <p className="text-xs text-slate-500 mt-0.5">I want to upload my resume and find matches.</p>
                </div>
              </button>

              <button
                onClick={() => setActiveRole('recruiter')}
                className="w-full flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left"
              >
                <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">I am an Employer</h3>
                  <p className="text-xs text-slate-500 mt-0.5">I want to post jobs and source candidates.</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

              <button
                onClick={() => setActiveRole(null)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                Back to selection
              </button>

              <button type="button" onClick={handleGoogleAuth} className="w-full flex items-center justify-center gap-2 border border-slate-300 rounded-lg py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>

              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 px-4 text-xs font-semibold text-slate-400 tracking-wider uppercase">or sign up with email</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
              {message && (
                <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                  {message.toLowerCase().includes("already registered")
                    ? "This email is already registered. Please sign in instead."
                    : message}
                </div>
              )}
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-800">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Alex Morgan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-800">
                {activeRole === 'recruiter' ? 'Work Email Address' : 'Email address'}
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
              />
            </div>

            {activeRole === 'recruiter' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-800">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Graham Bars Corp."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400 pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>

              <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isPasswordValid ? 'text-emerald-600' : 'text-slate-400'}`}>
                {isPasswordValid ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2.5" /></svg>
                )}
                At least 8 characters with a number or symbol
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input type="checkbox" required className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <p className="text-sm text-slate-600">
                I agree to ResuMatch's <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">Terms of Service</Link> and acknowledge the <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline">Privacy Policy</Link>.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || (password.length > 0 && !isPasswordValid)}
                            className="w-full bg-[#4F46E5] hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg py-3.5 text-sm font-semibold transition-colors shadow-sm mt-4 flex items-center justify-center gap-2"
            >
              {loading ? 'Creating account...' : 'Create account'}
              {!loading && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
            </button>
          </form>
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-sm font-medium text-slate-600">
              Already have an account? <Link to="/login" className="text-indigo-600 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 text-xs font-medium text-slate-500 bg-[#F8F9FA]">
        <div>© {new Date().getFullYear()} ResuMatch. All rights reserved.</div>
        <div className="flex gap-6 mt-4 sm:mt-0">
          <Link to="/privacy" className="hover:text-slate-800 transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-slate-800 transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
