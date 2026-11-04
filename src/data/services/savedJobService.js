import { supabase } from '../../../supabaseClient.js';

export const SAVED_JOB_SELECT = 'id,job_posting_id,created_at,job_postings(id,title,location,work_type,employment_type,status,hiring_status,is_archived,created_at)';

export const getSavedJob = (userId, jobId) => supabase
  .from('saved_jobs')
  .select(SAVED_JOB_SELECT)
  .eq('candidate_id', userId)
  .eq('job_posting_id', jobId)
  .maybeSingle();

export const saveJob = (userId, jobId, select = SAVED_JOB_SELECT) => supabase
  .from('saved_jobs')
  .insert([{ candidate_id: userId, job_posting_id: jobId }])
  .select(select)
  .single();

export const unsaveJob = (savedId, userId) => supabase
  .from('saved_jobs')
  .delete()
  .eq('id', savedId)
  .eq('candidate_id', userId);

export const SAVED_JOB_WITH_RECRUITER_SELECT = 'id,job_posting_id,created_at,job_postings(id,recruiter_id,title,location,work_type,employment_type,status,hiring_status,is_archived,created_at)';

export const listSavedJobs = (candidateId) => supabase
  .from('saved_jobs')
  .select('id, job_posting_id, created_at, job_postings(id, recruiter_id, title, location, work_type, employment_type, status, hiring_status, is_archived, created_at)')
  .eq('candidate_id', candidateId);
