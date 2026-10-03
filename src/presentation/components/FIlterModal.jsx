import React, { useState } from 'react';

export const FilterModal = ({ onClose, isDarkMode = true }) => {
  const [scoreThreshold, setScoreThreshold] = useState(92);
  const [hideMissingSkills, setHideMissingSkills] = useState(true);

  const inputBg = isDarkMode ? 'bg-[#0a121c] border-[#1d2d3e] text-slate-200' : 'bg-white border-slate-300 text-slate-700';
  const labelColor = isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900';

  return (
    <div aria-labelledby="modal-headline" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200" role="dialog">
      
      <div 
        className={`fixed inset-0 backdrop-blur-sm transition-opacity ${isDarkMode ? 'bg-[#04080e]/75' : 'bg-slate-900/30'}`} 
        onClick={onClose}
      ></div>
      
      <div className={`relative w-full max-w-4xl border rounded-2xl shadow-2xl overflow-hidden z-10 my-auto transform transition-all duration-200 ${isDarkMode ? 'bg-[#0d1622] border-[#1b2b3b]' : 'bg-white border-slate-200'}`}>
        
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-[#182635]' : 'border-slate-100'}`}>
          <h2 className={`font-sans text-base font-semibold tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`} id="modal-headline">Filters</h2>
          <button onClick={onClose} aria-label="Close filters" className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-[#1a2838]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`} type="button">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          <div>
            <h3 className={`text-xs font-semibold tracking-wider mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Standard filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-6">
                <div>
                  <label className={`block text-xs font-medium mb-2.5 ${isDarkMode ? 'text-brand-muted' : 'text-slate-600'}`}>Workplace model</label>
                  <div className="space-y-2">
                    {['Remote', 'Hybrid', 'On-site'].map((model, idx) => (
                      <label key={idx} className={`flex items-center space-x-2.5 text-xs cursor-pointer select-none ${labelColor}`}>
                        <input type="checkbox" defaultChecked={model === 'On-site'} className={`w-4 h-4 rounded focus:ring-0 focus:ring-offset-0 ${isDarkMode ? 'bg-[#0a121c] border-[#223547] text-[#2d6f54]' : 'bg-white border-slate-300 text-emerald-600'}`} />
                        <span>{model}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-brand-muted' : 'text-slate-600'}`}>Experience level</label>
                  <div className="relative">
                    <select className={`w-full border rounded-lg px-3.5 py-2 text-xs appearance-none focus:outline-none focus:border-brand-accent cursor-pointer pr-8 ${inputBg}`}>
                      <option>Any level</option>
                      <option>Entry-level</option>
                      <option>Mid-level</option>
                      <option>Senior</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                      <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-brand-muted' : 'text-slate-600'}`}>Job category</label>
                  <div className="relative">
                    <select className={`w-full border rounded-lg px-3.5 py-2 text-xs appearance-none focus:outline-none focus:border-brand-accent cursor-pointer pr-8 ${inputBg}`}>
                      <option>All Categories</option>
                      <option>Design &amp; Creative</option>
                      <option>Software Development &amp; Engineering</option>
                      <option>Product Management</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                      <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-brand-muted' : 'text-slate-600'}`}>Location radius</label>
                  <div className="relative">
                    <select className={`w-full border rounded-lg px-3.5 py-2 text-xs appearance-none focus:outline-none focus:border-brand-accent cursor-pointer pr-8 ${inputBg}`}>
                      <option>Within 10 miles</option>
                      <option>Within 25 miles</option>
                      <option>Within 50 miles</option>
                      <option>Worldwide</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                      <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-brand-muted' : 'text-slate-600'}`}>Salary range (monthly)</label>
                  <div className="flex items-center space-x-2">
                    <input type="text" className={`w-full border rounded-lg px-3 py-2 text-xs placeholder-slate-500 focus:outline-none focus:border-brand-accent ${inputBg}`} placeholder="Min" />
                    <span className="text-slate-500 text-xs">-</span>
                    <input type="text" className={`w-full border rounded-lg px-3 py-2 text-xs placeholder-slate-500 focus:outline-none focus:border-brand-accent ${inputBg}`} placeholder="Max" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className={`block text-xs font-medium mb-2.5 ${isDarkMode ? 'text-brand-muted' : 'text-slate-600'}`}>Employment type</label>
                  <div className="space-y-2">
                    {['Full-time', 'Part-time', 'Contract'].map((type, idx) => (
                      <label key={idx} className={`flex items-center space-x-2.5 text-xs cursor-pointer select-none ${labelColor}`}>
                        <input type="checkbox" defaultChecked={type === 'Full-time'} className={`w-4 h-4 rounded focus:ring-0 focus:ring-offset-0 ${isDarkMode ? 'bg-[#0a121c] border-[#223547] text-[#2d6f54]' : 'bg-white border-slate-300 text-emerald-600'}`} />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-brand-muted' : 'text-slate-600'}`}>Date posted</label>
                  <div className="relative">
                    <select className={`w-full border rounded-lg px-3.5 py-2 text-xs appearance-none focus:outline-none focus:border-brand-accent cursor-pointer pr-8 ${inputBg}`}>
                      <option>Anytime</option>
                      <option>Past 24 hours</option>
                      <option>Past week</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                      <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`p-5 rounded-xl border space-y-4 ${isDarkMode ? 'border-[#1d3d34] bg-[#0c1a1a]/40' : 'border-emerald-200 bg-emerald-50/50'}`}>
            <h4 className="text-xs font-semibold text-[#4fa784] tracking-wide">
              AI-powered filters — the ResuMatch advantage
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              
              <div className="space-y-2">
                <span className={`block text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Minimum match score threshold</span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="font-serif text-2xl font-bold text-[#45a377]">{scoreThreshold}%</span>
                  <span className="text-xs text-slate-400">and above</span>
                </div>
                <div className="pt-1">
                  <input 
                    type="range" 
                    min="50" 
                    max="99" 
                    value={scoreThreshold} 
                    onChange={(e) => setScoreThreshold(e.target.value)}
                    className="w-full accent-slider cursor-pointer" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className={`block text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Missing skill tolerance</span>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className={`text-xs font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Hide jobs missing required skills</p>
                    <p className={`text-[11px] mt-0.5 leading-snug ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Filters out roles where a mandatory AI-extracted skill isn't on your resume</p>
                  </div>
                  
                  <button 
                    type="button"
                    role="switch"
                    aria-checked={hideMissingSkills}
                    onClick={() => setHideMissingSkills(!hideMissingSkills)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${hideMissingSkills ? 'bg-[#2a684f]' : (isDarkMode ? 'bg-[#1a2838]' : 'bg-slate-300')}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${hideMissingSkills ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex items-center justify-between px-6 py-4 border-t ${isDarkMode ? 'bg-[#0a121c]/80 border-[#182635]' : 'bg-slate-50 border-slate-200'}`}>
          <button className={`text-xs font-medium transition-colors ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`} type="button">
            Clear all
          </button>
          <div className="flex items-center space-x-3">
            <button onClick={onClose} className={`px-4 py-2 text-xs font-medium transition-colors ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`} type="button">
              Cancel
            </button>
            <button onClick={onClose} className="px-5 py-2 bg-brand-accent hover:bg-brand-accentHover text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95" type="button">
              Apply filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};