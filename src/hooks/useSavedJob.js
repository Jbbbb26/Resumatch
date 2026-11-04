import { useCallback, useEffect, useState } from 'react';
import { getSavedJob, saveJob, unsaveJob } from '../data/services/savedJobService';

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
      const { data, error: queryError } = await getSavedJob(userId, jobId);
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
      const { error: deleteError } = await unsaveJob(savedRecord.id, userId);
      if (deleteError) {
        setError(deleteError.message);
        return false;
      }
      setSavedRecord(null);
      onChange?.(null, false);
      return true;
    }

    const { data, error: insertError } = await saveJob(userId, jobId);
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
