export const candidateDisplay = (application) => {
  const raw = application?.candidate_profiles;
  const profile = (Array.isArray(raw) ? raw[0] : raw) || {};
  const first = (profile.firstName || '').trim();
  const last = (profile.lastName || '').trim();
  const email = profile.email || '';

  const name = [first, last].filter(Boolean).join(' ') || (email ? email.split('@')[0] : 'Candidate');
  const parts = name.split(/\s+/);
  const initials = (parts.length > 1
    ? `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`
    : name.substring(0, 2)).toUpperCase() || 'C';

  return { name, initials, email: email || 'No email provided' };
};
