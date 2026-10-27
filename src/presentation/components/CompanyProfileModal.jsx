import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient.js';
import { ShareButton, companyShareUrl } from './ShareButton';
import {
  ALLOWED_IMAGE_TYPES, MAX_GALLERY_PHOTOS, addGalleryPhotos, galleryFrom,
  removeCompanyLogo, removeGalleryPhoto, uploadCompanyLogo,
} from '../../data/services/companyMedia';

const validCompanyWebsite = (value) => {
  if (!value || !value.trim()) return '';
  const trimmed = value.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

export const CompanyProfileModal = ({ user, onClose, isDarkMode = true }) => {
  const [activeTab, setActiveTab] = useState('about');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [jobs, setJobs] = useState([]);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [companyExists, setCompanyExists] = useState(false);
  const [companyData, setCompanyData] = useState({
    companyName: '', website: '', industry: '', size: '', location: '', description: ''
  });
  const [logo, setLogo] = useState({ url: null, path: null });
  const [gallery, setGallery] = useState([]);
  const [mediaBusy, setMediaBusy] = useState(null);
  const [mediaError, setMediaError] = useState('');
  const [mediaMessage, setMediaMessage] = useState('');
  const logoInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    const fetchCompany = async () => {
      if (!user?.id) { if (active) setIsLoadingProfile(false); return; }
      setIsLoadingProfile(true);
      setProfileError('');
      const { data, error } = await supabase
        .from('employers')
        .select('id, companyName, website, industry, size, location, description, logo_url, logo_path, gallery_photos')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setProfileError(`Could not load company profile: ${error.message}`);
      } else {
        setCompanyExists(Boolean(data));
        setCompanyData({
          companyName: data?.companyName || user?.name || '',
          website: data?.website || '',
          industry: data?.industry || '',
          size: data?.size || '',
          location: data?.location || '',
          description: data?.description || ''
        });
        setLogo({ url: data?.logo_url || null, path: data?.logo_path || null });
        setGallery(galleryFrom(data?.gallery_photos));
      }
      setIsLoadingProfile(false);
    };
    fetchCompany();
    return () => { active = false; };
  }, [user?.id, user?.name]);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('job_postings')
        .select('*')
        .eq('recruiter_id', user.id)
        .eq('is_archived', false)
        .eq('hiring_status', 'open')
        .order('created_at', { ascending: false });
      if (data) setJobs(data);
    };
    fetchJobs();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) { setProfileError('Please sign in again before saving.'); return; }
    if (!companyData.companyName.trim()) {
      setProfileError('Company name is required.');
      return;
    }
    const website = validCompanyWebsite(companyData.website);
    if (website === null) {
      setProfileError('Enter a valid website URL (https://example.com).');
      return;
    }
    const details = {
      companyName: companyData.companyName.trim(),
      website,
      industry: companyData.industry.trim(),
      size: companyData.size.trim(),
      location: companyData.location.trim(),
      description: companyData.description.trim(),
    };
    setIsSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const request = companyExists
        ? supabase.from('employers').update(details).eq('id', user.id)
        : supabase.from('employers').insert({ id: user.id, email: user.email, ...details });
      const { data, error } = await request
        .select('id, companyName, website, industry, size, location, description')
        .single();
      if (error) throw error;
      setCompanyExists(true);
      setCompanyData({
        companyName: data.companyName || '', website: data.website || '',
        industry: data.industry || '', size: data.size || '',
        location: data.location || '', description: data.description || ''
      });
      setIsEditing(false);
      setProfileSuccess('Company profile saved successfully.');
    } catch (error) {
      setProfileError(`Could not save company profile: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const mediaUser = { id: user?.id, email: user?.email, name: companyData.companyName || user?.name };
  const applyMediaRow = (row) => {
    setCompanyExists(true);
    setLogo({ url: row?.logo_url || null, path: row?.logo_path || null });
    setGallery(galleryFrom(row?.gallery_photos));
  };
  const runMedia = async (kind, action, successText) => {
    if (!user?.id) { setMediaError('Please sign in again.'); return; }
    setMediaBusy(kind);
    setMediaError('');
    setMediaMessage('');
    try {
      const result = await action();
      applyMediaRow(result?.row || result);
      setMediaMessage(typeof successText === 'function' ? successText(result) : successText);
    } catch (error) {
      setMediaError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setMediaBusy(null);
    }
  };
  const handleLogoFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    runMedia('logo', () => uploadCompanyLogo(mediaUser, file, { exists: companyExists, previousPath: logo.path }), 'Logo updated.');
  };
  const handleRemoveLogo = () => runMedia('logo', () => removeCompanyLogo(mediaUser, { exists: companyExists, previousPath: logo.path }), 'Logo removed.');
  const handleGalleryFiles = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    runMedia('gallery', () => addGalleryPhotos(mediaUser, files, { exists: companyExists, current: gallery }), (result) => (
      result?.skipped ? `Added ${files.length - result.skipped} photo(s). ${result.skipped} skipped: the limit is ${MAX_GALLERY_PHOTOS}.` : 'Photos added.'
    ));
  };
  const handleRemovePhoto = (photo) => runMedia('gallery', () => removeGalleryPhoto(mediaUser, photo, { exists: companyExists, current: gallery }), 'Photo removed.');

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const updateField = (field, value) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  const inputClass = `w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#ea6036] transition-colors ${isDarkMode ? 'bg-[#0a121c] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'}`;
  const labelClass = `text-xs font-bold uppercase tracking-wider mb-1.5 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-200" aria-modal="true">
      <div className={`fixed inset-0 backdrop-blur-md transition-opacity ${isDarkMode ? 'bg-[#04080e]/80' : 'bg-slate-900/30'}`} onClick={handleOverlayClick}></div>

      <div className={`relative w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] transition-colors duration-200 ${isDarkMode ? 'bg-[#0d1622] border border-[#1b2b3b]' : 'bg-white border border-slate-200'}`}>

        <div className={`p-6 sm:p-8 border-b ${isDarkMode ? 'border-white/5 bg-[#121b27]' : 'border-slate-200 bg-slate-50'}`}>
          <button onClick={onClose} className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-20 ${isDarkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <div className="flex items-center gap-5">
            <div className={`relative w-16 h-16 shrink-0 overflow-hidden rounded-2xl flex items-center justify-center text-2xl font-bold shadow-sm transition-colors ${isDarkMode ? 'bg-[#0a121c] border border-white/10 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}>
              {(companyData.companyName || user?.name || 'CO').trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}
              {logo.url && <img src={logo.url} alt="Company logo" className="absolute inset-0 h-full w-full bg-white object-contain p-1" />}
              {mediaBusy === 'logo' && <span className="absolute inset-0 flex items-center justify-center bg-black/50"><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /></span>}
            </div>
            <div className="min-w-0">
              <h1 className={`text-2xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {companyData.companyName || user?.name || 'Company Workspace'}
              </h1>
              <p className={`mt-1.5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Company profile
                {user?.id && <> · <a href={`/companies/${encodeURIComponent(user.id)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#ea6036] hover:underline">View public page ↗</a>
                  {' · '}
                  <ShareButton url={companyShareUrl(user.id)} title={`${companyData.companyName || 'Our company'} on ResuMatch`}
                    text={`See ${companyData.companyName || 'our company'}'s profile and open jobs on ResuMatch.`} label="Share page"
                    isDarkMode={isDarkMode} className="align-middle font-semibold text-[#ea6036] hover:underline" /></>}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input ref={logoInputRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(',')} className="hidden" onChange={handleLogoFile} />
                <button type="button" onClick={() => logoInputRef.current?.click()} disabled={Boolean(mediaBusy) || isLoadingProfile}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${isDarkMode ? 'border-white/10 text-slate-200 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-white'}`}>
                  {mediaBusy === 'logo' ? 'Uploading…' : logo.url ? 'Change logo' : 'Upload logo'}
                </button>
                {logo.url && (
                  <button type="button" onClick={handleRemoveLogo} disabled={Boolean(mediaBusy)} className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-60">Remove</button>
                )}
                <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Square image, up to 2 MB</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex items-center gap-6 px-6 sm:px-8 border-b transition-colors ${isDarkMode ? 'border-[#1b2b3b]' : 'border-slate-200'}`}>
          {['about', 'jobs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 text-sm font-bold capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-[#ea6036] text-[#ea6036]' : `border-transparent ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}`}
            >
              {tab} {tab === 'jobs' && <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'jobs' ? 'bg-[#ea6036]/10' : (isDarkMode ? 'bg-white/10' : 'bg-slate-100')}`}>{jobs.length}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">

          {isLoadingProfile && <p role="status" className="mb-4 text-sm text-slate-500">Loading saved company details...</p>}
          {profileError && <p role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{profileError}</p>}
          {profileSuccess && <p role="status" className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{profileSuccess}</p>}
          {mediaError && <p role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{mediaError}</p>}
          {mediaMessage && <p role="status" className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mediaMessage}</p>}

          {activeTab === 'about' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className={`text-xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Company overview</h2>
                <button
                  onClick={() => { if (isEditing) handleSave(); else { setProfileError(''); setProfileSuccess(''); setIsEditing(true); } }}
                  disabled={isSaving || isLoadingProfile}
                  className={`px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 ${isEditing ? 'bg-[#4fa784] hover:bg-[#3d8c6d] text-white' : `border ${isDarkMode ? 'bg-[#1a2636] hover:bg-[#233348] border-white/10 text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'}`}`}
                >
                  {isSaving ? 'Saving...' : isEditing ? 'Save Details' : 'Edit Profile'}
                </button>
              </div>

              {isEditing ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div><label className={labelClass}>Company Name</label><input value={companyData.companyName} onChange={e => updateField('companyName', e.target.value)} required className={inputClass} /></div>
                  <div><label className={labelClass}>Website</label><input value={companyData.website} onChange={e => updateField('website', e.target.value)} placeholder="https://..." className={inputClass} /></div>
                  <div><label className={labelClass}>Industry</label><input value={companyData.industry} onChange={e => updateField('industry', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Company Size</label><input value={companyData.size} onChange={e => updateField('size', e.target.value)} placeholder="e.g. 51-100" className={inputClass} /></div>
                  <div><label className={labelClass}>Primary Location</label><input value={companyData.location} onChange={e => updateField('location', e.target.value)} className={inputClass} /></div>
                  <div className="sm:col-span-2"><label className={labelClass}>About the Company</label><textarea rows="5" value={companyData.description} onChange={e => updateField('description', e.target.value)} className={`resize-none ${inputClass}`} /></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-8">
                    <div className="sm:col-span-1 text-sm font-bold text-slate-500">Website</div>
                    <div className={`sm:col-span-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{validCompanyWebsite(companyData.website) ? <a href={validCompanyWebsite(companyData.website)} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">{companyData.website}</a> : 'Not provided'}</div>

                    <div className="sm:col-span-1 text-sm font-bold text-slate-500">Industry</div>
                    <div className={`sm:col-span-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{companyData.industry || '-'}</div>

                    <div className="sm:col-span-1 text-sm font-bold text-slate-500">Company size</div>
                    <div className={`sm:col-span-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{companyData.size || '-'}</div>

                    <div className="sm:col-span-1 text-sm font-bold text-slate-500">Primary location</div>
                    <div className={`sm:col-span-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{companyData.location || '-'}</div>
                  </div>

                  <div className={`pt-6 border-t leading-relaxed text-sm ${isDarkMode ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                    {companyData.description || 'No description provided.'}
                  </div>
                </div>
              )}

              <section className={`pt-8 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`} aria-labelledby="company-gallery-title">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 id="company-gallery-title" className={`text-xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Company photos <span className={`ml-1 text-sm font-sans font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{gallery.length}/{MAX_GALLERY_PHOTOS}</span>
                    </h2>
                    <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Shown under "At a glance" on your public company page. JPG, PNG, WebP or GIF, up to 5 MB each.</p>
                  </div>
                  <input ref={galleryInputRef} type="file" multiple accept={ALLOWED_IMAGE_TYPES.join(',')} className="hidden" onChange={handleGalleryFiles} />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {gallery.map((photo, index) => (
                    <div key={photo.url} className={`group relative aspect-square overflow-hidden rounded-xl border ${isDarkMode ? 'border-white/10 bg-[#0a121c]' : 'border-slate-200 bg-slate-50'}`}>
                      <img src={photo.url} alt={`Company photo ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                      <button type="button" onClick={() => handleRemovePhoto(photo)} disabled={Boolean(mediaBusy)} aria-label={`Remove photo ${index + 1}`}
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  {gallery.length < MAX_GALLERY_PHOTOS && (
                    <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={Boolean(mediaBusy) || isLoadingProfile}
                      className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-xs font-bold transition-colors disabled:opacity-60 ${isDarkMode ? 'border-white/15 text-slate-400 hover:border-[#ea6036] hover:text-white' : 'border-slate-300 text-slate-500 hover:border-[#ea6036] hover:text-[#ea6036]'}`}>
                      {mediaBusy === 'gallery'
                        ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                        : <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
                      {mediaBusy === 'gallery' ? 'Uploading…' : 'Add photos'}
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="animate-in fade-in duration-300">
               <h2 className={`mb-6 text-xl font-serif font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Active Roles</h2>

               <div className="grid gap-4 sm:grid-cols-2">
                 {jobs.length === 0 ? (
                   <div className={`sm:col-span-2 py-10 text-center rounded-xl border ${isDarkMode ? 'bg-[#121b27] border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                     <p className="text-sm">No active jobs posted yet.</p>
                   </div>
                 ) : jobs.map((job) => (
                   <div key={job.id} className={`p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-[#121b27] border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:shadow-md'}`}>
                     <div className="flex justify-between items-start mb-3">
                       <div>
                         <h3 className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
                         <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{companyData.companyName || user?.name} • {job.location}</p>
                       </div>
                     </div>
                     <p className={`text-xs line-clamp-2 leading-relaxed mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                       {job.description}
                     </p>
                     <div className={`flex items-center justify-between text-[11px] font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                       <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                       <span className={`px-2 py-1 rounded-md ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`}>{job.work_type}</span>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
