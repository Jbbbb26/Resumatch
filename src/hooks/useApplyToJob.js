import { useCallback, useState } from 'react';
import { supabase } from '../../supabaseClient.js';

export function useApplyToJob({ job, userId, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const apply = useCallback(async (applicantDetails) => {
    if (!job || !userId) return { success: false, error: 'Please sign in as a candidate to apply.' };
    if (job.is_archived || (job.hiring_status || 'open') !== 'open') {
      const message = 'This position is no longer accepting applications.';
      setError(message);
      return { success: false, error: message };
    }

    setIsSubmitting(true);
    setError('');
    try {
      const { data, error: applyError } = await supabase.rpc('apply_to_job', {
        p_job_id: job.id,
        p_match_score: job.match,
        p_applicant_details: applicantDetails,
      });
      if (applyError) throw applyError;
      await onSuccess?.(data);
      return { success: true, data };
    } catch (submitError) {
      const message = submitError.message || 'We could not submit your application. Please try again.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSubmitting(false);
    }
  }, [job, onSuccess, userId]);

  return { apply, isSubmitting, error, setError };
}
