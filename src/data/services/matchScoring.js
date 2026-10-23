import { jobTextOnly } from './jobText.js';

export const MATCH_SCORING_CONFIG = Object.freeze({
  weights: Object.freeze({ skills: 0.5, role: 0.25, education: 0.15, semantic: 0.1 }),
  semanticCalibration: Object.freeze({ floor: 0.764, ceiling: 0.9 }),
  caps: Object.freeze({
    lowSkillsThreshold: 0.2,
    lowSkillsMaximum: 0.35,
    noSkillsAndEducationThreshold: 0.05,
    noSkillsAndEducationMaximum: 0.15,
    strongSkillsThreshold: 0.6,
    strongRelevanceThreshold: 0.25,
    unsupportedHighScoreMaximum: 0.8,
  }),
});

const SKILL_ALIASES = Object.freeze({
  javascript: ['javascript', 'js'],
  typescript: ['typescript', 'ts'],
  react: ['react', 'react.js', 'reactjs'],
  'node.js': ['node.js', 'nodejs', 'node'],
  python: ['python', 'python3'],
  java: ['java'],
  'c#': ['c#', 'c sharp'],
  'c++': ['c++', 'cpp'],
  golang: ['golang', 'go'],
  rust: ['rust'],
  php: ['php'],
  ruby: ['ruby'],
  sql: ['sql'],
  postgresql: ['postgresql', 'postgres'],
  mysql: ['mysql'],
  mongodb: ['mongodb', 'mongo db'],
  redis: ['redis'],
  html: ['html', 'html5'],
  css: ['css', 'css3'],
  aws: ['aws', 'amazon web services'],
  azure: ['azure', 'microsoft azure'],
  gcp: ['gcp', 'google cloud platform'],
  docker: ['docker'],
  kubernetes: ['kubernetes', 'k8s'],
  terraform: ['terraform'],
  'ci/cd': ['ci/cd', 'continuous integration', 'continuous delivery'],
  git: ['git', 'version control'],
  linux: ['linux'],
  'rest api': ['rest api', 'restful api', 'rest apis'],
  graphql: ['graphql'],
  'system design': ['system design', 'systems design'],
  'software architecture': ['software architecture', 'software architect'],
  'machine learning': ['machine learning', 'ml'],
  'data analysis': ['data analysis', 'data analytics'],
  cybersecurity: ['cybersecurity', 'information security'],
  networking: ['networking', 'computer networks'],
  'project management': ['project management'],
  agile: ['agile', 'scrum'],
  'ux design': ['ux design', 'user experience design'],
  figma: ['figma'],
  excel: ['excel', 'microsoft excel'],
  accounting: ['accounting'],
  'financial analysis': ['financial analysis'],
  'patient care': ['patient care'],
  triage: ['triage'],
  'medication administration': ['medication administration'],
});

const DOMAIN_TERMS = Object.freeze({
  software: [
    'software', 'computer science', 'programming', 'software developer',
    'web developer', 'software development', 'web development', 'application development',
    'software engineering',
    'information technology', 'information systems', 'systems architecture',
    'cybersecurity', 'computer engineering', 'web technology',
  ],
  healthcare: [
    'nursing', 'nurse', 'healthcare', 'health care', 'medicine', 'medical',
    'clinical', 'patient care', 'pharmacy',
  ],
  business: [
    'business', 'business management', 'business administration', 'accounting',
    'finance', 'marketing', 'economics', 'human resources',
  ],
  engineering: [
    'mechanical engineering', 'electrical engineering', 'civil engineering',
    'chemical engineering', 'aerospace engineering',
  ],
  design: ['graphic design', 'visual design', 'ux design', 'user experience design'],
  science: ['biology', 'chemistry', 'physics', 'mathematics', 'data science'],
  education: ['education', 'teaching', 'pedagogy'],
});

const RELATED_DOMAINS = Object.freeze({
  software: new Set(['engineering', 'science']),
  engineering: new Set(['software', 'science']),
  science: new Set(['software', 'engineering']),
  design: new Set(['software']),
});

const ROLE_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'of', 'on', 'or', 'our', 'the', 'to', 'with', 'you', 'your', 'years',
  'year', 'experience', 'required', 'requirements', 'responsibilities', 'work',
  'working', 'ability', 'strong', 'excellent', 'including', 'such', 'will',
  'must', 'have', 'has', 'this', 'that', 'their', 'we', 'team', 'role',
]);

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/c\+\+/g, ' cpp ')
    .replace(/c#/g, ' csharp ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function valuesFrom(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === 'string') return entry;
    return typeof entry?.name === 'string' ? entry.name : '';
  }).filter(Boolean);
}

function canonicalSkill(skill) {
  const normalized = normalizeText(skill);
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if ([canonical, ...aliases].some((alias) => normalizeText(alias) === normalized)) return canonical;
  }
  return normalized;
}

function includesPhrase(text, phrase) {
  const normalizedPhrase = normalizeText(phrase);
  return normalizedPhrase.length > 0 && ` ${text} `.includes(` ${normalizedPhrase} `);
}

function listSkills(resumeSkills, jobText) {
  const required = new Set();
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if ([canonical, ...aliases].some((alias) => includesPhrase(jobText, alias))) required.add(canonical);
  }
  for (const skill of resumeSkills) {
    const normalized = normalizeText(skill);
    if (normalized && includesPhrase(jobText, skill)) required.add(canonicalSkill(skill));
  }
  return required;
}

function educationDomain(text) {
  const normalized = normalizeText(text);
  return Object.entries(DOMAIN_TERMS)
    .filter(([, terms]) => terms.some((term) => includesPhrase(normalized, term)))
    .map(([domain]) => domain);
}

function scoreEducation(education, jobText) {
  const educationText = education.map((entry) => [
    entry?.fieldOfStudy, entry?.field, entry?.degree, entry?.degreeLevel,
  ].filter(Boolean).join(' ')).join(' ');
  const applicantDomains = educationDomain(educationText);
  const jobDomains = educationDomain(jobText);
  if (!applicantDomains.length || !jobDomains.length) return 0;
  if (applicantDomains.some((domain) => jobDomains.includes(domain))) return 1;
  if (applicantDomains.some((domain) =>
    jobDomains.some((jobDomain) => RELATED_DOMAINS[domain]?.has(jobDomain)))) return 0.65;
  return 0;
}

function roleTokens(value) {
  return new Set(normalizeText(jobTextOnly(value))
    .split(' ')
    .filter((token) => token.length > 2 && !ROLE_STOP_WORDS.has(token)));
}

function scoreRole(experience, summary, job) {
  const applicantText = [
    summary,
    ...experience.flatMap((entry) => [
      entry?.title, entry?.responsibilities, entry?.description,
    ]),
  ].flat().filter(Boolean).join(' ');
  const candidateTokens = roleTokens(applicantText);
  const targetTokens = roleTokens(`${job.title || ''} ${job.description || ''} ${job.requirements || ''}`);
  if (!candidateTokens.size || !targetTokens.size) return 0;
  const overlap = [...targetTokens].filter((token) => candidateTokens.has(token)).length;
  return overlap / targetTokens.size;
}

function calibratedSemanticScore(value) {
  const similarity = Number(value);
  if (!Number.isFinite(similarity)) return 0;
  const { floor, ceiling } = MATCH_SCORING_CONFIG.semanticCalibration;
  return Math.max(0, Math.min(1, (similarity - floor) / (ceiling - floor)));
}

export function calculateCosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || left.length !== right.length) {
    return null;
  }
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = Number(left[index]);
    const rightValue = Number(right[index]);
    if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return null;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }
  const denominator = Math.sqrt(leftMagnitude * rightMagnitude);
  return denominator > 0 ? dot / denominator : null;
}

function hasResumeEvidence(skills, education, experience, summary) {
  return skills.length > 0 ||
    education.some((entry) => entry && Object.values(entry).some((value) => String(value ?? '').trim())) ||
    experience.some((entry) => entry && Object.values(entry).some((value) =>
      Array.isArray(value) ? value.some(Boolean) : String(value ?? '').trim())) ||
    Boolean(String(summary ?? '').trim());
}

export function calculateMatchScore({ applicant = {}, job = {}, semanticSimilarity = null } = {}) {
  const resumeSkills = [...new Set(valuesFrom(applicant.skills).map(canonicalSkill).filter(Boolean))];
  const education = Array.isArray(applicant.education) ? applicant.education : [];
  const experience = Array.isArray(applicant.experience) ? applicant.experience : [];
  const summary = applicant.summary || applicant.professionalSummary || '';
  const readableJobText = normalizeText(jobTextOnly(
    `${job.title || ''} ${job.requirements || ''} ${job.description || ''}`,
  ));
  const requiredSkills = listSkills(valuesFrom(applicant.skills), readableJobText);
  const matchedSkills = resumeSkills.filter((skill) => requiredSkills.has(skill));
  const skills = requiredSkills.size ? matchedSkills.length / requiredSkills.size : 0;
  const role = scoreRole(experience, summary, job);
  const educationScore = scoreEducation(education, readableJobText);
  const semantic = hasResumeEvidence(resumeSkills, education, experience, summary)
    ? calibratedSemanticScore(semanticSimilarity)
    : 0;
  const { weights, caps } = MATCH_SCORING_CONFIG;
  let score = (
    skills * weights.skills +
    role * weights.role +
    educationScore * weights.education +
    semantic * weights.semantic
  );
  const capsApplied = [];

  if (skills === 0 && educationScore <= caps.noSkillsAndEducationThreshold) {
    score = Math.min(score, caps.noSkillsAndEducationMaximum);
    capsApplied.push('no-skills-and-unrelated-education');
  }
  if (skills < caps.lowSkillsThreshold) {
    score = Math.min(score, caps.lowSkillsMaximum);
    capsApplied.push('low-skills-overlap');
  }
  if (score > caps.unsupportedHighScoreMaximum &&
      (skills < caps.strongSkillsThreshold ||
        Math.max(role, educationScore) < caps.strongRelevanceThreshold)) {
    score = caps.unsupportedHighScoreMaximum;
    capsApplied.push('unsupported-high-score');
  }

  const breakdown = {
    skills,
    role,
    education: educationScore,
    semantic,
    capsApplied,
    matchedSkills: matchedSkills.length,
    requiredSkills: requiredSkills.size,
  };
  return { score: Math.max(0, Math.min(100, Math.round(score * 100))), breakdown };
}
