import * as profileService from '../data/services/profileService';

const profileActions = Object.freeze({ ...profileService });

export function useProfileData() {
  return profileActions;
}
