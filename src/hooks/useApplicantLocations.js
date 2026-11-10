import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient.js';
import { normalizePipelineStage } from '../data/pipelineStages';
import { REGIONS, resolveLocation } from '../data/phLocations';

const DAY = 24 * 60 * 60 * 1000;

/** Applicants for the recruiter's jobs, each with a resolved location. */
export function useApplicantLocations(recruiterId) {
  const [applicants, setApplicants] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    if (!recruiterId) return;
    setLoading(true);
    setError('');
    try {
      const [jobResult, applicationResult] = await Promise.all([
        supabase.from('job_postings').select('id, title, is_archived')
          .eq('recruiter_id', recruiterId).order('created_at', { ascending: false }),
        supabase.from('applications')
          .select('*, job_postings!inner(id, title, recruiter_id), candidate_profiles(*)')
          .eq('job_postings.recruiter_id', recruiterId),
      ]);
      if (jobResult.error) throw jobResult.error;
      if (applicationResult.error) throw applicationResult.error;
      setJobs(jobResult.data || []);
      setApplicants((applicationResult.data || [])
        .filter((application) => application.status !== 'Withdrawn')
        .map((application) => {
          // The location the candidate gave on the application, else their profile.
          const profile = Array.isArray(application.candidate_profiles) ? application.candidate_profiles[0] : application.candidate_profiles;
          const rawLocation = String(application.applicant_details?.location || profile?.location || '').trim();
          const name = String(application.applicant_details?.fullName || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.email?.split('@')[0] || 'Candidate').trim();
          return {
            id: application.id,
            name,
            email: profile?.email || application.applicant_details?.email || '',
            jobId: application.job_id,
            jobTitle: application.job_postings?.title || 'Job',
            stage: normalizePipelineStage(application),
            appliedAt: application.applied_at,
            rawLocation,
            place: resolveLocation(rawLocation),
          };
        }));
    } catch (loadError) {
      console.error('Applicant location load error:', loadError);
      setError(loadError.message || 'Unable to load applicant locations.');
    } finally {
      setLoading(false);
    }
  }, [recruiterId]);

  useEffect(() => { refetch(); }, [refetch]);
  return { applicants, jobs, loading, error, refetch };
}

const groupOf = (place, groupBy) => {
  if (groupBy === 'region') {
    const region = REGIONS[place.region];
    return { key: `r:${place.region}`, name: region.name, detail: 'Region', lat: region.lat, lng: region.lng };
  }
  if (groupBy === 'province' || place.level !== 'city') {
    if (!place.province) {
      const region = REGIONS[place.region];
      return { key: `r:${place.region}`, name: region.name, detail: 'Region (no city given)', lat: region.lat, lng: region.lng };
    }
    const detail = REGIONS[place.region].name;
    if (groupBy === 'city') {
      // Only the province was given ("Laguna"): show it at the provincial capital.
      return { key: `p:${place.province}`, name: `${place.province} (city not given)`, detail, lat: place.lat, lng: place.lng };
    }
    return { key: `p:${place.province}`, name: place.province, detail, lat: place.lat, lng: place.lng, provinceLevel: true };
  }
  return { key: `c:${place.city}`, name: place.city, detail: `${place.province}, ${REGIONS[place.region].name}`, lat: place.lat, lng: place.lng };
};

/**
 * Filter applicants and group them by city, province or region.
 * Returns { groups (largest first), unmapped, total, mapped }.
 */
export function useLocationGroups(applicants, { jobId, stage, days, groupBy }) {
  return useMemo(() => {
    const now = Date.now();
    const since = days ? now - days * DAY : null;
    const filtered = applicants.filter((applicant) =>
      (jobId === 'all' || applicant.jobId === jobId)
      && (stage === 'all' || applicant.stage === stage)
      && (!since || new Date(applicant.appliedAt).getTime() >= since));

    const groups = new Map();
    const unmapped = new Map();
    for (const applicant of filtered) {
      if (!applicant.place) {
        const label = applicant.rawLocation || 'No location given';
        const entry = unmapped.get(label) || { label, applicants: [] };
        entry.applicants.push(applicant);
        unmapped.set(label, entry);
        continue;
      }
      const info = groupOf(applicant.place, groupBy);
      const group = groups.get(info.key) || { ...info, count: 0, recent: 0, stages: {}, jobs: {} };
      group.count += 1;
      if (now - new Date(applicant.appliedAt).getTime() <= 30 * DAY) group.recent += 1;
      group.stages[applicant.stage] = (group.stages[applicant.stage] || 0) + 1;
      group.jobs[applicant.jobTitle] = (group.jobs[applicant.jobTitle] || 0) + 1;
      groups.set(info.key, group);
    }
    const sorted = [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const mapped = sorted.reduce((sum, group) => sum + group.count, 0);
    return {
      groups: sorted.map((group) => ({ ...group, share: filtered.length ? group.count / filtered.length : 0 })),
      unmapped: [...unmapped.values()].map((entry) => ({ ...entry, count: entry.applicants.length })).sort((a, b) => b.count - a.count),
      total: filtered.length,
      mapped,
    };
  }, [applicants, jobId, stage, days, groupBy]);
}
