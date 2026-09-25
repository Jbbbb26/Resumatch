import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser, getCurrentUser, updateUserMetadata } from "../../data/services/authService";
import { TopHeader } from "../components/TopHeader";
import { ProfileModal } from "../components/ProfileModal";

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFilterModalOpen, setFilterModalOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const loadUser = async () => {
      const response = await getCurrentUser();
      if (response.success && response.data) {
        let metadata = response.data.user_metadata || {};
        const authIntent = sessionStorage.getItem('authIntent');
        const intendedRole = sessionStorage.getItem('intendedRole');
        if (authIntent === 'signup') {
          if (metadata.role) {
            await logoutUser();
            sessionStorage.removeItem('authIntent');
            sessionStorage.removeItem('intendedRole');
            navigate('/signup', {
              state: { error: 'This Google account is already registered. Please Sign In.' }
            });
            return;
          } else {
            await updateUserMetadata({ role: intendedRole });
            metadata.role = intendedRole;
            sessionStorage.removeItem('authIntent');
            sessionStorage.removeItem('intendedRole');
          }
        }
        if (metadata.role === 'recruiter') {
          navigate('/recruiter-dashboard');
          return;
        }
        const fullName = metadata.full_name || response.data.email.split('@')[0];
        const nameParts = fullName.split(' ');
        const initials = nameParts.length > 1
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
          : fullName.substring(0, 2).toUpperCase();
        setUser({
          id: response.data.id,
          name: fullName,
          email: response.data.email,
          initials: initials
        });
      } else {
        navigate('/login');
      }
      setIsLoading(false);
    };
    loadUser();
  }, [navigate]);

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) navigate("/login");
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center space-y-4 ${isDarkMode ? 'bg-[#090e15]' : 'bg-slate-50'}`}>
        <svg className="animate-spin h-10 w-10 text-[#ea6036]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className={`text-sm font-medium animate-pulse ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans selection:bg-[#ea6036]/30 transition-colors duration-200 ${isDarkMode ? 'bg-[#090e15] text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
      <TopHeader
        user={user}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
        openProfile={() => setProfileModalOpen(true)}
        logout={handleLogout}
      />
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <p className={`text-sm mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Welcome back</p>
          <h1 className={`text-3xl sm:text-4xl font-serif mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Good to see you, {user.name}
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Your profile is <span className="text-[#4fa784] font-semibold">72%</span> complete. Finish it to improve your match scores across every listing.
          </p>
        </div>

        <div className={`flex flex-col md:flex-row items-center gap-3 p-2 rounded-2xl border mb-12 shadow-lg transition-colors ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200'}`}>
          <div className={`flex-1 flex items-center px-4 w-full border-b md:border-b-0 md:border-r pb-2 md:pb-0 ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
            <svg className="w-5 h-5 text-slate-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" placeholder="Job title, skill, or company" className={`w-full bg-transparent border-none focus:ring-0 text-sm py-2 outline-none ${isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`} />
          </div>
          <div className="flex-1 flex items-center px-4 w-full">
            <svg className="w-5 h-5 text-slate-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <input type="text" placeholder="City or region" className={`w-full bg-transparent border-none focus:ring-0 text-sm py-2 outline-none ${isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`} />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto px-2 md:px-0 mt-2 md:mt-0">
            <button className={`p-2.5 rounded-xl transition-colors border ${isDarkMode ? 'bg-[#1a2636] hover:bg-[#233348] text-slate-300 border-white/5' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
            </button>
            <button className="flex-1 md:flex-none px-8 py-2.5 bg-[#ea6036] hover:bg-[#d8552e] text-white text-sm font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg">
              Search
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <h2 className={`text-lg font-serif ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Recommended</h2>
              <svg className="w-4 h-4 text-slate-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <div className="space-y-3">
              {[
                { title: "Senior Product Designer", company: "Nortgate Studio", location: "Remote", match: 91 },
                { title: "Product Design Lead", company: "Fieldstone", location: "Manila, PH", match: 84 },
                { title: "UX Researcher", company: "Halden & Co", location: "Remote", match: 67 }
              ].map((job, idx) => (
                <div key={idx} className={`flex items-center justify-between p-5 rounded-2xl border transition-colors cursor-pointer group ${isDarkMode ? 'bg-[#121b27] border-white/5 hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                  <div>
                    <h3 className={`text-base font-bold group-hover:text-[#ea6036] transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{job.company} · {job.location}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-xl font-bold text-[#4fa784]">{job.match}%</span>
                    <span className={`text-[10px] uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Match</span>
                  </div>
                </div>
              ))}
            </div>
            <p className={`text-xs mt-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <button className="text-[#3c8eec] hover:underline">Update your profile</button> to sharpen these recommendations, or use the search bar above.
            </p>
          </div>

          <div className="lg:col-span-1">
            <h2 className={`text-lg font-serif mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Saved jobs</h2>
            <div className={`p-5 rounded-2xl border h-[calc(100%-2.5rem)] ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="space-y-4 mb-8">
                {[
                  { title: "Product Designer II", company: "Quietwork Labs", location: "Hybrid", match: 80, border: true },
                  { title: "UX Lead", company: "Marlowe Health", location: "Remote", match: 72, border: false }
                ].map((job, idx) => (
                  <div key={idx} className={`flex items-start justify-between group cursor-pointer ${job.border ? `border-b pb-4 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}` : ''}`}>
                    <div>
                      <h3 className={`text-sm font-bold group-hover:text-[#ea6036] transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                      <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{job.company} · {job.location}</p>
                    </div>
                    <span className="text-xs font-bold text-[#4fa784]">{job.match}%</span>
                  </div>
                ))}
              </div>
              <p className={`text-[11px] leading-relaxed border-t pt-4 ${isDarkMode ? 'text-slate-500 border-white/5' : 'text-slate-400 border-slate-100'}`}>
                Use the save button on each job listing to keep it here — accessible from any device.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8">
          {[
            { value: "12", label: "Active applications" },
            { value: "4", label: "Interview requests" },
            { value: "86%", label: "Average match score" }
          ].map((stat, idx) => (
            <div key={idx} className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
              <span className={`block text-4xl font-serif font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stat.value}</span>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{stat.label}</span>
            </div>
          ))}
        </div>
      </main>

      {isFilterModalOpen && <FilterModal onClose={() => setFilterModalOpen(false)} />}
      {isProfileModalOpen && (
  <ProfileModal 
    user={user} 
    onClose={() => setProfileModalOpen(false)} 
    onLogout={handleLogout} 
    isDarkMode={isDarkMode} 
  />
)}
      </div>
  );
}