import * as applicationService from '../data/services/applicationService';

const applicationActions = Object.freeze({ ...applicationService });

export function useApplications() {
  return applicationActions;
}
