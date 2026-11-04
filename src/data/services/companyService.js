import { supabase } from '../../../supabaseClient.js';

const EMPLOYER_PROFILE_SELECT = 'id, companyName, website, industry, size, location, description, logo_url, logo_path, gallery_photos';

export const getEmployerProfile = (employerId) => supabase
  .from('employers')
  .select(EMPLOYER_PROFILE_SELECT)
  .eq('id', employerId)
  .maybeSingle();

export const saveEmployerProfile = (user, details, exists) => {
  const request = exists
    ? supabase.from('employers').update(details).eq('id', user.id)
    : supabase.from('employers').insert({ id: user.id, email: user.email, ...details });
  return request.select('id, companyName, website, industry, size, location, description').single();
};

export const listOpenJobsForRecruiter = (recruiterId) => supabase
  .from('job_postings')
  .select('*')
  .eq('recruiter_id', recruiterId)
  .eq('is_archived', false)
  .eq('hiring_status', 'open')
  .order('created_at', { ascending: false });
