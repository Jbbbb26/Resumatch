import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient.js';

const JOB_SELECT = 'id,recruiter_id,title,location,work_type,employment_type,description,requirements,created_at,status,hiring_status,is_archived';

async function fetchJobs(candidateId, jobId) {
  let query = supabase
    .from('job_postings')
    .select(JOB_SELECT)
    .eq('status', 'active')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (jobId) query = query.eq('id', jobId);
  const { data: rows, error } = await query;
  if (error) throw error;

  let matchById = new Map();
  if (candidateId) {
    const { data: recommendations, error: matchError } = await supabase.rpc('get_recommended_jobs', {
      p_candidate_id: candidateId,
      match_threshold: 0.4,
      match_count: 10,
    });
    if (matchError) throw matchError;
    matchById = new Map((recommendations || []).map((job) => [job.id, {
      match: Math.round(Number(job.similarity || 0) * 100),
      matchedKeywords: job.matched_keywords || job.matchedKeywords || null,
    }]));
  }

  const recruiterIds = [...new Set((rows || []).map((job) => job.recruiter_id).filter(Boolean))];
  const companiesResult = recruiterIds.length
    ? await supabase.from('employers').select('id,companyName').in('id', recruiterIds)
    : { data: [], error: null };
  if (companiesResult.error) throw companiesResult.error;
  const companies = new Map((companiesResult.data || []).map((employer) => [employer.id, employer.companyName]));

  return (rows || []).map((job) => ({
    ...job,
    company_name: companies.get(job.recruiter_id) || 'Company name not provided',
    match: matchById.get(job.id)?.match ?? null,
    matched_keywords: matchById.get(job.id)?.matchedKeywords || null,
  }));
}

export function useJobs(candidateId, enabled = true) {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    if (!enabled || !candidateId) return;
    setIsLoading(true);
    setError('');
    try {
      setJobs(await fetchJobs(candidateId));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load job listings.');
    } finally {
      setIsLoading(false);
    }
  }, [candidateId, enabled]);

  useEffect(() => { refetch(); }, [refetch]);
  return { jobs, setJobs, isLoading, error, refetch };
}

export function useJob(jobId, candidateId, enabled = true) {
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    if (!enabled || !jobId || !candidateId) return;
    setIsLoading(true);
    setError('');
    try {
      const jobs = await fetchJobs(candidateId, jobId);
      setJob(jobs[0] || null);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load this job.');
      setJob(null);
    } finally {
      setIsLoading(false);
    }
  }, [candidateId, enabled, jobId]);

  useEffect(() => { refetch(); }, [refetch]);
  return { job, isLoading, error, refetch };
}
