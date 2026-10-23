export const DEGREE_LEVELS = [
  'High school',
  'Vocational',
  'Associate',
  "Bachelor's",
  "Master's",
  'Doctorate',
];

export const LANGUAGE_PROFICIENCY = ['Basic', 'Conversational', 'Fluent', 'Native'];

export const LANGUAGE_SUGGESTIONS = [
  'English',
  'Filipino',
  'Cebuano',
  'Spanish',
  'Japanese',
  'Mandarin',
];

export const APPLICATION_FORM_SECTIONS = Object.freeze([
  {
    id: 'profile',
    label: 'Personal profile',
    fields: [
      { name: 'fullName', label: 'Full name', required: true },
      { name: 'email', label: 'Email', required: true, inputMode: 'email' },
      { name: 'phone', label: 'Phone', required: true, inputMode: 'tel' },
      { name: 'location', label: 'Location (city / region)', required: true },
      { name: 'profileUrl', label: 'LinkedIn or portfolio URL', placeholder: 'https://' },
      { name: 'summary', label: 'Short professional summary', control: 'textarea', maxLength: 500 },
    ],
  },
  {
    id: 'education',
    label: 'Education / degrees',
    repeatable: true,
    required: true,
    fields: [
      { name: 'degreeLevel', label: 'Degree level', control: 'select', options: DEGREE_LEVELS, required: true },
      { name: 'fieldOfStudy', label: 'Field of study', required: true },
      { name: 'school', label: 'School', required: true },
      { name: 'yearGraduated', label: 'Year graduated', type: 'number', required: true, placeholder: 'YYYY', year: true },
    ],
  },
  {
    id: 'qualifications',
    label: 'Qualifications',
    rowLabel: 'Certifications / licenses',
    repeatable: true,
    fields: [
      { name: 'name', label: 'Certification or license' },
      { name: 'organization', label: 'Issuing organization' },
      { name: 'yearObtained', label: 'Year obtained', type: 'number', placeholder: 'YYYY', year: true },
    ],
    skills: { name: 'skills', label: 'Skills', maxCount: 15, placeholder: 'Type a skill and press Enter' },
  },
  {
    id: 'languages',
    label: 'Languages',
    repeatable: true,
    required: true,
    fields: [
      { name: 'language', label: 'Language', required: true, suggestions: LANGUAGE_SUGGESTIONS },
      { name: 'proficiency', label: 'Proficiency', control: 'select', options: LANGUAGE_PROFICIENCY, required: true },
    ],
  },
  {
    id: 'additional',
    label: 'Additional information',
    fields: [
      { name: 'yearsExperience', label: 'Years of experience', type: 'number', min: 0, placeholder: 'Optional' },
      { name: 'coverNote', label: 'Cover note', control: 'textarea', maxLength: 1000 },
    ],
  },
]);

export const createEmptyEducation = () => ({
  degreeLevel: '',
  fieldOfStudy: '',
  school: '',
  yearGraduated: '',
});

export const createEmptyQualification = () => ({
  name: '',
  organization: '',
  yearObtained: '',
});

export const createEmptyLanguage = () => ({
  language: '',
  proficiency: 'Conversational',
});

export function createApplicationForm(profile = {}) {
  const resume = profile.resume_data || {};
  const education = resume.education || profile.education || [];
  const skills = profile.skills || resume.skills || [];
  const languages = resume.languages || profile.languages || [];
  const qualifications = resume.qualifications || profile.qualifications || [];

  return {
    fullName: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
    email: profile.email || '',
    phone: profile.phone || '',
    location: profile.location || '',
    profileUrl: resume.links?.linkedin || resume.links?.portfolio || '',
    summary: profile.summary || resume.summary || resume.professionalSummary || '',
    education: education.length
      ? education.map((item) => ({
          degreeLevel: item.degreeLevel || item.degree || '',
          fieldOfStudy: item.fieldOfStudy || item.field || '',
          school: item.school || '',
          yearGraduated: item.yearGraduated || item.year || '',
        }))
      : [createEmptyEducation()],
    qualifications: qualifications.map((item) => ({
      name: item.name || item.certification || '',
      organization: item.organization || item.issuingOrganization || '',
      yearObtained: item.yearObtained || item.year || '',
    })),
    skills: (Array.isArray(skills) ? skills : [])
      .map((skill) => typeof skill === 'string' ? skill : skill?.name)
      .filter(Boolean)
      .slice(0, 15),
    languages: languages.length
      ? languages.map((item) => ({
          language: typeof item === 'string' ? item : item.language || '',
          proficiency: typeof item === 'string' ? 'Conversational' : item.proficiency || 'Conversational',
        }))
      : [createEmptyLanguage()],
    yearsExperience: profile.years_experience ?? resume.yearsExperience ?? '',
    coverNote: '',
  };
}

/**
 * @typedef {{ id: string, recruiter_id: string, title: string, company_name: string, location: string, work_type: string, employment_type: string, description: string, requirements: string, created_at: string, hiring_status: 'open'|'closed', is_archived: boolean, match: number|null }} Job
 * @typedef {{ fullName: string, email: string, phone: string, location: string, profileUrl: string, summary: string, education: Array<object>, qualifications: Array<object>, skills: string[], languages: Array<object>, yearsExperience: string|number, coverNote: string }} ApplicantDetails
 */

export function getCandidateSkills(profile) {
  const values = profile?.skills || profile?.resume_data?.skills || [];
  return (Array.isArray(values) ? values : [])
    .map((value) => typeof value === 'string' ? value.trim() : value?.name?.trim())
    .filter(Boolean);
}

export function getMatchedKeywords(job, profile) {
  if (!job?.requirements?.trim()) return [];
  const jobText = `${job.requirements}\n${job.description || ''}`.toLocaleLowerCase();
  return getCandidateSkills(profile).map((skill) => ({
    label: skill,
    matched: jobText.includes(skill.toLocaleLowerCase()),
  }));
}
