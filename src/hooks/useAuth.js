import * as authService from '../data/services/authService';
import { peekReturnPath, rememberReturnPath, takeReturnPath } from '../data/services/returnPath';

const authActions = Object.freeze({ ...authService, peekReturnPath, rememberReturnPath, takeReturnPath });

export function useAuth() {
  return authActions;
}
