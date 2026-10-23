import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient.js';

const SAVED_JOB_SELECT = 'id,job_posting_id,created_at,job_postings(id,title,location,work_type,employment_type,status,hiring_status,is_archived,created_at)';

export function useSavedJob({ jobId, userId, initialSaved, onChange }) {
  const [savedRecord, setSavedRecord] = useState(initialSaved || null);
  const [isLoading, setIsLoading] = useState(initialSaved === undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialSaved !== undefined) {
      setSavedRecord(initialSaved || null);
      setIsLoading(false);
      return;
    }
    if (!jobId || !userId) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      const { data, error: queryError } = await supabase
        .from('saved_jobs')
        .select(SAVED_JOB_SELECT)
        .eq('candidate_id', userId)
        .eq('job_posting_id', jobId)
        .maybeSingle();
      if (cancelled) return;
      if (queryError) setError(queryError.message);
      else setSavedRecord(data);
      setIsLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [initialSaved, jobId, userId]);

  const toggle = useCallback(async () => {
    if (!jobId || !userId || isLoading) return false;
    setError('');
    if (savedRecord) {
      const { error: deleteError } = await supabase
        .from('saved_jobs')
        .delete()
        .eq('id', savedRecord.id)
        .eq('candidate_id', userId);
      if (deleteError) {
        setError(deleteError.message);
        return false;
      }
      setSavedRecord(null);
      onChange?.(null, false);
      return true;
    }

    const { data, error: insertError } = await supabase
      .from('saved_jobs')
      .insert([{ candidate_id: userId, job_posting_id: jobId }])
      .select(SAVED_JOB_SELECT)
      .single();
    if (insertError) {
      setError(insertError.message);
      return false;
    }
    setSavedRecord(data);
    onChange?.(data, true);
    return true;
  }, [isLoading, jobId, onChange, savedRecord, userId]);

  return { isSaved: Boolean(savedRecord), savedRecord, isLoading, error, toggle };
}
