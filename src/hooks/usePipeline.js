import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient.js';
import { PIPELINE_STAGES, STATUS_BY_STAGE, normalizePipelineStage } from '../data/pipelineStages';

const APPLICATION_SELECT = `
  *,
  job_postings!inner(id, title, recruiter_id, is_archived, hiring_status),
  candidate_profiles(*)
`;

export function usePipeline(recruiterId) {
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({
    jobId: 'all',
    search: '',
    minMatch: 0,
    showArchived: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const requestId = useRef(0);

  const refetch = useCallback(async () => {
    if (!recruiterId) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const [jobResult, applicationResult] = await Promise.all([
        supabase.from('job_postings')
          .select('id, title, is_archived, hiring_status')
          .eq('recruiter_id', recruiterId)
          .order('created_at', { ascending: false }),
        supabase.from('applications')
          .select(APPLICATION_SELECT)
          .eq('job_postings.recruiter_id', recruiterId)
          .order('applied_at', { ascending: false }),
      ]);
      if (currentRequest !== requestId.current) return;
      if (jobResult.error) throw jobResult.error;
      if (applicationResult.error) throw applicationResult.error;

      const availableJobs = (jobResult.data || []).filter((job) => filters.showArchived || !job.is_archived);
      const availableIds = new Set(availableJobs.map((job) => job.id));
      setJobs(availableJobs);
      setApplications((applicationResult.data || [])
        .filter((application) => availableIds.has(application.job_id))
        .map((application) => ({ ...application, stage: normalizePipelineStage(application) })));
    } catch (loadError) {
      console.error('Pipeline load error:', loadError);
      if (currentRequest === requestId.current) setError(loadError.message || 'Unable to load the hiring pipeline.');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [filters.showArchived, recruiterId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!recruiterId) return undefined;
    const channel = supabase
      .channel(`recruiter-pipeline-${recruiterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => refetch())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setError('');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Live updates disconnected. Retry loading or refresh the page.');
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [recruiterId, refetch]);

  const updateFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const moveCandidate = useCallback(async (id, stage, reason = '') => {
    if (!PIPELINE_STAGES.some((item) => item.id === stage)) {
      setError('Invalid pipeline stage.');
      return false;
    }
    const current = applications.find((item) => item.id === id);
    if (!current || current.stage === stage) return true;
    const previous = current;
    const updated = {
      ...current,
      stage,
      status: STATUS_BY_STAGE[stage],
      rejection_reason: stage === 'rejected' ? reason.trim() || null : current.rejection_reason,
      stage_updated_at: new Date().toISOString(),
    };

    setError('');
    setApplications((items) => items.map((item) => item.id === id ? updated : item));
    setAnnouncement(`${current.candidate_profiles?.firstName || 'Candidate'} moved to ${PIPELINE_STAGES.find((item) => item.id === stage)?.label}.`);
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        stage,
        status: STATUS_BY_STAGE[stage],
        rejection_reason: stage === 'rejected' ? reason.trim() || null : current.rejection_reason,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Pipeline stage update error:', updateError);
      setApplications((items) => items.map((item) => item.id === id ? previous : item));
      setError(updateError.message || 'Unable to move this candidate. The change was rolled back.');
      setAnnouncement('Candidate move failed. The previous stage was restored.');
      return false;
    }
    return true;
  }, [applications]);

  const saveNotes = useCallback(async (id, notes) => {
    const previous = applications.find((item) => item.id === id);
    if (!previous) return false;
    setApplications((items) => items.map((item) => item.id === id ? { ...item, notes } : item));
    const { error: updateError } = await supabase.from('applications').update({ notes }).eq('id', id);
    if (updateError) {
      setApplications((items) => items.map((item) => item.id === id ? previous : item));
      setError(updateError.message || 'Unable to save candidate notes.');
      return false;
    }
    return true;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return applications.filter((application) => {
      const profile = Array.isArray(application.candidate_profiles)
        ? application.candidate_profiles[0]
        : application.candidate_profiles;
      const name = `${profile?.firstName || ''} ${profile?.lastName || ''}`.toLowerCase();
      const email = (profile?.email || '').toLowerCase();
      return (filters.jobId === 'all' || application.job_id === filters.jobId)
        && (!search || name.includes(search) || email.includes(search))
        && (Number(application.match_score || 0) >= filters.minMatch);
    });
  }, [applications, filters]);

  const groupedByStage = useMemo(() => Object.fromEntries(
    PIPELINE_STAGES.map(({ id }) => [id, filteredApplications.filter((application) => application.stage === id)]),
  ), [filteredApplications]);

  return {
    applications: filteredApplications,
    allApplications: applications,
    groupedByStage,
    jobs,
    filters,
    updateFilter,
    moveCandidate,
    saveNotes,
    loading,
    error,
    setError,
    announcement,
    refetch,
  };
}
