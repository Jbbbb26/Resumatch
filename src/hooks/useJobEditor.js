import { createJob, updateJob } from '../data/services/jobService';
import { JOB_TEXT_LIMITS } from '../data/jobOptions';
import { jobTextOnly } from '../data/services/jobText';

const saveJob = async ({ mode, jobId, form }) => {
  if (!form.title.trim()) return { success: false, message: 'Job title is required.' };
  if (jobTextOnly(form.description).length > JOB_TEXT_LIMITS.description) {
    return { success: false, message: `Description must be ${JOB_TEXT_LIMITS.description.toLocaleString()} characters or fewer.` };
  }
  if (jobTextOnly(form.requirements).length > JOB_TEXT_LIMITS.requirements) {
    return { success: false, message: `Requirements must be ${JOB_TEXT_LIMITS.requirements.toLocaleString()} characters or fewer.` };
  }
  const salaryMin = form.salary_min === '' || form.salary_min == null ? null : Number(form.salary_min);
  const salaryMax = form.salary_max === '' || form.salary_max == null ? null : Number(form.salary_max);
  if ([salaryMin, salaryMax].some((value) => value !== null && (!Number.isInteger(value) || value < 0))) {
    return { success: false, message: 'Salary must be a whole number of pesos per month.' };
  }
  if (salaryMin !== null && salaryMax !== null && salaryMax < salaryMin) {
    return { success: false, message: 'Maximum salary must be at least the minimum salary.' };
  }
  return mode === 'edit' ? updateJob(jobId, form) : createJob(form);
};

const jobEditorActions = Object.freeze({ saveJob });

export function useJobEditor() {
  return jobEditorActions;
}
