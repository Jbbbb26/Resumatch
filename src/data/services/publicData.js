import { supabase } from '../../../supabaseClient.js';

const isMissingFunction = (error) => error?.code === 'PGRST202' || /could not find the function/i.test(error?.message || '');

export async function fetchPublicJob(jobId) {
  const { data, error } = await supabase.rpc('get_public_job', { p_job_id: jobId });
  if (error) {
    if (isMissingFunction(error)) throw new Error('Public job pages are not set up yet. Run the public job and company migration in Supabase.');
    throw error;
  }
  return data || null;
}

export async function fetchPublicCompany(companyId) {
  const { data, error } = await supabase.rpc('get_public_company', { p_company_id: companyId });
  if (!error) return data?.company ? { company: data.company, jobs: data.jobs || [] } : null;
  if (!isMissingFunction(error)) throw error;

  const [companyResult, jobsResult] = await Promise.all([
    supabase.from('employers').select('*').eq('id', companyId).maybeSingle(),
    supabase.from('job_postings')
      .select('id,title,description,location,work_type,employment_type,created_at,status,hiring_status,is_archived')
      .eq('recruiter_id', companyId)
      .eq('status', 'active')
      .eq('hiring_status', 'open')
      .eq('is_archived', false)
      .order('created_at', { ascending: false }),
  ]);
  if (companyResult.error) throw companyResult.error;
  if (jobsResult.error) throw jobsResult.error;
  return companyResult.data ? { company: companyResult.data, jobs: jobsResult.data || [] } : null;
}
