import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../data/services/apiClient';

export const JOB_STATUS_FILTERS = [
  { value: 'open', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

export function useJobListings({ setDashboardJobs }) {
  const [jobs, setJobs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingJobIds, setPendingJobIds] = useState([]);
  const loadSequence = useRef(0);

  const loadJobs = useCallback(async () => {
    const requestSequence = ++loadSequence.current;
    setIsLoading(true);
    setError('');
    try {
      const result = await apiFetch(`/api/jobs?status=${statusFilter}`);
      if (requestSequence !== loadSequence.current) return;
      if (!result.success) {
        setError(result.message || 'Unable to load job listings.');
        setJobs([]);
      } else {
        setJobs(result.data || []);
      }
    } catch (requestError) {
      if (requestSequence === loadSequence.current) {
        setError(requestError.message || 'Unable to load job listings.');
        setJobs([]);
      }
    } finally {
      if (requestSequence === loadSequence.current) setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const updateDashboardJob = useCallback((job) => {
    setDashboardJobs((current) => {
      const exists = current.some((item) => item.id === job.id);
      if (job.is_archived) return current.filter((item) => item.id !== job.id);
      return exists
        ? current.map((item) => (item.id === job.id ? job : item))
        : [job, ...current];
    });
  }, [setDashboardJobs]);

  const patchJob = useCallback(async (jobId, path, body) => {
    setError('');
    try {
      const result = await apiFetch(`/api/jobs/${jobId}/${path}`, {
        method: 'PATCH',
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!result.success) {
        setError(result.message || 'Unable to update this listing.');
        return null;
      }
      return result.data;
    } catch (requestError) {
      setError(requestError.message || 'Unable to update this listing.');
      return null;
    }
  }, []);

  const archiveJob = useCallback(async (jobId) => {
    const updated = await patchJob(jobId, 'archive');
    if (!updated) return false;
    setJobs((current) => current.filter((job) => job.id !== jobId));
    updateDashboardJob(updated);
    return true;
  }, [patchJob, updateDashboardJob]);

  const restoreJob = useCallback(async (jobId) => {
    const updated = await patchJob(jobId, 'restore');
    if (!updated) return false;
    setJobs((current) => statusFilter === 'all'
      ? current.map((job) => (job.id === jobId ? updated : job))
      : current.filter((job) => job.id !== jobId));
    updateDashboardJob(updated);
    return true;
  }, [patchJob, statusFilter, updateDashboardJob]);

  const toggleHiring = useCallback(async (job) => {
    if (job.is_archived || pendingJobIds.includes(job.id)) return;
    const previousStatus = job.hiring_status || 'open';
    const hiringStatus = previousStatus === 'open' ? 'closed' : 'open';
    const optimisticJob = {
      ...job,
      hiring_status: hiringStatus,
      closed_at: hiringStatus === 'closed' ? new Date().toISOString() : null,
    };

    setError('');
    setPendingJobIds((current) => [...current, job.id]);
    setJobs((current) => current.map((item) => (item.id === job.id ? optimisticJob : item)));
    updateDashboardJob(optimisticJob);

    const updated = await patchJob(job.id, 'hiring-status', { hiringStatus });
    if (updated) {
      setJobs((current) => {
        if (statusFilter === 'open' && updated.hiring_status !== 'open') {
          return current.filter((item) => item.id !== job.id);
        }
        if (statusFilter === 'closed' && updated.hiring_status !== 'closed') {
          return current.filter((item) => item.id !== job.id);
        }
        return current.map((item) => (item.id === job.id ? updated : item));
      });
      updateDashboardJob(updated);
    } else {
      setJobs((current) => current.map((item) => (item.id === job.id ? job : item)));
      updateDashboardJob({ ...job, hiring_status: previousStatus });
    }
    setPendingJobIds((current) => current.filter((id) => id !== job.id));
  }, [patchJob, pendingJobIds, statusFilter, updateDashboardJob]);

  return {
    jobs,
    statusFilter,
    setStatusFilter,
    isLoading,
    error,
    clearError: () => setError(''),
    pendingJobIds,
    archiveJob,
    restoreJob,
    toggleHiring,
    reload: loadJobs,
  };
}
