import { supabase } from '../../../supabaseClient.js';
import { apiFetch } from './apiClient.js';

const RESUME_BUCKET = 'resumes';

export const getCandidateProfileFields = (candidateId, select = '*', { single = false } = {}) => {
  const query = supabase.from('candidate_profiles').select(select).eq('id', candidateId);
  return single ? query.single() : query.maybeSingle();
};

export const updateCandidateProfile = (candidateId, changes) => supabase
  .from('candidate_profiles')
  .update(changes)
  .eq('id', candidateId);

export const listResumeFiles = (search) => supabase.storage.from(RESUME_BUCKET).list('', { search });

const STORED_RESUME_URL = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/resumes\/([^?#]+)/;

export const resumePathFrom = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(STORED_RESUME_URL);
  if (match) return decodeURIComponent(match[1]);
  return /^[a-z][a-z0-9+.-]*:/i.test(text) ? null : text;
};

export const findResumeFile = async (candidateId) => {
  if (!candidateId) return { path: null, error: null };
  const prefix = `${candidateId}-resume.`;
  const { data, error } = await supabase.storage.from(RESUME_BUCKET).list('', { search: prefix });
  if (error) return { path: null, error };
  const file = (data || [])
    .filter((item) => item.name?.startsWith(prefix))
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))[0];
  return { path: file?.name || null, error: null };
};

export const createResumeLink = (path, expiresInSeconds = 120) => supabase.storage
  .from(RESUME_BUCKET)
  .createSignedUrl(path, expiresInSeconds);

export const uploadResume = (fileName, file) => supabase.storage
  .from(RESUME_BUCKET)
  .upload(fileName, file, { upsert: true });

export const downloadResume = (fileName) => supabase.storage.from(RESUME_BUCKET).download(fileName);

export const removeResumeFiles = (names) => supabase.storage.from(RESUME_BUCKET).remove(names);

export const parseResume = (userId, fileName) => apiFetch('/api/parse-resume', {
  method: 'POST',
  body: JSON.stringify({ userId, fileName }),
});
