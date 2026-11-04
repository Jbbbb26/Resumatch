import { supabase } from '../../../supabaseClient.js';
import { apiFetch } from './apiClient.js';

const JOB_SELECT = 'id,recruiter_id,title,location,work_type,employment_type,experience_level,job_category,salary_min,salary_max,description,requirements,created_at,status,hiring_status,is_archived';

export const listActiveJobs = (jobId) => {
  let query = supabase
    .from('job_postings')
    .select(JOB_SELECT)
    .eq('status', 'active')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });
  if (jobId) query = query.eq('id', jobId);
  return query;
};

export const getJobById = (jobId) => supabase.from('job_postings').select('*').eq('id', jobId).maybeSingle();

export const getRecommendedJobs = (candidateId) => supabase.rpc('get_recommended_jobs', {
  p_candidate_id: candidateId,
  match_threshold: 0.4,
  match_count: 10,
});

export const listCompanyNames = (recruiterIds) => supabase.from('employers').select('id,companyName').in('id', recruiterIds);

export const getCompanyName = (recruiterId) => supabase.from('employers').select('companyName').eq('id', recruiterId).maybeSingle();

export const listEmployers = (recruiterIds) => supabase.from('employers').select('*').in('id', recruiterIds);

export const listCachedMatchScores = (candidateId, jobIds) => supabase.from('job_match_analysis')
  .select('job_id, score')
  .eq('candidate_id', candidateId)
  .in('job_id', jobIds);

export async function fetchMatchAnalyses(jobIds) {
  if (!jobIds.length) return { analyses: {}, error: '' };
  const response = await apiFetch('/api/match-analysis', {
    method: 'POST',
    body: JSON.stringify({ jobIds }),
  });
  if (!response?.success) {
    console.error('Match analysis failed:', response?.message);
    return { analyses: {}, error: response?.message || 'Match analysis is unavailable right now.' };
  }
  return { analyses: response.data || {}, error: '' };
}

export const listRecruiterJobs = (statusFilter) => apiFetch(`/api/jobs?status=${statusFilter}`);

export const patchRecruiterJob = (jobId, path, body) => apiFetch(`/api/jobs/${jobId}/${path}`, {
  method: 'PATCH',
  ...(body ? { body: JSON.stringify(body) } : {}),
});

export const createJob = (payload) => apiFetch('/api/post-job', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const updateJob = (jobId, payload) => apiFetch(`/api/jobs/${jobId}`, {
  method: 'PUT',
  body: JSON.stringify(payload),
});

export const listMatchAnalysesForJob = (jobId, candidateIds) => supabase
  .from('job_match_analysis')
  .select('candidate_id, score, coverage, overall_similarity, requirements, computed_at')
  .eq('job_id', jobId)
  .in('candidate_id', candidateIds);

export const listRecruiterActiveJobs = (recruiterId) => supabase
  .from('job_postings')
  .select('*')
  .eq('recruiter_id', recruiterId)
  .eq('is_archived', false)
  .order('created_at', { ascending: false });
