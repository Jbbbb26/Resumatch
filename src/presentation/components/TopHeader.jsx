import React, { useState, useRef, useEffect } from 'react';
import AppIcon from '../../../assets/Icon.png';

export const TopHeader = ({ user, isDarkMode, toggleTheme, openProfile, logout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={`w-full border-b sticky top-0 z-40 transition-colors duration-200 py-3 ${isDarkMode ? 'bg-[#090e15] border-white/5' : 'bg-white border-slate-200'}`}>
      <div className="w-full px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <a className="flex items-center space-x-2.5 group" href="#">
            <img src={AppIcon} alt="ResuMatch Logo" className="w-10 h-10 object-cover rounded" />
            <span className={`font-serif text-xl font-bold tracking-normal ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              ResuMatch
            </span>
          </a>
        </div>

        <div className="flex items-center space-x-6">
          
          <div className={`flex items-center space-x-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <button className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            </button>
            <button className={`transition-colors relative ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              <span className={`absolute top-0 right-0 block w-2 h-2 bg-[#ea6036] rounded-full ring-2 ${isDarkMode ? 'ring-[#090e15]' : 'ring-white'}`}></span>
            </button>
            <button onClick={toggleTheme} className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}>
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
              )}
            </button>
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <span className="w-8 h-8 rounded-full bg-[#ea6036] text-white font-bold text-xs flex items-center justify-center">
                {user.initials}
              </span>
              <svg className={`w-3 h-3 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>

            {isDropdownOpen && (
              <div className={`absolute right-0 mt-3 w-60 border rounded-2xl shadow-2xl py-2 z-50 origin-top-right animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-[#121b27] border-white/5' : 'bg-white border-slate-200'}`}>
                
                <div className={`px-5 py-3 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.name}</p>
                  <p className={`text-xs mt-0.5 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{user.email}</p>
                </div>
                
                <div className={`py-2 border-b space-y-1 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                  <button className={`w-full px-5 py-2.5 flex items-center justify-between transition-colors group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                    <div className={`flex items-center gap-3 text-sm group-hover:text-current ${isDarkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>
                      <svg className={`w-4 h-4 ${isDarkMode ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                      Applications
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${isDarkMode ? 'text-slate-300 bg-[#1a2636]' : 'text-slate-700 bg-slate-100'}`}>12</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setIsDropdownOpen(false);
                      openProfile();
                    }}
                    className={`w-full px-5 py-2.5 flex items-center justify-between transition-colors group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`flex items-center gap-3 text-sm group-hover:text-current ${isDarkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>
                      <svg className={`w-4 h-4 ${isDarkMode ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      Profile
                    </div>
                    <span className="text-xs font-bold text-[#4fa784]">72%</span>
                  </button>
                </div>
                
                <div className="py-2">
                  <button 
                    onClick={logout}
                    className="w-full px-5 py-2 flex items-center gap-3 text-sm text-[#e06b52] hover:bg-[#e06b52]/10 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};