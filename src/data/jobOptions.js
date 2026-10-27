export const WORK_TYPES = ['Remote', 'Hybrid', 'On-site'];
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract'];
export const EXPERIENCE_LEVELS = ['Entry-level', 'Mid-level', 'Senior'];
export const JOB_CATEGORIES = [
  'Accounting & Finance',
  'Administration & Office Support',
  'Customer Service',
  'Design & Creative',
  'Education & Training',
  'Engineering (Non-software)',
  'Healthcare & Medical',
  'Hospitality & Food Services',
  'Human Resources',
  'Manufacturing & Logistics',
  'Product Management',
  'Sales & Marketing',
  'Software Development & Engineering',
  'Other',
];

export const DATE_POSTED_OPTIONS = [
  { value: 'any', label: 'Anytime', days: null },
  { value: '1', label: 'Past 24 hours', days: 1 },
  { value: '7', label: 'Past week', days: 7 },
  { value: '30', label: 'Past month', days: 30 },
];

export const SALARY_MAX_ALLOWED = 10_000_000;

const peso = (value) => `₱${Number(value).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

export function formatSalary(job) {
  const min = job?.salary_min;
  const max = job?.salary_max;
  const hasMin = min !== null && min !== undefined && min !== '';
  const hasMax = max !== null && max !== undefined && max !== '';
  if (hasMin && hasMax) return Number(min) === Number(max) ? `${peso(min)} / month` : `${peso(min)} – ${peso(max)} / month`;
  if (hasMin) return `From ${peso(min)} / month`;
  if (hasMax) return `Up to ${peso(max)} / month`;
  return '';
}
