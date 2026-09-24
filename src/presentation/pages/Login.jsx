import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  loginWithEmail, 
  loginWithGoogle, 
  logoutUser,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  updatePassword,
  getCurrentUser,        
  updateUserMetadata,    
  createPublicProfile
} from '../../data/services/authService'; 
import AppIcon from '../../../assets/Icon.png';
export default function Login() {
  const [verifying, setVerifying] = useState(true);

  const [activeRole, setActiveRole] = useState('job_seeker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState(null);

  useEffect(() => {
    const verifyReturningUser = async () => {
      const response = await getCurrentUser();
      
      if (response.success && response.data) {
        let userRole = response.data.user_metadata?.role;
        const authIntent = sessionStorage.getItem('authIntent');
        const intendedRole = sessionStorage.getItem('intendedRole');

        if (authIntent === 'signup') {
          if (userRole) {
            await logoutUser();
            sessionStorage.clear();
            setError('This Google account is already registered. Please Sign In.');
            setVerifying(false);
            return;
          } else {
            await updateUserMetadata({ role: intendedRole });
            await createPublicProfile(response.data.id, response.data.email, intendedRole);
            userRole = intendedRole; 
            sessionStorage.clear();
          }
        }

        if (!userRole && authIntent !== 'signup') {
          await logoutUser();
          sessionStorage.clear();
          setError('No account found. Please go to Sign Up to create your workspace.');
          setVerifying(false);
          return;
        }

        if (userRole === 'recruiter') {
          navigate('/recruiter-dashboard');
        } else {
          navigate('/candidate-dashboard');
        }
      } else {
        setVerifying(false);
      }
    };

    verifyReturningUser();
  }, [navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    
    const response = await loginWithEmail(email, password);
    
    if (!response.success) {
      setError(response.message);
      setLoading(false);
    } else {
      const userRole = response.data.user?.user_metadata?.role;
      
      if (userRole === 'recruiter') {
        navigate('/recruiter-dashboard');
      } else {
        navigate('/candidate-dashboard'); 
      }
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    sessionStorage.setItem('authIntent', 'login');
    
    const response = await loginWithGoogle('/login'); 
    
    if (!response.success) {
      setError(response.message);
      setGoogleLoading(false);
    }
  };
  if (verifying) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center space-y-4">
        <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-slate-500 text-sm font-medium animate-pulse">Verifying authentication...</p>
      </div>
    );
  }

  
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    const res = await sendPasswordResetOtp(forgotEmail);
    if (res.success) {
      setForgotStep(2);
    } else {
      setForgotError(res.message);
    }
    setForgotLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    const res = await verifyPasswordResetOtp(forgotEmail, forgotOtp);
    if (res.success) {
      setForgotStep(3);
    } else {
      setForgotError(res.message);
    }
    setForgotLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    const res = await updatePassword(newPassword);
    if (res.success) {
      setIsForgotModalOpen(false);
      setForgotStep(1);
      setForgotEmail('');
      setForgotOtp('');
      setNewPassword('');
      setSuccessMsg("Password successfully reset! You can now log in.");
    } else {
      setForgotError(res.message);
    }
    setForgotLoading(false);
  };

  const closeForgotModal = () => {
    setIsForgotModalOpen(false);
    setForgotStep(1);
    setForgotError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] relative font-sans">
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <img src={AppIcon} alt="ResuMatch Logo" className="w-10 h-10 object-cover rounded" />
          <span className="text-xl font-bold font-serif text-slate-900">ResuMatch</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-600">
          <a href="#" className="hover:text-indigo-600">Support & Guides</a>
          <div className="flex items-center gap-1 cursor-pointer">
            <span className="material-icons text-sm">language</span>
            EN (US)
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
          
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold font-serif text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-500">Sign in to continue to your ResuMatch workspace</p>
          </div>


         <button onClick={handleGoogleLogin} disabled={googleLoading} type="button" className={`w-full flex items-center justify-center gap-2 border border-slate-300 rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors ${googleLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
  {googleLoading ? (
    <svg className="animate-spin h-5 w-5 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ) : (
    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
  )}
  {googleLoading ? 'Connecting...' : 'Continue with Google'}
</button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 px-4 text-xs text-slate-400">or continue with email</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">{error}</div>}
          {successMsg && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm border border-emerald-100">{successMsg}</div>}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <button type="button" onClick={() => setIsForgotModalOpen(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  Forgot password?
                </button>
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <button type="submit" disabled={loading} className={`w-full bg-[#3924D6] hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors shadow-sm mt-2 flex justify-center items-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-sm text-slate-600">New to ResuMatch? <Link to="/signup" className="text-indigo-600 font-medium hover:underline">Create an account</Link></p>
          </div>
        </div>
      </main>

      {isForgotModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Reset Password</h2>
              <button onClick={closeForgotModal} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6">
              {forgotError && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">{forgotError}</div>}

              {forgotStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <p className="text-sm text-slate-500 mb-2">Enter your email address and we'll send you a 6-digit verification code.</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required placeholder="name@example.com" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
                  <button type="submit" disabled={forgotLoading} className="w-full bg-[#3924D6] hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium">
                    {forgotLoading ? 'Sending...' : 'Send OTP'}
                  </button>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <p className="text-sm text-slate-500 mb-2">Enter the 6-digit code sent to <span className="font-semibold text-slate-700">{forgotEmail}</span></p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">One-Time Password (OTP)</label>
                    <input type="text" value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value)} required placeholder="123456" className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none tracking-widest" maxLength={6} />
                  </div>
                  <button type="submit" disabled={forgotLoading} className="w-full bg-[#3924D6] hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium">
                    {forgotLoading ? 'Verifying...' : 'Verify Code'}
                  </button>
                </form>
              )}

              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-sm text-slate-500 mb-2">Code verified. Please enter your new password.</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="At least 8 characters" minLength={8} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
                  <button type="submit" disabled={forgotLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-medium">
                    {forgotLoading ? 'Saving...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}