import { supabase } from '../../../supabaseClient.js';
import { subscribeToTable } from './realtimeService';

export const applyToJob = (jobId, matchScore, applicantDetails) => supabase.rpc('apply_to_job', {
  p_job_id: jobId,
  p_match_score: matchScore,
  p_applicant_details: applicantDetails,
});

export const withdrawApplication = (applicationId) => supabase.rpc('withdraw_application', { p_application_id: applicationId });

export const getApplicationDetail = (applicationId) => supabase
  .from('applications')
  .select('id, job_id, status, applied_at, status_updated_at, withdrawn_at, interview_at, interview_mode, interview_location, interview_notes, candidate_feedback, job_postings(id, title, location, work_type, recruiter_id)')
  .eq('id', applicationId)
  .maybeSingle();

export const subscribeToApplicationUpdates = (applicationId, onChange) => subscribeToTable(
  `application-detail-${applicationId}`,
  { event: 'UPDATE', table: 'applications', filter: `id=eq.${applicationId}` },
  onChange,
);

export const getApplicationForJob = (candidateId, jobId) => supabase.from('applications')
  .select('id,status,status_updated_at,applied_at')
  .eq('candidate_id', candidateId)
  .eq('job_id', jobId)
  .maybeSingle();

export const countCandidateApplications = (candidateId) => supabase
  .from('applications')
  .select('id', { head: true, count: 'exact' })
  .eq('candidate_id', candidateId);

export const listCandidateApplications = (candidateId, select = '*, job_postings(id, title, recruiter_id)') => supabase
  .from('applications')
  .select(select)
  .eq('candidate_id', candidateId)
  .order('applied_at', { ascending: false });

export const listJobApplicants = (jobId) => supabase
  .from('applications')
  .select('id, match_score, status, applied_at, candidate_id, applicant_details, candidate_profiles(*)')
  .eq('job_id', jobId)
  .order('match_score', { ascending: false })
  .order('applied_at', { ascending: true });

const RECRUITER_APPLICANT_SELECT = `
  id, match_score, status, applied_at, job_id, candidate_id,
  job_postings!inner(title, recruiter_id),
  candidate_profiles(firstName, lastName, email)
`;

export const listRecruiterApplicants = (recruiterId) => supabase
  .from('applications')
  .select(RECRUITER_APPLICANT_SELECT)
  .eq('job_postings.recruiter_id', recruiterId)
  .order('match_score', { ascending: false });
