import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient.js';

const JOB_SELECT = 'id,recruiter_id,title,location,work_type,employment_type,description,requirements,created_at,status,hiring_status,is_archived';

// Clinical nursing jobs need qualifications that an embedding score cannot verify.
// This is an interim, client-side safeguard. The Supabase recommendation RPC should
// eventually apply mandatory qualification rules itself, too.
const isNursingPosition = (title = '') =>
  /\b(nurse|nursing)\b/i.test(title) &&
  !/\b(software|developer|web|application|programmer)\b/i.test(title);

function getCandidateNursingEvidence(profile) {
  if (!profile) return null; // No profile: don't claim that eligibility was assessed.

  const  resume = profile.resume_data && typeof profile.resume_data === 'object'
    ? profile.resume_data
    : {};

  const skills = [...(Array.isArray(profile.skills) ? profile.skills : []),
    ...(Array.isArray(resume.skills) ? resume.skills : [])];
  const experience = Array.isArray(profile.experience) && profile.experience.length
    ? profile.experience
    : (Array.isArray(resume.experience) ? resume.experience : []);
  const education = Array.isArray(resume.education) ? resume.education : [];

  // Read candidate-provided / parsed qualifications, not job text.
  const hasResumeEvidence = skills.length > 0 || experience.length > 0 || education.length > 0;
  if (!hasResumeEvidence) return null;

  const educationText = JSON.stringify(education).toLowerCase();
  const experienceText = JSON.stringify(experience).toLowerCase();
  const skillsText = JSON.stringify(skills).toLowerCase();

  // A nursing degree / clinical nursing position strongly signals domain relevance.
  if (/\b(bsn|bachelor(?: of science)? (?:in|of) nursing|nursing degree|nursing diploma)\b/i.test(educationText)) return true;
  if (/\b(registered nurse|staff nurse|licensed practical nurse|nurse practitioner|clinical nurse|nursing assistant)\b/i.test(experienceText)) return true;

  // Otherwise require at least TWO relevant clinical skills. Broad abilities such
  // as communication, teamwork and computer skills are not clinical evidence.
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

    return {
      ...job,
      company_name: companies.get(job.recruiter_id) || 'Company name not provided',
      semanticSimilarity: recommended?.semanticSimilarity ?? null,
      // A 65% semantic similarity is not a 65% qualification match.
      // Show 0 for clearly unrelated nursing roles; show no score if the
      // candidate has no parsed information to make that determination.
      match: outOfField ? 0 : (unverified ? null : (recommended?.match ?? null)),
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
