import * as jobService from '../data/services/jobService';
import * as savedJobService from '../data/services/savedJobService';
import { fetchPublicJob } from '../data/services/publicData';

const jobActions = Object.freeze({ ...jobService, ...savedJobService, fetchPublicJob });

export function useJobData() {
  return jobActions;
}
