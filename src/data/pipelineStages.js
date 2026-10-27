export const PIPELINE_STAGES = [
  { id: 'applied', label: 'Applied', color: 'blue' },
  { id: 'screening', label: 'Screening', color: 'orange' },
  { id: 'interview', label: 'Interview', color: 'violet' },
  { id: 'offer', label: 'Offer', color: 'emerald' },
  { id: 'hired', label: 'Hired', color: 'green' },
  { id: 'rejected', label: 'Rejected', color: 'slate' },
];

export const STATUS_BY_STAGE = {
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

export const normalizePipelineStage = (application) => {
  const stage = application.stage?.toLowerCase();
  if (PIPELINE_STAGES.some((item) => item.id === stage)) return stage;
  const status = application.status?.toLowerCase();
  return PIPELINE_STAGES.some((item) => item.id === status) ? status : 'applied';
};

export const getPipelinePerson = (application) => {
  const rawProfile = application.candidate_profiles;
  const candidate = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) || {};
  const name = [candidate.firstName, candidate.lastName].filter(Boolean).join(' ').trim()
    || candidate.email?.split('@')[0]
    || 'Candidate';
  const parts = name.split(/\s+/);
  return {
    candidate,
    name,
    initials: parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase(),
    email: candidate.email || '',
  };
};
