import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient.js';
import { apiFetch } from '../data/services/apiClient.js';

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

const JOB_SELECT = 'id,recruiter_id,title,location,work_type,employment_type,experience_level,job_category,salary_min,salary_max,description,requirements,created_at,status,hiring_status,is_archived';

const isNursingPosition = (title = '') =>
  /\b(nurse|nursing)\b/i.test(title) &&
  !/\b(software|developer|web|application|programmer)\b/i.test(title);

function getCandidateNursingEvidence(profile) {
  if (!profile) return null;

  const  resume = profile.resume_data && typeof profile.resume_data === 'object'
    ? profile.resume_data
    : {};

  const skills = [...(Array.isArray(profile.skills) ? profile.skills : []),
    ...(Array.isArray(resume.skills) ? resume.skills : [])];
  const experience = Array.isArray(profile.experience) && profile.experience.length
    ? profile.experience
    : (Array.isArray(resume.experience) ? resume.experience : []);
  const education = Array.isArray(resume.education) ? resume.education : [];

  const hasResumeEvidence = skills.length > 0 || experience.length > 0 || education.length > 0;
  if (!hasResumeEvidence) return null;

  const educationText = JSON.stringify(education).toLowerCase();
  const experienceText = JSON.stringify(experience).toLowerCase();
  const skillsText = JSON.stringify(skills).toLowerCase();

  if (/\b(bsn|bachelor(?: of science)? (?:in|of) nursing|nursing degree|nursing diploma)\b/i.test(educationText)) return true;
  if (/\b(registered nurse|staff nurse|licensed practical nurse|nurse practitioner|clinical nurse|nursing assistant)\b/i.test(experienceText)) return true;

  const clinicalSignals = [
    /\b(patient care|patient assessment)\b/i,
    /\b(bls|basic life support|acls|advanced cardiac life support)\b/i,
    /\btriage\b/i,
    /\b(iv therapy|iv administration|intravenous|iv insertion)\b/i,
    /\b(medication administration|administering medication)\b/i,
    /\b(vital signs|clinical assessment)\b/i,
    /\b(nursing care|clinical nursing)\b/i,
  ];
  return clinicalSignals.filter((signal) => signal.test(skillsText) || signal.test(experienceText)).length >= 2;
}

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
  let nursingEvidence = null;
  let analyses = {};
  let analysisError = '';
  if (candidateId) {
    const [{ data: recommendations, error: matchError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.rpc('get_recommended_jobs', {
        p_candidate_id: candidateId,
        match_threshold: 0.4,
        match_count: 10,
      }),
      supabase.from('candidate_profiles')
        .select('skills,experience,resume_data')
        .eq('id', candidateId)
        .maybeSingle(),
    ]);
    if (matchError) throw matchError;
    if (profileError) throw profileError;
    nursingEvidence = getCandidateNursingEvidence(profile);
    matchById = new Map((recommendations || []).map((job) => [job.id, {
      match: Math.round(Number(job.similarity || 0) * 100),
      semanticSimilarity: Number(job.similarity),
      matchedKeywords: job.matched_keywords || job.matchedKeywords || null,
    }]));
    const visibleIds = new Set((rows || []).map((job) => job.id));
    const analyseIds = jobId ? [jobId] : [...matchById.keys()].filter((id) => visibleIds.has(id));
    ({ analyses, error: analysisError } = await fetchMatchAnalyses(analyseIds));
  }

  const recruiterIds = [...new Set((rows || []).map((job) => job.recruiter_id).filter(Boolean))];
  const companiesResult = recruiterIds.length
    ? await supabase.from('employers').select('id,companyName').in('id', recruiterIds)
    : { data: [], error: null };
  if (companiesResult.error) throw companiesResult.error;
  const companies = new Map((companiesResult.data || []).map((employer) => [employer.id, employer.companyName]));

  return (rows || []).map((job) => {
    const nursingRole = isNursingPosition(job.title);
    const outOfField = candidateId && nursingRole && nursingEvidence === false;
    const unverified = candidateId && nursingRole && nursingEvidence === null;
    const recommended = matchById.get(job.id);
    const matchAnalysis = analyses[job.id] || null;

    return {
      ...job,
      company_name: companies.get(job.recruiter_id) || 'Company name not provided',
      semanticSimilarity: recommended?.semanticSimilarity ?? null,
      aiSimilarity: recommended?.match ?? null,
      matchAnalysis,
      matchAnalysisError: matchAnalysis ? '' : analysisError,
      match: outOfField ? 0 : (unverified ? null : (matchAnalysis?.score ?? null)),
      matched_keywords: outOfField ? [] : (recommended?.matchedKeywords || null),
      qualification_mismatch: Boolean(outOfField),
    };
  });
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
