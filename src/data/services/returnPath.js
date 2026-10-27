const KEY = 'returnTo';

const CANDIDATE_PATHS = [/^\/jobs\/[\w-]+$/, /^\/candidate-dashboard\/jobs\/[\w-]+$/];
const ANY_ROLE_PATHS = [/^\/companies\/[\w%-]+$/];

export function rememberReturnPath(path) {
  try { sessionStorage.setItem(KEY, path); } catch {  }
}

export function peekReturnPath() {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}

export function takeReturnPath(role, remembered = peekReturnPath()) {
  try { sessionStorage.removeItem(KEY); } catch {  }
  const dashboard = role === 'recruiter' ? '/recruiter-dashboard' : '/candidate-dashboard';
  if (!remembered) return dashboard;
  const allowed = ANY_ROLE_PATHS.some((pattern) => pattern.test(remembered))
    || (role === 'job_seeker' && CANDIDATE_PATHS.some((pattern) => pattern.test(remembered)));
  return allowed ? remembered : dashboard;
}
