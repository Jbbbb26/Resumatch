import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient.js';

// FIXED: Added isRecruiterView to the props
export const ProfileModal = ({ user, onClose, isDarkMode = true, isRecruiterView = false }) => {
  const [activeTab, setActiveTab] = useState('experience');
  const [isEditable, setIsEditable] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  
  // File Upload & Parsing States
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const fileInputRef = useRef(null);
  
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  
  const [experiences, setExperiences] = useState([]);
  const [skills, setSkills] = useState([]);
  const [education, setEducation] = useState([]);
  const [links, setLinks] = useState({ portfolio: '', linkedin: '', facebook: '', github: '' });
  const [isEditingData, setIsEditingData] = useState(false);
  const [isSavingData, setIsSavingData] = useState(false);
  
  // FIXED: Removed duplicate state declaration. Sets to true if Recruiter opens it.
  const [isPreviewMode, setIsPreviewMode] = useState(isRecruiterView);

  useEffect(() => {
    const fetchExistingResume = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase.storage.from('resumes').list('', {
        search: user.id
      });
      if (data && data.length > 0) {
        const latestFile = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        setResumeData({
          name: latestFile.name,
          size: (latestFile.metadata.size / (1024 * 1024)).toFixed(2) + ' MB',
          status: 'Uploaded successfully',
          url: supabase.storage.from('resumes').getPublicUrl(latestFile.name).data.publicUrl
        });
      }
    };
    
    const fetchSavedResumeData = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('resume_data, phone, location')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error("Supabase Fetch Error:", error.message);
      }
      
      if (data) {
        if (data.phone) setPhone(data.phone);
        if (data.location) setLocation(data.location);
        
        if (data.resume_data) {
          setExperiences(data.resume_data.experience || []);
          setSkills(data.resume_data.skills || []);
          setEducation(data.resume_data.education || []);
          setLinks(data.resume_data.links || { portfolio: '', linkedin: '', facebook: '', github: '' });
        }
      }
    };
    fetchExistingResume();
    fetchSavedResumeData();
  }, [user]);

  useEffect(() => {
    if (!isEditingData) return;
    const autoSaveTimer = setTimeout(async () => {
      setIsSavingData(true);
      const updatedResumeData = {
        experience: experiences,
        education: education,
        skills: skills,
        links: links
      };
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ 
          resume_data: updatedResumeData,
          phone: phone,         
          location: location    
        })
        .eq('id', user.id);
      if (error) console.error("Error auto-saving data:", error.message);
      setIsSavingData(false);
    }, 1500);
    return () => clearTimeout(autoSaveTimer);
  }, [experiences, education, skills, links, phone, location, isEditingData, user?.id]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setShowConfirmModal(true);
  };

  const cancelUpload = () => {
    setPendingFile(null);
    setShowConfirmModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmUpload = async () => {
    setShowConfirmModal(false);
    const file = pendingFile;
    if (!file) return;

    setIsUploading(true);

    if (resumeData) {
      setResumeData(prev => ({ ...prev, status: "Replacing..." }));
    } else {
      setResumeData({ name: file.name, size: (file.size / (1024 * 1024)).toFixed(2) + ' MB', status: "Uploading..." });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-resume.${fileExt}`;
    
    const { data, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error("Supabase Upload Error:", uploadError);
      setResumeData(prev => ({ ...prev, status: "Upload Failed" }));
      setIsUploading(false);
      return;
    }

    setResumeData({
      name: fileName,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      status: 'Resume updated successfully',
      url: supabase.storage.from('resumes').getPublicUrl(fileName).data.publicUrl
    });
    
    setIsUploading(false);
    setIsParsing(true);

    fetch('http://localhost:3000/api/parse-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, fileName: fileName })
    })
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          setExperiences(result.data.experience || []);
          setSkills(result.data.skills || []);
          setEducation(result.data.education || []);
        }
      })
      .catch(err => console.error("Backend parsing error:", err))
      .finally(() => {
        setIsParsing(false);
        setPendingFile(null);
      });
  };

  const handleFinalSaveAndClose = async () => {
    setIsSavingData(true);
    const updatedResumeData = {
      experience: experiences,
      education: education,
      skills: skills,
      links: links
    };
    await supabase
      .from('candidate_profiles')
      .update({ 
        resume_data: updatedResumeData,
        phone: phone,       
        location: location  
      })
      .eq('id', user.id);
    setIsSavingData(false);
    setIsEditingData(false);
    setIsEditable(false); 
  };

  const handleEduChange = (index, field, value) => {
    const newEdu = [...education];
    newEdu[index][field] = value;
    setEducation(newEdu);
  };
  const addEdu = () => setEducation([...education, { degree: '', school: '', year: '' }]);
  const removeEdu = (index) => setEducation(education.filter((_, i) => i !== index));

  const handleExpChange = (index, field, value) => {
    const newExp = [...experiences];
    newExp[index][field] = value;
    setExperiences(newExp);
  };
  const handleExpResChange = (index, value) => {
    const newExp = [...experiences];
    newExp[index].responsibilities = value.split('\n').filter(res => res.trim() !== '');
    setExperiences(newExp);
  };
  const addExp = () => setExperiences([...experiences, { title: '', company: '', startDate: '', endDate: '', responsibilities: [] }]);
  const removeExp = (index) => setExperiences(experiences.filter((_, i) => i !== index));

  const handleSkillsChange = (e) => {
    setSkills(e.target.value.split(',').map(s => s.trim()).filter(s => s !== ''));
  };

  const handleLinkChange = (field, value) => {
    setLinks({ ...links, [field]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200" aria-modal="true">
      <div className={`fixed inset-0 backdrop-blur-md transition-opacity ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`} onClick={onClose}></div>
      <div className={`relative w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] transition-colors duration-200 ${isDarkMode ? 'bg-[#0d1622] border border-[#1b2b3b]' : 'bg-white border border-slate-200'}`}>
        <button onClick={onClose} className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-20 ${isDarkMode ? 'bg-[#121b27] hover:bg-[#1a2636] border border-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-900'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <div className="overflow-y-auto p-6 md:p-8 space-y-6">
          
          <div className={`rounded-2xl p-6 relative transition-colors ${isDarkMode ? 'bg-[#121b27] border border-white/5' : 'bg-slate-50 border border-slate-200'}`}>
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="relative">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-serif text-[#ea6036] shadow-inner transition-colors ${isDarkMode ? 'bg-[#0a121c] border border-white/10' : 'bg-white border border-slate-200'}`}>
                  {user?.initials || 'DP'}
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <h1 className={`text-2xl font-serif font-bold tracking-wide transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user?.name || 'User Profile'}</h1>
                  {isPreviewMode && !isRecruiterView && (
                    <span className="bg-[#ea6036]/20 text-[#ea6036] border border-[#ea6036]/30 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                      Recruiter View Mode
                    </span>
                  )}
                </div>
                <div className={`flex flex-wrap items-center gap-2 text-xs transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  
                  {/* LOCATION INPUT */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${isDarkMode ? 'bg-[#0a121c] border-white/5 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} ${isEditable && !isPreviewMode ? 'border-white/20 focus-within:border-[#ea6036]' : ''}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    {isEditable && !isPreviewMode ? (
                      <input 
                        type="text" 
                        value={location} 
                        onChange={(e) => setLocation(e.target.value)} 
                        placeholder="City / Remote" 
                        className={`bg-transparent border-none focus:outline-none w-28 text-xs ${isDarkMode ? 'text-slate-200 placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`} 
                      />
                    ) : (
                      <span>{location || "Add Location"}</span>
                    )}
                  </div>

                  {/* EMAIL DISPLAY */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${isDarkMode ? 'bg-[#0a121c] border-white/5 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    <span>{user?.email || "email@example.com"}</span>
                  </div>

                  {/* PHONE INPUT */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${isDarkMode ? 'bg-[#0a121c] border-white/5 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} ${isEditable && !isPreviewMode ? 'border-white/20 focus-within:border-[#ea6036]' : ''}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                    {isEditable && !isPreviewMode ? (
                      <input 
                        type="tel" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="+63 900 000 0000" 
                        className={`bg-transparent border-none focus:outline-none w-32 text-xs ${isDarkMode ? 'text-slate-200 placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`} 
                      />
                    ) : (
                      <span>{phone || "Add Phone Number"}</span>
                    )}
                  </div>
                </div>
                {!isPreviewMode && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#4fa784]">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    Last synced with AI Today
                  </div>
                )}
              </div>

              {!isRecruiterView && (
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => {
                      setIsPreviewMode(!isPreviewMode);
                      setIsEditingData(false);
                      setIsEditable(false);
                    }}
                    className={`flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 border ${isPreviewMode ? 'bg-[#ea6036] text-white border-transparent' : (isDarkMode ? 'bg-[#1a2636] hover:bg-[#233348] text-slate-300 border-white/5' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300')}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    {isPreviewMode ? 'Exit Preview' : 'Preview Profile'}
                  </button>
                  {!isPreviewMode && (
                    <button
                      onClick={() => {
                        if (isEditable) {
                          handleFinalSaveAndClose();
                        } else {
                          setIsEditable(true);
                          setIsEditingData(true);
                        }
                      }}
                      disabled={isSavingData}
                      className="flex-1 md:flex-none px-5 py-2 bg-[#ea6036] hover:bg-[#d8552e] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      {isEditable ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          {isSavingData ? 'Saving...' : 'Save Changes'}
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          Edit Profile
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={`rounded-2xl p-6 transition-colors ${isDarkMode ? 'bg-[#121b27] border border-white/5' : 'bg-slate-50 border border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-sm font-bold flex items-center gap-2 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <svg className="w-4 h-4 text-[#ea6036]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Resume / CV Master Source
                </h2>
                <p className={`text-[11px] mt-0.5 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pushes securely to encrypted storage & feeds directly into the AI parsing engine.</p>
              </div>
            </div>
            <div className={`rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${isDarkMode ? 'bg-[#0a121c] border border-white/5' : 'bg-white border border-slate-200'}`}>
              {resumeData ? (
                <>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg border text-[#ea6036] transition-colors ${isDarkMode ? 'bg-[#1a2636] border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold mb-1 truncate max-w-[200px] sm:max-w-xs transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{resumeData.name}</h3>
                      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>{resumeData.size} • {resumeData.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <a
                      href={resumeData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors border ${isDarkMode ? 'bg-[#1a2636] hover:bg-[#233348] border-white/5 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Download
                    </a>
                    {!isPreviewMode && (
                      <button
                        onClick={() => fileInputRef.current.click()}
                        disabled={isUploading}
                        className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors border ${isUploading ? (isDarkMode ? 'bg-[#1a2636]/50 cursor-not-allowed text-slate-500' : 'bg-slate-100/50 cursor-not-allowed text-slate-400') : (isDarkMode ? 'bg-[#1a2636] hover:bg-[#233348] border-white/5 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700')}`}
                      >
                        {isUploading ? (
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h-8z"></path></svg>
                        ) : (
                          <svg className="w-4 h-4 text-[#ea6036]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        )}
                        Replace
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center w-full py-8 text-center">
                  <p className={`text-sm mb-4 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No resume uploaded yet.</p>
                  {!isPreviewMode && (
                    <button
                      onClick={() => fileInputRef.current.click()}
                      disabled={isUploading}
                      className="px-5 py-2 bg-[#ea6036] hover:bg-[#d8552e] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      {isUploading ? 'Uploading...' : 'Upload Resume'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className={`rounded-2xl overflow-hidden transition-colors ${isDarkMode ? 'bg-[#121b27] border border-white/5' : 'bg-slate-50 border border-slate-200'}`}>
            <div className={`flex items-center justify-between border-b pr-4 transition-colors ${isDarkMode ? 'border-[#1b2b3b]' : 'border-slate-200'}`}>
              <div className="flex overflow-x-auto hide-scrollbar">
                <button onClick={() => setActiveTab('experience')} className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold transition-colors whitespace-nowrap ${activeTab === 'experience' ? (isDarkMode ? 'text-[#ea6036] border-b-2 border-[#ea6036] bg-white/5' : 'text-[#ea6036] border-b-2 border-[#ea6036] bg-slate-100') : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')}`}>
                  Work Experience {experiences.length > 0 && <span className={`px-2 py-0.5 rounded ml-1 ${isDarkMode ? 'bg-[#1a2636] text-slate-300' : 'bg-slate-200 text-slate-700'}`}>{experiences.length}</span>}
                </button>
                <button onClick={() => setActiveTab('education')} className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold transition-colors whitespace-nowrap ${activeTab === 'education' ? (isDarkMode ? 'text-[#ea6036] border-b-2 border-[#ea6036] bg-white/5' : 'text-[#ea6036] border-b-2 border-[#ea6036] bg-slate-100') : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')}`}>
                  Education {education.length > 0 && <span className={`px-2 py-0.5 rounded ml-1 ${isDarkMode ? 'bg-[#1a2636] text-slate-300' : 'bg-slate-200 text-slate-700'}`}>{education.length}</span>}
                </button>
                <button onClick={() => setActiveTab('skills')} className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold transition-colors whitespace-nowrap ${activeTab === 'skills' ? (isDarkMode ? 'text-[#ea6036] border-b-2 border-[#ea6036] bg-white/5' : 'text-[#ea6036] border-b-2 border-[#ea6036] bg-slate-100') : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')}`}>
                  Skills {skills.length > 0 && <span className="bg-[#1b4332] text-[#4fa784] px-2 py-0.5 rounded ml-1">{skills.length}</span>}
                </button>
                <button onClick={() => setActiveTab('links')} className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold transition-colors whitespace-nowrap ${activeTab === 'links' ? (isDarkMode ? 'text-[#ea6036] border-b-2 border-[#ea6036] bg-white/5' : 'text-[#ea6036] border-b-2 border-[#ea6036] bg-slate-100') : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')}`}>
                  Personal & Social Links
                </button>
              </div>
              
              {!isPreviewMode && (
                <div className="flex items-center gap-3">
                  {isSavingData && isEditingData && (
                     <span className={`text-xs flex items-center gap-1.5 animate-pulse transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                       Saving...
                     </span>
                  )}
                  <button 
                    onClick={() => isEditingData ? handleFinalSaveAndClose() : setIsEditingData(true)}
                    disabled={isSavingData}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 border ${isEditingData ? 'bg-[#4fa784] hover:bg-[#3d8c6d] text-white border-transparent' : (isDarkMode ? 'bg-[#1a2636] hover:bg-[#233348] text-slate-300 border-white/10' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300')}`}
                  >
                    {isSavingData && !isEditingData ? 'Saving...' : isEditingData ? 'Done Editing' : 'Edit Data'}
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 min-h-[300px]">
              {isParsing ? (
                <div className={`flex flex-col items-center justify-center h-full py-16 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <svg className="animate-spin w-10 h-10 mb-4 text-[#ea6036]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <h3 className={`text-base font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI is analyzing your resume</h3>
                  <p className="text-xs">Extracting skills, education, and experience to build your profile...</p>
                </div>
              ) : (
                <>
                  {activeTab === 'experience' && (
                    <div className="space-y-4">
                      {experiences.map((job, index) => (
                        <div key={index} className={`p-5 rounded-xl border transition-colors relative ${isDarkMode ? 'bg-[#0a121c]' : 'bg-white'} ${isEditingData && !isPreviewMode ? (isDarkMode ? 'border-white/20' : 'border-slate-400') : (isDarkMode ? 'border-white/5' : 'border-slate-200')}`}>
                          {isEditingData && !isPreviewMode && (
                            <button onClick={() => removeExp(index)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          )}
                          
                          {isEditingData && !isPreviewMode ? (
                            <div className="space-y-3 pr-8">
                              <input type="text" value={job.title} onChange={e => handleExpChange(index, 'title', e.target.value)} placeholder="Job Title" className={`w-full bg-transparent border-b text-sm font-bold focus:outline-none focus:border-[#ea6036] pb-1 ${isDarkMode ? 'border-white/10 text-white' : 'border-slate-300 text-slate-900'}`} />
                              <input type="text" value={job.company} onChange={e => handleExpChange(index, 'company', e.target.value)} placeholder="Company" className={`w-full bg-transparent border-b text-[#ea6036] text-xs font-semibold focus:outline-none focus:border-[#ea6036] pb-1 ${isDarkMode ? 'border-white/10' : 'border-slate-300'}`} />
                              <div className="flex gap-2">
                                <input type="text" value={job.startDate} onChange={e => handleExpChange(index, 'startDate', e.target.value)} placeholder="Start Date" className={`w-1/2 bg-transparent border-b text-[11px] focus:outline-none focus:border-[#ea6036] pb-1 ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-slate-300 text-slate-500'}`} />
                                <input type="text" value={job.endDate} onChange={e => handleExpChange(index, 'endDate', e.target.value)} placeholder="End Date" className={`w-1/2 bg-transparent border-b text-[11px] focus:outline-none focus:border-[#ea6036] pb-1 ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-slate-300 text-slate-500'}`} />
                              </div>
                              <textarea 
                                value={job.responsibilities?.join('\n')} 
                                onChange={e => handleExpResChange(index, e.target.value)} 
                                placeholder="Responsibilities (one per line)" 
                                className={`w-full bg-transparent border rounded-lg p-2 text-xs focus:outline-none focus:border-[#ea6036] mt-2 ${isDarkMode ? 'border-white/10 text-slate-300' : 'border-slate-300 text-slate-700'}`} 
                                rows={4} 
                              />
                            </div>
                          ) : (
                            <>
                              <h4 className={`text-sm font-bold mb-0.5 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{job.title || "Unknown Title"}</h4>
                              <p className="text-[#ea6036] text-xs font-semibold mb-1">{job.company || "Unknown Company"}</p>
                              <p className={`text-[11px] mb-3 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{job.startDate || "Start"} - {job.endDate || "Present"}</p>
                              {job.responsibilities && (
                                <ul className={`text-xs list-disc pl-4 space-y-1.5 transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                  {job.responsibilities.map((task, i) => <li key={i}>{task}</li>)}
                                </ul>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                      {isEditingData && !isPreviewMode && (
                        <button onClick={addExp} className={`w-full py-3 border border-dashed rounded-xl text-xs transition-colors ${isDarkMode ? 'border-white/20 text-slate-400 hover:text-white hover:bg-white/5' : 'border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
                          + Add Work Experience
                        </button>
                      )}
                      {!isEditingData && experiences.length === 0 && (
                        <div className={`py-12 flex flex-col items-center justify-center text-center transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10z"></path></svg>
                          <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No experience data found</p>
                          <p className="text-xs">Upload your resume to automatically extract your work history.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'education' && (
                    <div className="space-y-4">
                      {education.map((edu, index) => (
                        <div key={index} className={`p-5 rounded-xl border transition-colors relative ${isDarkMode ? 'bg-[#0a121c]' : 'bg-white'} ${isEditingData && !isPreviewMode ? (isDarkMode ? 'border-white/20' : 'border-slate-400') : (isDarkMode ? 'border-white/5' : 'border-slate-200')}`}>
                          {isEditingData && !isPreviewMode && (
                            <button onClick={() => removeEdu(index)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          )}
                          
                          {isEditingData && !isPreviewMode ? (
                            <div className="space-y-3 pr-8">
                              <input type="text" value={edu.degree} onChange={e => handleEduChange(index, 'degree', e.target.value)} placeholder="Degree / Certificate" className={`w-full bg-transparent border-b text-sm font-bold focus:outline-none focus:border-[#ea6036] pb-1 ${isDarkMode ? 'border-white/10 text-white' : 'border-slate-300 text-slate-900'}`} />
                              <input type="text" value={edu.school} onChange={e => handleEduChange(index, 'school', e.target.value)} placeholder="School / University" className={`w-full bg-transparent border-b text-[#ea6036] text-xs font-semibold focus:outline-none focus:border-[#ea6036] pb-1 ${isDarkMode ? 'border-white/10' : 'border-slate-300'}`} />
                              <input type="text" value={edu.year} onChange={e => handleEduChange(index, 'year', e.target.value)} placeholder="Years Attended" className={`w-full bg-transparent border-b text-[11px] focus:outline-none focus:border-[#ea6036] pb-1 ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-slate-300 text-slate-500'}`} />
                            </div>
                          ) : (
                            <div className="flex items-start gap-4">
                              <div className={`mt-1 p-2 rounded-lg text-[#ea6036] ${isDarkMode ? 'bg-[#1a2636]' : 'bg-slate-100'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path></svg>
                              </div>
                              <div className="flex-1">
                                <h4 className={`text-sm font-bold mb-0.5 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{edu.degree || "Degree"}</h4>
                                <p className="text-[#ea6036] text-xs font-semibold mb-1">{edu.school || "School / University"}</p>
                                <p className={`text-[11px] transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{edu.year || "Year"}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {isEditingData && !isPreviewMode && (
                        <button onClick={addEdu} className={`w-full py-3 border border-dashed rounded-xl text-xs transition-colors ${isDarkMode ? 'border-white/20 text-slate-400 hover:text-white hover:bg-white/5' : 'border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
                          + Add Education
                        </button>
                      )}
                      {!isEditingData && education.length === 0 && (
                        <div className={`py-12 flex flex-col items-center justify-center text-center transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 14l9-5-9-5-9 5 9 5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path></svg>
                          <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No education data found</p>
                          <p className="text-xs">Upload your resume to automatically extract your education.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'skills' && (
                    <div>
                      {isEditingData && !isPreviewMode ? (
                        <div>
                          <p className={`text-xs mb-2 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Separate skills with a comma</p>
                          <textarea 
                            value={skills.join(', ')} 
                            onChange={handleSkillsChange}
                            className={`w-full border rounded-xl p-4 text-sm focus:outline-none focus:border-[#ea6036] transition-colors ${isDarkMode ? 'bg-[#0a121c] border-white/20 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`} 
                            rows={6}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {skills.length > 0 ? skills.map((skill, index) => (
                            <span key={index} className={`px-3 py-1.5 border text-xs font-medium rounded-lg transition-colors ${isDarkMode ? 'bg-[#1a2636] border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                              {skill}
                            </span>
                          )) : (
                            <div className={`py-12 flex flex-col items-center justify-center text-center w-full transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                              <p className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No skills found</p>
                              <p className="text-xs">Upload your resume to automatically extract your skills.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'links' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className={`text-sm font-bold transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Portfolio & External Proof of Work</h3>
                        <p className={`text-[11px] mt-1 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Recruiters and hiring managers spend an average of 3.4 minutes on candidate live links.</p>
                      </div>
                      {isEditingData && !isPreviewMode ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className={`text-xs font-semibold transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Personal Portfolio / Website</label>
                            <input type="url" value={links.portfolio || ''} onChange={e => handleLinkChange('portfolio', e.target.value)} placeholder="https://..." className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#ea6036] transition-colors ${isDarkMode ? 'bg-[#0a121c] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                          </div>
                          <div className="space-y-2">
                            <label className={`text-xs font-semibold transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>LinkedIn Profile</label>
                            <input type="url" value={links.linkedin || ''} onChange={e => handleLinkChange('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#ea6036] transition-colors ${isDarkMode ? 'bg-[#0a121c] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                          </div>
                          <div className="space-y-2">
                            <label className={`text-xs font-semibold transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Facebook Profile</label>
                            <input type="url" value={links.facebook || ''} onChange={e => handleLinkChange('facebook', e.target.value)} placeholder="https://facebook.com/..." className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#ea6036] transition-colors ${isDarkMode ? 'bg-[#0a121c] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                          </div>
                          <div className="space-y-2">
                            <label className={`text-xs font-semibold transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>GitHub</label>
                            <input type="url" value={links.github || ''} onChange={e => handleLinkChange('github', e.target.value)} placeholder="https://github.com/..." className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#ea6036] transition-colors ${isDarkMode ? 'bg-[#0a121c] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className={`text-xs font-semibold transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Personal Portfolio / Case Studies URL</label>
                            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all">
                              <svg className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                              {links.portfolio ? <a href={links.portfolio} target="_blank" rel="noreferrer" className={`text-sm hover:text-[#ea6036] transition-colors truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{links.portfolio}</a> : <span className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Not provided</span>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className={`text-xs font-semibold transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>LinkedIn Profile</label>
                            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all">
                              <svg className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                              {links.linkedin ? <a href={links.linkedin} target="_blank" rel="noreferrer" className={`text-sm hover:text-[#ea6036] transition-colors truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{links.linkedin}</a> : <span className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Not provided</span>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className={`text-xs font-semibold transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Facebook Profile</label>
                            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all">
                              <svg className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path></svg>
                              {links.facebook ? <a href={links.facebook} target="_blank" rel="noreferrer" className={`text-sm hover:text-[#ea6036] transition-colors truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{links.facebook}</a> : <span className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Not provided</span>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className={`text-xs font-semibold transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>GitHub / Code Repositories</label>
                            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all">
                              <svg className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                              {links.github ? <a href={links.github} target="_blank" rel="noreferrer" className={`text-sm hover:text-[#ea6036] transition-colors truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{links.github}</a> : <span className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Not provided</span>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className={`absolute inset-0 backdrop-blur-sm transition-opacity ${isDarkMode ? 'bg-[#04080e]/90' : 'bg-slate-900/50'}`} onClick={cancelUpload}></div>
          <div className={`relative w-full max-w-sm p-6 rounded-2xl shadow-2xl z-10 animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-[#0d1622] border border-[#1b2b3b]' : 'bg-white border border-slate-200'}`}>
            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Upload Resume?</h3>
            <p className={`text-sm mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Are you sure you want to upload <span className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{pendingFile?.name}</span>? This will overwrite your current profile data.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={cancelUpload}
                className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${isDarkMode ? 'bg-transparent border-white/10 text-slate-300 hover:bg-white/5' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
              >
                Cancel
              </button>
              <button 
                onClick={confirmUpload}
                className="px-5 py-2 text-sm font-bold rounded-xl bg-[#ea6036] hover:bg-[#d8552e] text-white shadow-md transition-all active:scale-95"
              >
                Yes, Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};