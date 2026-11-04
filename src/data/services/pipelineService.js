import { supabase } from '../../../supabaseClient.js';
import { subscribeToTable } from './realtimeService';

const PIPELINE_APPLICATION_SELECT = `
  *,
  job_postings!inner(id, title, recruiter_id, is_archived, hiring_status),
  candidate_profiles(*)
`;

export const listRecruiterJobsForPipeline = (recruiterId) => supabase.from('job_postings')
  .select('id, title, is_archived, hiring_status')
  .eq('recruiter_id', recruiterId)
  .order('created_at', { ascending: false });

export const listPipelineApplications = (recruiterId) => supabase.from('applications')
  .select(PIPELINE_APPLICATION_SELECT)
  .eq('job_postings.recruiter_id', recruiterId)
  .order('applied_at', { ascending: false });

export const updateApplication = (id, changes) => supabase.from('applications').update(changes).eq('id', id);

export const subscribeToApplications = (channelName, onChange, onStatus) => subscribeToTable(
  channelName,
  { event: '*', table: 'applications' },
  onChange,
  onStatus,
);

export const listStageHistory = (applicationId) => supabase
  .from('application_stage_history')
  .select('id, from_stage, to_stage, changed_by, changed_at, note')
  .eq('application_id', applicationId)
  .order('changed_at', { ascending: false });
