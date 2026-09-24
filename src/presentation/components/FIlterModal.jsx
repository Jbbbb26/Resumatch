import React, { useState } from 'react';

export const FilterModal = ({ onClose }) => {
  const [scoreThreshold, setScoreThreshold] = useState(92);
  const [hideMissingSkills, setHideMissingSkills] = useState(true);

  return (
    <div aria-labelledby="modal-headline" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200" role="dialog">
      
      <div 
        className="fixed inset-0 bg-[#04080e]/75 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>
      
      <div className="relative w-full max-w-4xl bg-[#0d1622] border border-[#1b2b3b] rounded-2xl shadow-2xl overflow-hidden z-10 my-auto transform transition-all duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#182635]">
          <h2 className="font-sans text-base font-semibold text-white tracking-wide" id="modal-headline">Filters</h2>
          <button onClick={onClose} aria-label="Close filters" className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1a2838] transition-colors" type="button">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          <div>
            <h3 className="text-xs font-semibold text-white tracking-wider mb-4">Standard filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs text-brand-muted font-medium mb-2.5">Workplace model</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#0a121c] border-[#223547] text-[#2d6f54] focus:ring-0 focus:ring-offset-0" />
                      <span>Remote</span>
                    </label>
                    <label className="flex items-center space-x-2.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#0a121c] border-[#223547] text-[#2d6f54] focus:ring-0 focus:ring-offset-0" />
                      <span>Hybrid</span>
                    </label>
                    <label className="flex items-center space-x-2.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-[#0a121c] border-[#223547] text-[#2d6f54] focus:ring-0 focus:ring-offset-0" />
                      <span>On-site</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-brand-muted font-medium mb-2">Experience level</label>
                  <div className="relative">
                    <select className="w-full bg-[#0a121c] border border-[#1d2d3e] rounded-lg px-3.5 py-2 text-xs text-slate-200 appearance-none focus:outline-none focus:border-brand-accent cursor-pointer pr-8">
                      <option>Any level</option>
                      <option>Entry-level</option>
                      <option>Mid-level</option>
                      <option>Senior</option>
                      <option>Lead / Director</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                      <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-brand-muted font-medium mb-2">Job category</label>
                  <div className="relative">
                    <select className="w-full bg-[#0a121c] border border-[#1d2d3e] rounded-lg px-3.5 py-2 text-xs text-slate-200 appearance-none focus:outline-none focus:border-brand-accent cursor-pointer pr-8">
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
                  <label className="block text-xs text-brand-muted font-medium mb-2">Location radius</label>
                  <div className="relative">
                    <select className="w-full bg-[#0a121c] border border-[#1d2d3e] rounded-lg px-3.5 py-2 text-xs text-slate-200 appearance-none focus:outline-none focus:border-brand-accent cursor-pointer pr-8">
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
                  <label className="block text-xs text-brand-muted font-medium mb-2">Salary range (monthly)</label>
                  <div className="flex items-center space-x-2">
                    <input type="text" className="w-full bg-[#0a121c] border border-[#1d2d3e] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent" placeholder="Min" />
                    <span className="text-slate-500 text-xs">—</span>
                    <input type="text" className="w-full bg-[#0a121c] border border-[#1d2d3e] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-accent" placeholder="Max" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs text-brand-muted font-medium mb-2.5">Employment type</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-[#0a121c] border-[#223547] text-[#2d6f54] focus:ring-0 focus:ring-offset-0" />
                      <span>Full-time</span>
                    </label>
                    <label className="flex items-center space-x-2.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#0a121c] border-[#223547] text-[#2d6f54] focus:ring-0 focus:ring-offset-0" />
                      <span>Part-time</span>
                    </label>
                    <label className="flex items-center space-x-2.5 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                      <input type="checkbox" className="w-4 h-4 rounded bg-[#0a121c] border-[#223547] text-[#2d6f54] focus:ring-0 focus:ring-offset-0" />
                      <span>Contract</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-brand-muted font-medium mb-2">Date posted</label>
                  <div className="relative">
                    <select className="w-full bg-[#0a121c] border border-[#1d2d3e] rounded-lg px-3.5 py-2 text-xs text-slate-200 appearance-none focus:outline-none focus:border-brand-accent cursor-pointer pr-8">
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

          <div className="p-5 rounded-xl border border-[#1d3d34] bg-[#0c1a1a]/40 space-y-4">
            <h4 className="text-xs font-semibold text-[#4fa784] tracking-wide">
              AI-powered filters — the ResuMatch advantage
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              
              <div className="space-y-2">
                <span className="block text-xs text-slate-300 font-medium">Minimum match score threshold</span>
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
                <span className="block text-xs text-slate-300 font-medium">Missing skill tolerance</span>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-white">Hide jobs missing required skills</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Filters out roles where a mandatory AI-extracted skill isn't on your resume</p>
                  </div>
                  
                  <button 
                    type="button"
                    role="switch"
                    aria-checked={hideMissingSkills}
                    onClick={() => setHideMissingSkills(!hideMissingSkills)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${hideMissingSkills ? 'bg-[#2a684f]' : 'bg-[#1a2838]'}`} 
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${hideMissingSkills ? 'translate-x-5' : 'translate-x-0'}`}></span>
                  </button>

                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-[#0a121c]/80 border-t border-[#182635]">
          <button className="text-xs font-medium text-slate-400 hover:text-white transition-colors" type="button">
            Clear all
          </button>
          <div className="flex items-center space-x-3">
            <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors" type="button">
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